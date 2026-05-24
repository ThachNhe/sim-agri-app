"""
Sensor data simulator – mô phỏng dữ liệu thực từ cảm biến và tự động
tạo cảnh báo khi thông số vượt ngưỡng tối ưu của cây trồng.

Rule engine được xây dựng dựa trên:
  Soussi et al. (2024) "Smart Sensors and Smart Data for Precision Agriculture: A Review"
  Sensors (Basel), 24(8):2647. https://doi.org/10.3390/s24082647
"""
import asyncio
import random
import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from uuid import UUID
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.sensor import Sensor
from app.models.sensor_reading import SensorReading
from app.models.alert import Alert
from app.models.growing_zone import GrowingZone
from app.models.plant_profile import PlantProfile
from app.models.device import Device
from app.constants.enums import (
    DeviceConnectionStatus,
    DeviceAutomationTrigger,
    DeviceControlMode,
    SensorType,
    AlertType,
    AlertSeverity,
)

logger = logging.getLogger(__name__)

# Một alert đang còn hiệu lực không nên được tạo lặp lại mỗi phút.
# Khi cùng một sự cố vẫn tiếp diễn, ta chỉ làm mới bản ghi hiện có trong khoảng này.
ALERT_COOLDOWN = timedelta(hours=1)

# ---------------------------------------------------------------------------
# Dải giá trị thực tế ảo theo loại cảm biến
# ---------------------------------------------------------------------------
SENSOR_RANGES: dict[SensorType, tuple[float, float]] = {
    SensorType.TEMPERATURE: (15.0, 45.0),
    SensorType.HUMIDITY: (20.0, 95.0),
    SensorType.SOIL_MOISTURE: (10.0, 85.0),
    SensorType.LIGHT: (500.0, 80000.0),
    SensorType.PH: (4.5, 8.5),
    SensorType.EC: (0.5, 3.5),
    SensorType.CO2: (300.0, 1500.0),
}

# ---------------------------------------------------------------------------
# Rule engine đa tầng – mỗi loại cảm biến có 3 mức hành động
#
# Nguồn khoa học cho từng ngưỡng:
#   - TEMPERATURE: 20–30 °C tối ưu (Soussi et al. 2024, §4; DHT22-based systems)
#   - HUMIDITY: 65–70 %RH tối ưu (Soussi et al. 2024, §4 – ANFIS greenhouse study)
#   - SOIL_MOISTURE: ≥70% tối ưu (Soussi et al. 2024, §4 – YL-69 sensor study)
#   - LIGHT (PAR proxy): 10000–25000 lux tối ưu cho rau màu trong nhà kính
#   - PH: 6.0–7.0 tối ưu cho hầu hết cây trồng (electrochemical sensors, §2)
#   - EC: 1.5–2.5 mS/cm tối ưu cho hydroponic/soilless (Soussi et al. 2024, §4)
#   - CO2: 800–1200 ppm tối ưu trong nhà kính kín (MG811 sensor, ONENET study §4)
# ---------------------------------------------------------------------------

@dataclass
class TieredAction:
    """Hành động khuyến nghị theo mức độ lệch ngưỡng."""
    low: str      # Lệch nhẹ (<10%): giám sát, điều chỉnh nhỏ
    medium: str   # Lệch vừa (10–25%): can thiệp chủ động
    high: str     # Lệch mạnh (>25%): hành động khẩn cấp


@dataclass
class SensorRuleSet:
    """Bộ rule khoa học đầy đủ cho một loại cảm biến."""
    above: TieredAction
    below: TieredAction
    # Ngưỡng cảnh báo sớm (soft threshold) – cách optimal_max/min một khoảng
    # nhỏ để cảnh báo trước khi thực sự vượt ngưỡng cứng
    soft_margin_pct: float = 0.05  # 5% trước ngưỡng cứng


SENSOR_RULE_ENGINE: dict[SensorType, SensorRuleSet] = {
    # ------------------------------------------------------------------
    # Nhiệt độ: tối ưu 20–30 °C
    # Nguồn: Soussi et al. 2024 – ANFIS greenhouse system triggers
    #        heater below 20 °C, cooling fan above 30 °C
    # ------------------------------------------------------------------
    SensorType.TEMPERATURE: SensorRuleSet(
        above=TieredAction(
            low=(
                "Theo dõi chặt nhiệt độ; kiểm tra lưu thông khí trong nhà kính. "
                "Cân nhắc điều chỉnh thời gian mở cửa thông gió buổi sáng sớm."
            ),
            medium=(
                "Kích hoạt quạt thông gió và hệ thống làm mát. "
                "Phun sương nhẹ trên tán cây để hạ nhiệt bốc hơi. "
                "Kiểm tra hệ thống cửa mái nhà kính."
            ),
            high=(
                "KHẨN CẤP: Nhiệt độ quá cao gây stress nhiệt cho cây – "
                "mở toàn bộ cửa thông gió, bật tối đa quạt làm mát, "
                "che lưới giảm bức xạ mặt trời ngay lập tức. "
                "Nguy cơ cháy lá và rụng quả."
            ),
        ),
        below=TieredAction(
            low=(
                "Theo dõi nhiệt độ đêm; kiểm tra tấm phủ cách nhiệt. "
                "Cân nhắc giảm thông gió vào ban đêm."
            ),
            medium=(
                "Bật máy sưởi hoặc đèn nhiệt. "
                "Phủ màng PE hoặc lưới nông nghiệp che luống cây ban đêm. "
                "Kiểm tra rò rỉ nhiệt ở vách và mái nhà kính."
            ),
            high=(
                "KHẨN CẤP: Nhiệt độ dưới ngưỡng tới hạn – nguy cơ đóng băng, "
                "tổn thương tế bào và chết cây. Bật tất cả thiết bị sưởi, "
                "phủ nhiều lớp và ngừng tưới nước lạnh ngay lập tức."
            ),
        ),
    ),

    # ------------------------------------------------------------------
    # Độ ẩm không khí: tối ưu 65–70 %RH
    # Nguồn: Soussi et al. 2024 – DHT11/DHT22 greenhouse automation,
    #        exhaust fans trigger >70%, fans trigger <65% RH
    # ------------------------------------------------------------------
    SensorType.HUMIDITY: SensorRuleSet(
        above=TieredAction(
            low=(
                "Tăng nhẹ tần suất thông gió. "
                "Giảm lượng tưới phun sương trong nhà kính."
            ),
            medium=(
                "Bật quạt hút ẩm và tăng thông gió tích cực. "
                "Ngừng tưới phun trong 4–6 giờ tới. "
                "Độ ẩm cao kéo dài tạo điều kiện cho nấm bệnh (Botrytis, mildew)."
            ),
            high=(
                "KHẨN CẤP: Độ ẩm cực cao – nguy cơ bùng phát nấm bệnh nghiêm trọng. "
                "Mở tối đa hệ thống thông gió, bật máy hút ẩm công suất cao, "
                "ngừng toàn bộ tưới phun và kiểm tra rò rỉ đường nước ngay."
            ),
        ),
        below=TieredAction(
            low=(
                "Tưới phun sương nhẹ (mist irrigation) để nâng độ ẩm. "
                "Kiểm tra hoạt động của máy tạo độ ẩm."
            ),
            medium=(
                "Kích hoạt hệ thống phun sương tự động và máy tạo ẩm. "
                "Giảm thông gió để hạn chế mất hơi ẩm ra ngoài. "
                "Độ ẩm thấp tăng tốc độ thoát hơi nước, gây stress cây."
            ),
            high=(
                "KHẨN CẤP: Độ ẩm quá thấp – cây mất nước nhanh, nguy cơ héo và "
                "đình trệ quang hợp. Bật tối đa hệ thống tạo ẩm và phun sương, "
                "đóng toàn bộ cửa thông gió, kiểm tra máy bơm và đường ống phun."
            ),
        ),
    ),

    # ------------------------------------------------------------------
    # Độ ẩm đất: tối ưu ≥70% (field capacity)
    # Nguồn: Soussi et al. 2024 – YL-69 soil moisture sensor activates
    #        water pump when moisture drops below 70%
    # ------------------------------------------------------------------
    SensorType.SOIL_MOISTURE: SensorRuleSet(
        above=TieredAction(
            low=(
                "Tạm dừng tưới trong 2–3 giờ. "
                "Kiểm tra độ thoát nước của giá thể/đất."
            ),
            medium=(
                "Dừng hệ thống tưới và kiểm tra hệ thống thoát nước. "
                "Đất bão hòa nước làm rễ thiếu oxy, dễ thối rễ (Pythium). "
                "Xới nhẹ bề mặt đất để thoáng khí nếu không phải hệ thống kín."
            ),
            high=(
                "KHẨN CẤP: Đất ngập úng – rễ cây nguy cơ chết do thiếu oxy. "
                "Tắt ngay hệ thống tưới, kiểm tra van và đường ống rò rỉ, "
                "đảm bảo kênh thoát nước thông suốt. "
                "Cân nhắc bổ sung chất cải tạo đất thoát nước (perlite, cát)."
            ),
        ),
        below=TieredAction(
            low=(
                "Kích hoạt một chu kỳ tưới nhỏ giọt ngắn (drip irrigation). "
                "Kiểm tra độ ẩm lại sau 30 phút."
            ),
            medium=(
                "Kích hoạt tưới nhỏ giọt liên tục cho đến khi đạt ngưỡng. "
                "Kiểm tra bộ lọc và vòi tưới có bị tắc không. "
                "Đất quá khô làm rễ ngừng hút dinh dưỡng."
            ),
            high=(
                "KHẨN CẤP: Đất cực kỳ khô – cây đang bị stress hạn nặng, "
                "nguy cơ héo không phục hồi được. Bật tưới tràn ngay lập tức, "
                "kiểm tra toàn bộ hệ thống cấp nước và máy bơm chính."
            ),
        ),
        soft_margin_pct=0.08,
    ),

    # ------------------------------------------------------------------
    # Ánh sáng (lux): tối ưu 10000–25000 lux cho rau màu trong nhà kính
    # Nguồn: Soussi et al. 2024 – LDR sensor, BH1750 sensor (ONENET study),
    #        PAR sensors for optimal photosynthesis discussed in §2
    # ------------------------------------------------------------------
    SensorType.LIGHT: SensorRuleSet(
        above=TieredAction(
            low=(
                "Theo dõi nhiệt độ tán lá. "
                "Cân nhắc lắp lưới che nắng mật độ 30% vào buổi trưa."
            ),
            medium=(
                "Lắp lưới che nắng mật độ 50% cho khu vực trồng. "
                "Ánh sáng quá mạnh ức chế quang hợp (photoinhibition) "
                "và làm tổn thương diệp lục tố."
            ),
            high=(
                "KHẨN CẤP: Cường độ sáng cực cao – nguy cơ cháy lá, "
                "mất diệp lục và suy giảm năng suất nghiêm trọng. "
                "Triển khai ngay lưới che nắng 70–80%, di chuyển cây con "
                "vào vị trí mát hơn nếu có thể."
            ),
        ),
        below=TieredAction(
            low=(
                "Kiểm tra xem có vật cản che khuất ánh sáng không. "
                "Cân nhắc bật thêm đèn bổ sung (supplemental lighting) "
                "vào đầu buổi sáng hoặc cuối chiều."
            ),
            medium=(
                "Bật hệ thống đèn LED grow-light hoặc đèn HPS bổ sung. "
                "Thiếu sáng kéo dài làm cây vươn dài, yếu ớt và giảm năng suất. "
                "Kiểm tra lại lịch chiếu sáng tự động."
            ),
            high=(
                "KHẨN CẤP: Ánh sáng cực kỳ thiếu – cây ngừng quang hợp hiệu quả. "
                "Bật tối đa hệ thống chiếu sáng nhân tạo, kiểm tra bóng đèn bị hỏng, "
                "đảm bảo tối thiểu 16 giờ sáng/ngày cho rau lá."
            ),
        ),
    ),

    # ------------------------------------------------------------------
    # pH đất/dung dịch: tối ưu 6.0–7.0
    # Nguồn: Soussi et al. 2024 – electrochemical pH sensors §2;
    #        pH 6.0–7.0 cho phép cây hấp thụ tối đa dinh dưỡng đa lượng
    # ------------------------------------------------------------------
    SensorType.PH: SensorRuleSet(
        above=TieredAction(
            low=(
                "Theo dõi pH trong 24 giờ tới. "
                "Kiểm tra chất lượng nước tưới (pH nước nguồn)."
            ),
            medium=(
                "Bổ sung chất axit hóa đất (axit citric, axit phosphoric loãng "
                "hoặc sulfur). pH > 7.5 gây thiếu sắt, mangan và kẽm (chlorosis lá). "
                "Điều chỉnh pH nước tưới về 6.0–6.5 trong 2–3 chu kỳ tưới."
            ),
            high=(
                "KHẨN CẤP: pH quá kiềm – hầu hết dinh dưỡng bị kết tủa, "
                "cây không hấp thụ được phân bón. Xử lý ngay bằng chất điều chỉnh pH "
                "axit, rửa đất với nhiều nước axit, và kiểm tra nguồn nước tưới "
                "có bị nhiễm kiềm không."
            ),
        ),
        below=TieredAction(
            low=(
                "Theo dõi pH và kiểm tra lại nguồn nước tưới. "
                "Hạn chế bón phân có tính axit (ammonium sulfate)."
            ),
            medium=(
                "Bổ sung vôi nông nghiệp (calcium carbonate) hoặc dolomite. "
                "pH < 5.5 gây độc nhôm và mangan, ức chế hấp thụ canxi và magiê. "
                "Điều chỉnh pH nước tưới lên 6.5–7.0."
            ),
            high=(
                "KHẨN CẤP: pH cực thấp – độc chất nhôm và mangan tích lũy "
                "gây chết rễ. Bón vôi ngay với liều cao, ngừng sử dụng phân axit, "
                "tưới nước kiềm nhẹ để trung hòa, kiểm tra toàn bộ hệ thống phân bón."
            ),
        ),
        soft_margin_pct=0.03,
    ),

    # ------------------------------------------------------------------
    # EC (Electrical Conductivity): tối ưu 1.5–2.5 mS/cm
    # Nguồn: Soussi et al. 2024 – CropX platform đo EC, §1 Table 1;
    #        soilless cultivation/hydroponic optimal EC range §4
    # ------------------------------------------------------------------
    SensorType.EC: SensorRuleSet(
        above=TieredAction(
            low=(
                "Tăng lượng nước tưới để pha loãng dung dịch dinh dưỡng. "
                "Kiểm tra lại công thức pha phân."
            ),
            medium=(
                "Pha loãng dung dịch dinh dưỡng bằng nước sạch (giảm 20–30%). "
                "EC quá cao gây stress muối, rễ mất nước do áp suất thẩm thấu. "
                "Rửa giá thể/đất bằng 2–3 lần lượng nước tưới thông thường."
            ),
            high=(
                "KHẨN CẤP: EC cực cao – nồng độ muối gây plasmolysis tế bào rễ, "
                "cây héo dù đất ẩm. Rửa triệt để hệ thống, thay toàn bộ dung dịch "
                "dinh dưỡng, kiểm tra máy đo EC có bị hỏng không."
            ),
        ),
        below=TieredAction(
            low=(
                "Tăng nhẹ nồng độ phân bón trong lần tưới tiếp theo. "
                "Kiểm tra lịch bón phân có đúng không."
            ),
            medium=(
                "Bổ sung dung dịch dinh dưỡng cân đối (N-P-K). "
                "EC thấp cho thấy cây đang thiếu dinh dưỡng đa lượng, "
                "dẫn đến vàng lá và còi cọc."
            ),
            high=(
                "KHẨN CẤP: EC cực thấp – cây gần như không có dinh dưỡng. "
                "Bổ sung ngay dung dịch dinh dưỡng đầy đủ, kiểm tra hệ thống "
                "bơm phân và van định lượng, xem xét lại toàn bộ lịch bón phân."
            ),
        ),
        soft_margin_pct=0.04,
    ),

    # ------------------------------------------------------------------
    # CO₂: tối ưu 800–1200 ppm trong nhà kính kín
    # Nguồn: Soussi et al. 2024 – MG811 CO₂ sensor, ONENET greenhouse §4;
    #        CO₂ enrichment tăng tốc độ quang hợp và năng suất 20–30%
    # ------------------------------------------------------------------
    SensorType.CO2: SensorRuleSet(
        above=TieredAction(
            low=(
                "Tăng nhẹ thông gió nhà kính trong 30 phút. "
                "Kiểm tra nguồn phát thải CO₂ bất thường (phân hủy hữu cơ, thiết bị)."
            ),
            medium=(
                "Tăng thông gió tích cực để giảm nồng độ CO₂. "
                "CO₂ > 1500 ppm gây ức chế khí khổng, "
                "làm giảm hấp thụ khoáng chất và tăng nhiệt độ tán lá."
            ),
            high=(
                "KHẨN CẤP: CO₂ cực cao – nguy cơ ảnh hưởng sức khỏe người lao động "
                "và ức chế nghiêm trọng quá trình hô hấp cây. "
                "Mở tối đa thông gió ngay lập tức, kiểm tra thiết bị bổ sung CO₂ "
                "có bị rò rỉ không, sơ tán người khỏi khu vực nếu >3000 ppm."
            ),
        ),
        below=TieredAction(
            low=(
                "Theo dõi xu hướng CO₂ vào ban ngày (cây quang hợp tiêu thụ CO₂). "
                "Đây là bình thường nếu nhà kính kín vào ban ngày."
            ),
            medium=(
                "Cân nhắc bổ sung CO₂ nhân tạo (CO₂ generator hoặc bình CO₂). "
                "Mức 800–1200 ppm tối ưu hóa quang hợp, tăng năng suất 20–30% "
                "so với nồng độ ngoài trời (400 ppm). "
                "Giảm thông gió vào ban ngày khi cây đang quang hợp mạnh."
            ),
            high=(
                "CO₂ cực thấp – quang hợp bị giới hạn nghiêm trọng bởi thiếu nguồn carbon. "
                "Đây thường xảy ra vào buổi trưa nắng với nhà kính kín. "
                "Bật ngay hệ thống bổ sung CO₂, kiểm tra van và bình chứa CO₂."
            ),
        ),
        soft_margin_pct=0.06,
    ),
}

# ---------------------------------------------------------------------------
# Compound condition rules – tổ hợp điều kiện nguy hiểm
# Nguồn: Soussi et al. 2024 §4 – tương tác giữa các thông số môi trường
# ---------------------------------------------------------------------------

@dataclass
class CompoundRule:
    """Rule kết hợp nhiều cảm biến để phát hiện tình huống phức tạp."""
    name: str
    description: str
    severity: AlertSeverity
    recommended_action: str


def _evaluate_compound_conditions(
    readings: dict[SensorType, float],
    profile: PlantProfile,
) -> list[CompoundRule]:
    """
    Kiểm tra tổ hợp điều kiện nguy hiểm dựa trên tất cả các giá trị hiện tại.
    Trả về danh sách các CompoundRule bị vi phạm.
    """
    triggered: list[CompoundRule] = []
    temp = readings.get(SensorType.TEMPERATURE)
    humidity = readings.get(SensorType.HUMIDITY)
    soil = readings.get(SensorType.SOIL_MOISTURE)
    co2 = readings.get(SensorType.CO2)
    ph = readings.get(SensorType.PH)

    # Rule 1: Nhiệt độ cao + Độ ẩm cao → nguy cơ nấm bệnh
    # Nguồn: Soussi et al. 2024 §4 – điều kiện >28°C, >80% là môi trường
    #        lý tưởng cho Botrytis cinerea và Powdery Mildew
    if temp is not None and humidity is not None:
        if temp > (profile.temp_max or 30) * 0.95 and humidity > 80:
            triggered.append(CompoundRule(
                name="HIGH_TEMP_HIGH_HUMIDITY",
                description="Nhiệt độ cao kết hợp độ ẩm cao",
                severity=AlertSeverity.HIGH,
                recommended_action=(
                    "CẢNH BÁO DỊCH BỆNH: Tổ hợp nhiệt độ cao + độ ẩm cao tạo điều kiện "
                    "lý tưởng cho nấm Botrytis và Powdery Mildew. "
                    "Tăng thông gió ngay lập tức, giảm tưới phun, kiểm tra dấu hiệu "
                    "đốm lá và mốc trắng trên cây. Cân nhắc phun thuốc phòng ngừa."
                ),
            ))

    # Rule 2: Nhiệt độ cao + Độ ẩm thấp → stress thoát hơi nước
    # Nguồn: Soussi et al. 2024 §4 – vapor pressure deficit (VPD) cao gây
    #        đóng khí khổng và giảm quang hợp
    if temp is not None and humidity is not None:
        if temp > (profile.temp_max or 30) * 0.9 and humidity < 50:
            triggered.append(CompoundRule(
                name="HIGH_TEMP_LOW_HUMIDITY",
                description="Nhiệt độ cao kết hợp độ ẩm thấp",
                severity=AlertSeverity.MEDIUM,
                recommended_action=(
                    "STRESS THOÁT HƠI NƯỚC: VPD (Vapor Pressure Deficit) cao – cây mất "
                    "nước nhanh qua lá, khí khổng đóng lại làm giảm quang hợp 30–50%. "
                    "Bật phun sương làm mát, tăng tần suất tưới nhỏ giọt, "
                    "che lưới giảm bức xạ nhiệt trực tiếp."
                ),
            ))

    # Rule 3: Đất ẩm cao + pH thấp → nguy cơ thối rễ
    # Nguồn: pH thấp + đất ẩm = điều kiện tối ưu cho Pythium, Phytophthora
    if soil is not None and ph is not None:
        if soil > 80 and ph < (profile.ph_min or 6.0):
            triggered.append(CompoundRule(
                name="WET_SOIL_LOW_PH",
                description="Đất quá ẩm kết hợp pH thấp",
                severity=AlertSeverity.HIGH,
                recommended_action=(
                    "NGUY CƠ THỐI RỄ: Đất quá ẩm + pH acid tạo điều kiện lý tưởng "
                    "cho nấm Pythium và Phytophthora. "
                    "Dừng tưới ngay, cải thiện thoát nước, nâng pH bằng vôi, "
                    "kiểm tra rễ cây có dấu hiệu nâu/mềm không."
                ),
            ))

    # Rule 4: CO₂ thấp + ánh sáng cao → quang hợp bị giới hạn bởi CO₂
    # Nguồn: Soussi et al. 2024 §4 – CO₂ là yếu tố giới hạn khi ánh sáng đủ
    light = readings.get(SensorType.LIGHT)
    if co2 is not None and light is not None:
        if co2 < 500 and light > 15000:
            triggered.append(CompoundRule(
                name="LOW_CO2_HIGH_LIGHT",
                description="CO₂ thấp kết hợp ánh sáng mạnh",
                severity=AlertSeverity.MEDIUM,
                recommended_action=(
                    "LÃNG PHÍ ÁNH SÁNG: Ánh sáng đủ nhưng CO₂ thiếu là yếu tố "
                    "giới hạn quang hợp. Cây không thể tận dụng ánh sáng mạnh này. "
                    "Bổ sung CO₂ nhà kính lên 800–1200 ppm để tối ưu hóa năng suất, "
                    "giảm thông gió vào ban ngày để giữ CO₂."
                ),
            ))

    return triggered


# ---------------------------------------------------------------------------
# Hàm helper
# ---------------------------------------------------------------------------

def _get_optimal_range(
    sensor_type: SensorType, profile: PlantProfile
) -> tuple[float | None, float | None]:
    mapping = {
        SensorType.TEMPERATURE: (profile.temp_min, profile.temp_max),
        SensorType.HUMIDITY: (profile.humidity_min, profile.humidity_max),
        SensorType.SOIL_MOISTURE: (profile.soil_moisture_min, profile.soil_moisture_max),
        SensorType.LIGHT: (profile.light_min, profile.light_max),
        SensorType.PH: (profile.ph_min, profile.ph_max),
        SensorType.EC: (profile.ec_min, profile.ec_max),
        SensorType.CO2: (profile.co2_min if hasattr(profile, "co2_min") else 800.0,
                         profile.co2_max if hasattr(profile, "co2_max") else 1200.0),
    }
    return mapping.get(sensor_type, (None, None))


def _get_tiered_action(
    rule_set: SensorRuleSet,
    direction: str,  # "above" | "below"
    severity: AlertSeverity,
) -> str:
    """Lấy action text theo hướng lệch ngưỡng và mức severity."""
    tier: TieredAction = getattr(rule_set, direction)
    if severity == AlertSeverity.LOW:
        return tier.low
    if severity == AlertSeverity.MEDIUM:
        return tier.medium
    return tier.high


def _severity_from_deviation(ratio: float) -> AlertSeverity:
    """Xác định mức độ cảnh báo dựa trên độ lệch tương đối."""
    if ratio < 0.10:
        return AlertSeverity.LOW
    if ratio < 0.25:
        return AlertSeverity.MEDIUM
    return AlertSeverity.HIGH


async def _find_recent_alert(
    db,
    *,
    zone_id: UUID,
    sensor_id: UUID | None,
    alert_type: AlertType,
    parameter: SensorType | None,
    dedupe_key: str | None = None,
) -> Alert | None:
    query = select(Alert).where(
        Alert.zone_id == zone_id,
        Alert.alert_type == alert_type,
    )

    if sensor_id is None:
        query = query.where(Alert.sensor_id.is_(None))
    else:
        query = query.where(Alert.sensor_id == sensor_id)

    if parameter is None:
        query = query.where(Alert.parameter.is_(None))
    else:
        query = query.where(Alert.parameter == parameter)

    if dedupe_key is not None:
        query = query.where(Alert.recommended_action == dedupe_key)

    result = await db.execute(query.order_by(Alert.triggered_at.desc()).limit(1))
    return result.scalar_one_or_none()


async def _upsert_alert(
    db,
    *,
    zone_id: UUID,
    sensor_id: UUID | None,
    alert_type: AlertType,
    severity: AlertSeverity,
    parameter: SensorType | None,
    actual_value: float | None,
    threshold_value: float | None,
    message: str,
    recommended_action: str | None,
    automation_status: str = "none",
    automation_action: str | None = None,
    automation_device_id: UUID | None = None,
    automation_device_name: str | None = None,
    automation_command: str | None = None,
    dedupe_key: str | None = None,
) -> None:
    now = datetime.now(timezone.utc)
    recent_alert = await _find_recent_alert(
        db,
        zone_id=zone_id,
        sensor_id=sensor_id,
        alert_type=alert_type,
        parameter=parameter,
        dedupe_key=dedupe_key,
    )

    if recent_alert is not None:
        if not recent_alert.is_read:
            recent_alert.severity = severity
            recent_alert.parameter = parameter
            recent_alert.actual_value = actual_value
            recent_alert.threshold_value = threshold_value
            recent_alert.message = message
            recent_alert.recommended_action = recommended_action
            recent_alert.automation_status = automation_status
            recent_alert.automation_action = automation_action
            recent_alert.automation_device_id = automation_device_id
            recent_alert.automation_device_name = automation_device_name
            recent_alert.automation_command = automation_command
            recent_alert.triggered_at = now
            return

        if recent_alert.triggered_at >= now - ALERT_COOLDOWN:
            return

    db.add(
        Alert(
            zone_id=zone_id,
            sensor_id=sensor_id,
            alert_type=alert_type,
            severity=severity,
            parameter=parameter,
            actual_value=actual_value,
            threshold_value=threshold_value,
            message=message,
            recommended_action=recommended_action,
            automation_status=automation_status,
            automation_action=automation_action,
            automation_device_id=automation_device_id,
            automation_device_name=automation_device_name,
            automation_command=automation_command,
        )
    )


def _automation_value_for_device(control_mode: str) -> tuple[str, float, str]:
    if control_mode == DeviceControlMode.PERCENTAGE.value:
        return "on", 100.0, "ON"
    if control_mode == DeviceControlMode.MULTI_SPEED.value:
        return "on", 3.0, "ON"
    return "on", 1.0, "ON"


def _device_matches_automation_trigger(device: Device, alert_type: AlertType) -> bool:
    trigger = device.automation_trigger or DeviceAutomationTrigger.BOTH.value
    return trigger in {DeviceAutomationTrigger.BOTH.value, alert_type.value}


def _is_device_auto_running(device: Device) -> bool:
    last_command = device.last_command or ""
    is_running = device.current_state == "on" or device.current_value > 0
    return is_running and last_command.startswith("AUTO ") and not last_command.startswith("AUTO OFF")


def _aware_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _auto_shutdown_at(device: Device) -> datetime | None:
    if not _is_device_auto_running(device):
        return None

    started_at = _aware_utc(device.last_seen_at)
    if started_at is None:
        return None

    return started_at + timedelta(seconds=max(device.timeout_seconds, 1))


async def _expire_finished_automation_devices(db) -> int:
    devices_res = await db.execute(
        select(Device).where(
            Device.is_active.is_(True),
            Device.automation_enabled.is_(True),
        )
    )
    devices = list(devices_res.scalars().all())
    now = datetime.now(timezone.utc)
    expired_count = 0

    for device in devices:
        shutdown_at = _auto_shutdown_at(device)
        if shutdown_at is None or shutdown_at > now:
            continue

        device.current_state = "off"
        device.current_value = 0
        device.connection_status = DeviceConnectionStatus.ONLINE.value
        device.last_seen_at = now
        device.last_command = f"AUTO OFF sau {device.timeout_seconds}s"
        expired_count += 1

    if expired_count:
        await db.flush()

    return expired_count


async def _apply_automation(
    db,
    *,
    sensor: Sensor,
    alert_type: AlertType,
    severity: AlertSeverity,
) -> tuple[str, str | None, UUID | None, str | None, str | None]:
    devices_res = await db.execute(
        select(Device).where(
            Device.linked_sensor_id == sensor.id,
            Device.is_active.is_(True),
            Device.automation_enabled.is_(True),
        )
    )
    devices = list(devices_res.scalars().all())
    devices = [
        device
        for device in devices
        if _device_matches_automation_trigger(device, alert_type)
    ]
    if not devices:
        return "none", None, None, None, None

    now = datetime.now(timezone.utc)
    actions: list[str] = []
    command_labels: list[str] = []

    for device in devices:
        state, value, command = _automation_value_for_device(device.control_mode)
        device.current_state = state
        device.current_value = value
        device.connection_status = DeviceConnectionStatus.ONLINE.value
        device.last_seen_at = now
        device.last_command = (
            f"AUTO {command} do {sensor.name} "
            f"{'vượt ngưỡng cao' if alert_type == AlertType.ABOVE_MAX else 'dưới ngưỡng thấp'}"
        )
        command_labels.append(command)
        actions.append(
            f"{device.name}: gửi `{command}` tới {device.command_topic or 'command topic'}"
        )

    first = devices[0]
    severity_label = {
        AlertSeverity.LOW: "mức thấp",
        AlertSeverity.MEDIUM: "mức trung bình",
        AlertSeverity.HIGH: "mức cao",
    }[severity]
    action_text = (
        f"Tự động hóa đã chạy ({severity_label}): "
        + "; ".join(actions)
    )
    return (
        "executed",
        action_text,
        first.id,
        first.name,
        ", ".join(command_labels),
    )


# ---------------------------------------------------------------------------
# Vòng lặp chính
# ---------------------------------------------------------------------------

async def generate_sensor_data():
    """Vòng lặp chính: cứ 60 giây tạo dữ liệu cảm biến và kiểm tra ngưỡng."""
    logger.info("Khởi động Sensor Data Simulator (Scientific Rule Engine)...")
    while True:
        try:
            async with AsyncSessionLocal() as db:
                expired_devices = await _expire_finished_automation_devices(db)
                sensors_res = await db.execute(
                    select(Sensor).where(Sensor.is_active.is_(True))
                )
                sensors = list(sensors_res.scalars().all())

                # Thu thập readings theo zone để có thể kiểm tra compound rules
                zone_readings: dict[int, dict[SensorType, float]] = {}

                for sensor in sensors:
                    lo, hi = SENSOR_RANGES.get(sensor.sensor_type, (0.0, 100.0))
                    value = round(random.uniform(lo, hi), 2)

                    reading = SensorReading(sensor_id=sensor.id, value=value)
                    db.add(reading)

                    # Lưu reading để dùng compound rule check sau
                    zone_readings.setdefault(sensor.zone_id, {})[sensor.sensor_type] = value

                    # Lấy zone và plant profile
                    zone_res = await db.execute(
                        select(GrowingZone).where(GrowingZone.id == sensor.zone_id)
                    )
                    zone = zone_res.scalar_one_or_none()
                    if not zone or not zone.plant_profile_id:
                        continue

                    profile_res = await db.execute(
                        select(PlantProfile).where(PlantProfile.id == zone.plant_profile_id)
                    )
                    profile = profile_res.scalar_one_or_none()
                    if not profile:
                        continue

                    opt_min, opt_max = _get_optimal_range(sensor.sensor_type, profile)
                    rule_set = SENSOR_RULE_ENGINE.get(sensor.sensor_type)

                    # --- Kiểm tra vượt ngưỡng tối đa ---
                    if opt_max is not None and value > opt_max:
                        deviation = (value - opt_max) / max(opt_max, 0.001)
                        severity = _severity_from_deviation(deviation)
                        action = (
                            _get_tiered_action(rule_set, "above", severity)
                            if rule_set
                            else "Kiểm tra và điều chỉnh thông số."
                        )
                        (
                            automation_status,
                            automation_action,
                            automation_device_id,
                            automation_device_name,
                            automation_command,
                        ) = await _apply_automation(
                            db,
                            sensor=sensor,
                            alert_type=AlertType.ABOVE_MAX,
                            severity=severity,
                        )
                        await _upsert_alert(
                            db,
                            zone_id=zone.id,
                            sensor_id=sensor.id,
                            alert_type=AlertType.ABOVE_MAX,
                            severity=severity,
                            parameter=sensor.sensor_type,
                            actual_value=value,
                            threshold_value=opt_max,
                            message=(
                                f"[{zone.name}] {sensor.name}: {value}{sensor.unit} "
                                f"vượt ngưỡng tối đa ({opt_max}{sensor.unit}) "
                                f"– lệch {deviation * 100:.1f}%"
                            ),
                            recommended_action=action,
                            automation_status=automation_status,
                            automation_action=automation_action,
                            automation_device_id=automation_device_id,
                            automation_device_name=automation_device_name,
                            automation_command=automation_command,
                        )

                    # --- Kiểm tra dưới ngưỡng tối thiểu ---
                    elif opt_min is not None and value < opt_min:
                        deviation = (opt_min - value) / max(opt_min, 0.001)
                        severity = _severity_from_deviation(deviation)
                        action = (
                            _get_tiered_action(rule_set, "below", severity)
                            if rule_set
                            else "Kiểm tra và điều chỉnh thông số."
                        )
                        (
                            automation_status,
                            automation_action,
                            automation_device_id,
                            automation_device_name,
                            automation_command,
                        ) = await _apply_automation(
                            db,
                            sensor=sensor,
                            alert_type=AlertType.BELOW_MIN,
                            severity=severity,
                        )
                        await _upsert_alert(
                            db,
                            zone_id=zone.id,
                            sensor_id=sensor.id,
                            alert_type=AlertType.BELOW_MIN,
                            severity=severity,
                            parameter=sensor.sensor_type,
                            actual_value=value,
                            threshold_value=opt_min,
                            message=(
                                f"[{zone.name}] {sensor.name}: {value}{sensor.unit} "
                                f"thấp hơn ngưỡng tối thiểu ({opt_min}{sensor.unit}) "
                                f"– lệch {deviation * 100:.1f}%"
                            ),
                            recommended_action=action,
                            automation_status=automation_status,
                            automation_action=automation_action,
                            automation_device_id=automation_device_id,
                            automation_device_name=automation_device_name,
                            automation_command=automation_command,
                        )

                # --- Kiểm tra compound conditions theo từng zone ---
                # Cần profile của zone – lấy một lần cho mỗi zone
                for zone_id, readings in zone_readings.items():
                    zone_res = await db.execute(
                        select(GrowingZone).where(GrowingZone.id == zone_id)
                    )
                    zone = zone_res.scalar_one_or_none()
                    if not zone or not zone.plant_profile_id:
                        continue

                    profile_res = await db.execute(
                        select(PlantProfile).where(PlantProfile.id == zone.plant_profile_id)
                    )
                    profile = profile_res.scalar_one_or_none()
                    if not profile:
                        continue

                    compound_alerts = _evaluate_compound_conditions(readings, profile)
                    for compound in compound_alerts:
                        await _upsert_alert(
                            db,
                            zone_id=zone_id,
                            sensor_id=None,  # compound rule không gắn với 1 sensor cụ thể
                            alert_type=AlertType.COMPOUND_CONDITION,
                            severity=compound.severity,
                            parameter=None,
                            actual_value=None,
                            threshold_value=None,
                            message=(
                                f"[{zone.name}] Tổ hợp nguy hiểm: {compound.description}"
                            ),
                            recommended_action=compound.recommended_action,
                            dedupe_key=compound.recommended_action,
                        )

                await db.commit()
                logger.debug(
                    f"Cập nhật dữ liệu cho {len(sensors)} cảm biến, "
                    f"{len(zone_readings)} zone, tự tắt {expired_devices} thiết bị."
                )
        except Exception as e:
            logger.error(f"Lỗi Sensor Simulator: {e}", exc_info=True)

        await asyncio.sleep(60)
