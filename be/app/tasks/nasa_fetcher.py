"""
Sensor data simulator – mô phỏng dữ liệu thực từ cảm biến và tự động
tạo cảnh báo khi thông số vượt ngưỡng tối ưu của cây trồng.
"""
import asyncio
import random
import logging
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.sensor import Sensor
from app.models.sensor_reading import SensorReading
from app.models.alert import Alert
from app.models.growing_zone import GrowingZone
from app.models.plant_profile import PlantProfile
from app.constants.enums import SensorType, AlertType, AlertSeverity

logger = logging.getLogger(__name__)

# Dải giá trị thực tế ảo theo loại cảm biến
SENSOR_RANGES: dict[SensorType, tuple[float, float]] = {
    SensorType.TEMPERATURE: (15.0, 45.0),
    SensorType.HUMIDITY: (20.0, 95.0),
    SensorType.SOIL_MOISTURE: (10.0, 85.0),
    SensorType.LIGHT: (500.0, 80000.0),
    SensorType.PH: (4.5, 8.5),
    SensorType.EC: (0.5, 3.5),
    SensorType.CO2: (300.0, 1500.0),
}

RECOMMENDED_ACTIONS: dict[SensorType, dict[str, str]] = {
    SensorType.TEMPERATURE: {
        "above": "Bật quạt thông gió hoặc hệ thống làm mát",
        "below": "Bật máy sưởi hoặc che phủ luống cây",
    },
    SensorType.HUMIDITY: {
        "above": "Tăng thông gió, giảm tưới nước",
        "below": "Tưới phun sương hoặc tăng độ ẩm nhà kính",
    },
    SensorType.SOIL_MOISTURE: {
        "above": "Giảm lượng tưới, kiểm tra hệ thống thoát nước",
        "below": "Kích hoạt hệ thống tưới nhỏ giọt",
    },
    SensorType.LIGHT: {
        "above": "Lắp lưới che nắng cho khu vực trồng",
        "below": "Bật đèn bổ sung ánh sáng nhân tạo",
    },
    SensorType.PH: {
        "above": "Bổ sung chất điều chỉnh pH (axit) vào đất",
        "below": "Bổ sung vôi hoặc chất kiềm trung hòa đất",
    },
    SensorType.EC: {
        "above": "Pha loãng dung dịch dinh dưỡng, tăng lượng nước tưới",
        "below": "Bổ sung phân bón / dung dịch dinh dưỡng",
    },
    SensorType.CO2: {
        "above": "Tăng thông gió để giảm nồng độ CO₂",
        "below": "Cân nhắc bổ sung CO₂ cho nhà kính kín",
    },
}


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
        SensorType.CO2: (None, None),
    }
    return mapping.get(sensor_type, (None, None))


def _severity_from_deviation(ratio: float) -> AlertSeverity:
    """Xác định mức độ cảnh báo dựa trên độ lệch tương đối."""
    if ratio < 0.1:
        return AlertSeverity.LOW
    if ratio < 0.25:
        return AlertSeverity.MEDIUM
    return AlertSeverity.HIGH


async def generate_sensor_data():
    """Vòng lặp chính: cứ 60 giây tạo dữ liệu cảm biến và kiểm tra ngưỡng."""
    logger.info("Khởi động Sensor Data Simulator...")
    while True:
        try:
            async with AsyncSessionLocal() as db:
                # Lấy tất cả cảm biến đang hoạt động kèm thông tin zone
                sensors_res = await db.execute(
                    select(Sensor).where(Sensor.is_active.is_(True))
                )
                sensors = list(sensors_res.scalars().all())

                for sensor in sensors:
                    # Tạo giá trị thực tế ngẫu nhiên trong dải hợp lý
                    lo, hi = SENSOR_RANGES.get(sensor.sensor_type, (0.0, 100.0))
                    value = round(random.uniform(lo, hi), 2)

                    reading = SensorReading(sensor_id=sensor.id, value=value)
                    db.add(reading)

                    # Kiểm tra ngưỡng tối ưu của cây đang trồng
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
                    actions = RECOMMENDED_ACTIONS.get(sensor.sensor_type, {})

                    if opt_max is not None and value > opt_max:
                        deviation = (value - opt_max) / max(opt_max, 0.001)
                        severity = _severity_from_deviation(deviation)
                        alert = Alert(
                            zone_id=zone.id,
                            sensor_id=sensor.id,
                            alert_type=AlertType.ABOVE_MAX,
                            severity=severity,
                            parameter=sensor.sensor_type,
                            actual_value=value,
                            threshold_value=opt_max,
                            message=(
                                f"[{zone.name}] {sensor.name}: {value}{sensor.unit} "
                                f"vượt ngưỡng tối đa ({opt_max}{sensor.unit})"
                            ),
                            recommended_action=actions.get("above"),
                        )
                        db.add(alert)

                    elif opt_min is not None and value < opt_min:
                        deviation = (opt_min - value) / max(opt_min, 0.001)
                        severity = _severity_from_deviation(deviation)
                        alert = Alert(
                            zone_id=zone.id,
                            sensor_id=sensor.id,
                            alert_type=AlertType.BELOW_MIN,
                            severity=severity,
                            parameter=sensor.sensor_type,
                            actual_value=value,
                            threshold_value=opt_min,
                            message=(
                                f"[{zone.name}] {sensor.name}: {value}{sensor.unit} "
                                f"thấp hơn ngưỡng tối thiểu ({opt_min}{sensor.unit})"
                            ),
                            recommended_action=actions.get("below"),
                        )
                        db.add(alert)

                await db.commit()
                logger.debug(f"Cập nhật dữ liệu cho {len(sensors)} cảm biến.")
        except Exception as e:
            logger.error(f"Lỗi Sensor Simulator: {e}")

        await asyncio.sleep(60)
