"""
Seed data cho development/staging.
Chạy:
  python3 alembic/seed_data.py
  python3 alembic/seed_data.py --reset
"""
import argparse
import asyncio
import os
import sys
from datetime import date
from datetime import datetime, timezone

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import app.models  # noqa: F401 - ensure all model tables are registered in metadata
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import AsyncSessionLocal, Base
from app.models.user import User
from app.models.plant_profile import PlantProfile
from app.models.growing_zone import GrowingZone
from app.models.sensor import Sensor
from app.models.actuator import Actuator
from app.models.device import Device
from app.constants.enums import (
    DeviceConnectionStatus,
    DeviceAutomationTrigger,
    DeviceControlMode,
    DeviceType,
    UserRole,
    UserStatus,
    SensorType,
    ActuatorType,
    SENSOR_UNIT,
)
from app.utils.security import hash_password
from app.models.farmer_zone_assignment import FarmerZoneAssignment


PROFILE_SOURCE = "UAF Cooperative Extension Service - Controlling the Greenhouse Environment"
RESET_TABLES = tuple(table.name for table in Base.metadata.sorted_tables)


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Seed Agri-App demo data.")
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Xóa toàn bộ dữ liệu nghiệp vụ trước khi seed lại dữ liệu demo.",
    )
    return parser.parse_args()


async def clear_existing_data(db: AsyncSession) -> None:
    if not RESET_TABLES:
        return

    table_names = ", ".join(f'"{table_name}"' for table_name in RESET_TABLES)
    await db.execute(text(f"TRUNCATE TABLE {table_names} RESTART IDENTITY CASCADE"))
    await db.flush()
    print(f"  🧹 Đã clear {len(RESET_TABLES)} bảng nghiệp vụ.")


def _plant_profile(
    *,
    name: str,
    scientific_name: str,
    temp_min: float,
    temp_max: float,
    humidity_min: float,
    humidity_max: float,
    light_min: float,
    light_max: float,
    day_length_hours: int,
    photoperiod_response: str,
    soil_moisture_min: float,
    soil_moisture_max: float,
    ph_min: float,
    ph_max: float,
    ec_min: float,
    ec_max: float,
    growth_period_days: int,
    notes: str,
    aliases: tuple[str, ...] = (),
) -> dict:
    description = (
        f"{scientific_name}. Nguồn: {PROFILE_SOURCE}. "
        f"Tối ưu nhà kính: {temp_min:g}-{temp_max:g} °C; "
        f"RH {humidity_min:g}-{humidity_max:g}%; "
        f"ánh sáng {light_min:,.0f}-{light_max:,.0f} lux; "
        f"{day_length_hours} giờ sáng/ngày; {photoperiod_response}. "
        f"{notes} "
        "Ngưỡng soil moisture/pH/EC là cấu hình vận hành tham khảo để rule engine "
        "mô phỏng cảnh báo, không phải dữ liệu extract từ nguồn UAF."
    )
    return {
        "name": name,
        "description": description,
        "temp_min": temp_min,
        "temp_max": temp_max,
        "humidity_min": humidity_min,
        "humidity_max": humidity_max,
        "soil_moisture_min": soil_moisture_min,
        "soil_moisture_max": soil_moisture_max,
        "light_min": light_min,
        "light_max": light_max,
        "ph_min": ph_min,
        "ph_max": ph_max,
        "ec_min": ec_min,
        "ec_max": ec_max,
        "growth_period_days": growth_period_days,
        "_aliases": aliases,
    }


SEED_USERS = [
    {
        "email": "admin@example.com",
        "password": "Admin@123",
        "full_name": "Super Admin",
        "role": UserRole.ADMIN,
        "status": UserStatus.ACTIVE,
        "is_verified": True,
    },
    {
        "email": "farmer1@example.com",
        "password": "Farmer@123",
        "full_name": "Nguyễn Văn Nông",
        "role": UserRole.USER,
        "status": UserStatus.ACTIVE,
        "is_verified": True,
    },
    {
        "email": "farmer2@example.com",
        "password": "Farmer@123",
        "full_name": "Trần Thị Vườn",
        "role": UserRole.USER,
        "status": UserStatus.ACTIVE,
        "is_verified": True,
    },
]

SEED_PLANT_PROFILES = [
    _plant_profile(
        name="Cà chua (Tomato)",
        scientific_name="Solanum lycopersicum",
        temp_min=18,
        temp_max=27,
        humidity_min=60,
        humidity_max=80,
        light_min=43000,
        light_max=53800,
        day_length_hours=16,
        photoperiod_response="DN (Day Neutral - Trung tính ngày)",
        soil_moisture_min=55,
        soil_moisture_max=75,
        ph_min=5.8,
        ph_max=6.8,
        ec_min=2.0,
        ec_max=3.5,
        growth_period_days=90,
        notes=(
            "Giai đoạn sản xuất; ánh sáng quy đổi từ 4,000-5,000 foot-candles. "
            "Cây trung tính ngày, ra hoa bất kể độ dài ngày."
        ),
        aliases=("Cà chua (Solanum lycopersicum)",),
    ),
    _plant_profile(
        name="Dưa chuột (Cucumber)",
        scientific_name="Cucumis sativus",
        temp_min=22,
        temp_max=30,
        humidity_min=60,
        humidity_max=80,
        light_min=37660,
        light_max=48390,
        day_length_hours=14,
        photoperiod_response="DN (Day Neutral - Trung tính ngày)",
        soil_moisture_min=60,
        soil_moisture_max=80,
        ph_min=5.8,
        ph_max=6.5,
        ec_min=1.7,
        ec_max=2.5,
        growth_period_days=60,
        notes=(
            "Giai đoạn sản xuất; ánh sáng quy đổi từ 3,500-4,500 foot-candles. "
            "Cần độ ẩm cao nhưng tránh đọng nước trên lá."
        ),
    ),
    _plant_profile(
        name="Xà lách (Lettuce)",
        scientific_name="Lactuca sativa",
        temp_min=15,
        temp_max=22,
        humidity_min=50,
        humidity_max=70,
        light_min=16140,
        light_max=26900,
        day_length_hours=14,
        photoperiod_response="LD (Long Day - Ngày dài)",
        soil_moisture_min=60,
        soil_moisture_max=80,
        ph_min=5.5,
        ph_max=6.5,
        ec_min=1.2,
        ec_max=2.0,
        growth_period_days=45,
        notes=(
            "Giai đoạn sản xuất; cần ít ánh sáng hơn cây quả. "
            "Ra hoa khi ngày dài, có thể kéo dài ngày nhân tạo để kiểm soát."
        ),
    ),
    _plant_profile(
        name="Ớt chuông (Bell Pepper)",
        scientific_name="Capsicum annuum",
        temp_min=20,
        temp_max=28,
        humidity_min=60,
        humidity_max=80,
        light_min=43040,
        light_max=53800,
        day_length_hours=14,
        photoperiod_response="DN (Day Neutral - Trung tính ngày)",
        soil_moisture_min=55,
        soil_moisture_max=75,
        ph_min=6.0,
        ph_max=6.8,
        ec_min=2.0,
        ec_max=3.0,
        growth_period_days=80,
        notes=(
            "Giai đoạn sản xuất; cây trung tính ngày, thích hợp trồng quanh năm "
            "trong nhà kính."
        ),
        aliases=("Ớt chuông (Capsicum annuum)",),
    ),
    _plant_profile(
        name="Dâu tây (Strawberry)",
        scientific_name="Fragaria × ananassa",
        temp_min=15,
        temp_max=26,
        humidity_min=60,
        humidity_max=75,
        light_min=43040,
        light_max=64560,
        day_length_hours=16,
        photoperiod_response="LD hoặc DN (tùy giống)",
        soil_moisture_min=55,
        soil_moisture_max=75,
        ph_min=5.5,
        ph_max=6.5,
        ec_min=1.0,
        ec_max=1.8,
        growth_period_days=90,
        notes=(
            "Giai đoạn sản xuất; tránh độ ẩm quá cao vì dễ phát sinh bệnh mốc xám. "
            "Một số giống cần ngày dài, giống trung tính cho thu hoạch liên tục."
        ),
    ),
    _plant_profile(
        name="Húng quế (Basil)",
        scientific_name="Ocimum basilicum",
        temp_min=20,
        temp_max=30,
        humidity_min=50,
        humidity_max=70,
        light_min=32280,
        light_max=53800,
        day_length_hours=16,
        photoperiod_response="SD hoặc DN (Ngày ngắn hoặc trung tính)",
        soil_moisture_min=50,
        soil_moisture_max=70,
        ph_min=5.8,
        ph_max=6.5,
        ec_min=1.0,
        ec_max=1.6,
        growth_period_days=30,
        notes=(
            "Giai đoạn sản xuất; cần nhiều ánh sáng. Tránh để ngày dài quá kích "
            "thích ra hoa sớm làm giảm chất lượng lá."
        ),
    ),
    _plant_profile(
        name="Cải bắp (Cabbage)",
        scientific_name="Brassica oleracea var. capitata",
        temp_min=10,
        temp_max=20,
        humidity_min=45,
        humidity_max=65,
        light_min=32280,
        light_max=53800,
        day_length_hours=16,
        photoperiod_response="DN (Day Neutral - Trung tính ngày)",
        soil_moisture_min=60,
        soil_moisture_max=80,
        ph_min=6.0,
        ph_max=7.0,
        ec_min=1.5,
        ec_max=2.5,
        growth_period_days=70,
        notes=(
            "Giai đoạn ươm cây con; cây mùa lạnh thích hợp trồng vụ đông xuân "
            "tại Việt Nam."
        ),
    ),
    _plant_profile(
        name="Hoa cúc (Chrysanthemum)",
        scientific_name="Chrysanthemum × morifolium",
        temp_min=15,
        temp_max=25,
        humidity_min=50,
        humidity_max=70,
        light_min=48420,
        light_max=75320,
        day_length_hours=10,
        photoperiod_response="SD (Short Day - Ngày ngắn)",
        soil_moisture_min=50,
        soil_moisture_max=70,
        ph_min=5.8,
        ph_max=6.5,
        ec_min=1.5,
        ec_max=2.5,
        growth_period_days=90,
        notes=(
            "Giai đoạn sản xuất; cây ngày ngắn, cần che tối nhân tạo để kích "
            "thích ra hoa trong mùa hè."
        ),
        aliases=("Cà chua anh đào / Hoa cúc (Chrysanthemum)",),
    ),
    _plant_profile(
        name="Rau mùi tây (Parsley)",
        scientific_name="Petroselinum crispum",
        temp_min=15,
        temp_max=24,
        humidity_min=50,
        humidity_max=70,
        light_min=43040,
        light_max=53800,
        day_length_hours=14,
        photoperiod_response="DN (Day Neutral - Trung tính ngày)",
        soil_moisture_min=55,
        soil_moisture_max=75,
        ph_min=6.0,
        ph_max=7.0,
        ec_min=1.0,
        ec_max=1.8,
        growth_period_days=75,
        notes=(
            "Giai đoạn sản xuất; cây trung tính ngày, phát triển tốt quanh năm "
            "trong điều kiện ánh sáng đủ."
        ),
    ),
    _plant_profile(
        name="Hương thảo (Rosemary)",
        scientific_name="Salvia rosmarinus",
        temp_min=18,
        temp_max=28,
        humidity_min=40,
        humidity_max=60,
        light_min=53800,
        light_max=75320,
        day_length_hours=14,
        photoperiod_response="DN (Day Neutral - Trung tính ngày)",
        soil_moisture_min=35,
        soil_moisture_max=55,
        ph_min=6.0,
        ph_max=7.5,
        ec_min=0.8,
        ec_max=1.5,
        growth_period_days=90,
        notes=(
            "Giai đoạn sản xuất; cây thảo mộc Địa Trung Hải, ưa khô thoáng và "
            "cần ánh sáng mạnh nhất trong nhóm thảo mộc."
        ),
    ),
]


SEED_ZONES = [
    {
        "owner_email": "farmer1@example.com",
        "zone": {
            "name": "Nhà kính cà chua A1",
            "description": "Cà chua nhà kính trồng trên giá thể, tưới nhỏ giọt và châm dinh dưỡng tự động.",
            "location": "Đà Lạt - Farm A, nhà kính A1",
            "area_sqm": 240.0,
            "plant_profile": "Cà chua (Tomato)",
            "planting_date": date(2026, 3, 10),
            "expected_harvest_date": date(2026, 6, 8),
        },
        "sensors": [
            {"type": SensorType.TEMPERATURE, "name": "A1 - Nhiệt độ tán cây", "location": "Giữa luống A1"},
            {"type": SensorType.HUMIDITY, "name": "A1 - Độ ẩm không khí", "location": "Giữa luống A1"},
            {"type": SensorType.SOIL_MOISTURE, "name": "A1 - Độ ẩm giá thể", "location": "Máng giá thể A1"},
            {"type": SensorType.LIGHT, "name": "A1 - Ánh sáng mái nhà kính", "location": "Mái nhà kính A1"},
            {"type": SensorType.PH, "name": "A1 - pH dung dịch hồi lưu", "location": "Bồn hồi lưu A1"},
            {"type": SensorType.EC, "name": "A1 - EC dung dịch dinh dưỡng", "location": "Bồn dinh dưỡng A1"},
            {"type": SensorType.CO2, "name": "A1 - CO₂ trong nhà kính", "location": "Giữa luống A1"},
        ],
        "actuators": [
            (ActuatorType.IRRIGATION, "A1 - Van tưới nhỏ giọt"),
            (ActuatorType.FERTILIZER_PUMP, "A1 - Bơm châm dinh dưỡng"),
            (ActuatorType.GROW_LIGHT, "A1 - Đèn LED bổ sung"),
            (ActuatorType.VENTILATION_FAN, "A1 - Quạt thông gió mái"),
            (ActuatorType.HEATER, "A1 - Sưởi đêm"),
        ],
        "devices": [
            {
                "sensor_type": SensorType.SOIL_MOISTURE,
                "type": DeviceType.PUMP,
                "control_mode": DeviceControlMode.ON_OFF,
                "automation_trigger": DeviceAutomationTrigger.BELOW_MIN,
                "name": "A1 - Bơm tưới nhỏ giọt",
                "power_watt": 550.0,
                "timeout_seconds": 45,
            },
            {
                "sensor_type": SensorType.TEMPERATURE,
                "type": DeviceType.FAN,
                "control_mode": DeviceControlMode.MULTI_SPEED,
                "automation_trigger": DeviceAutomationTrigger.ABOVE_MAX,
                "name": "A1 - Quạt thông gió mái",
                "power_watt": 180.0,
                "timeout_seconds": 60,
            },
            {
                "sensor_type": SensorType.TEMPERATURE,
                "type": DeviceType.HEATER,
                "control_mode": DeviceControlMode.ON_OFF,
                "automation_trigger": DeviceAutomationTrigger.BELOW_MIN,
                "name": "A1 - Sưởi đêm",
                "power_watt": 1200.0,
                "timeout_seconds": 90,
            },
            {
                "sensor_type": SensorType.LIGHT,
                "type": DeviceType.LIGHT,
                "control_mode": DeviceControlMode.PERCENTAGE,
                "automation_trigger": DeviceAutomationTrigger.BELOW_MIN,
                "name": "A1 - Đèn LED bổ sung",
                "power_watt": 240.0,
                "timeout_seconds": 90,
            },
            {
                "sensor_type": SensorType.EC,
                "type": DeviceType.FERTILIZER_PUMP,
                "control_mode": DeviceControlMode.ON_OFF,
                "automation_trigger": DeviceAutomationTrigger.BELOW_MIN,
                "name": "A1 - Bơm châm dinh dưỡng",
                "power_watt": 80.0,
                "timeout_seconds": 30,
            },
            {
                "sensor_type": SensorType.CO2,
                "type": DeviceType.CO2_INJECTOR,
                "control_mode": DeviceControlMode.ON_OFF,
                "automation_trigger": DeviceAutomationTrigger.BELOW_MIN,
                "name": "A1 - Van bổ sung CO₂",
                "power_watt": 45.0,
                "timeout_seconds": 30,
            },
        ],
    },
    {
        "owner_email": "farmer1@example.com",
        "zone": {
            "name": "Nhà lưới dưa chuột A2",
            "description": "Dưa chuột nhà lưới, ưu tiên theo dõi ẩm không khí và ẩm giá thể để hạn chế bệnh lá.",
            "location": "Đà Lạt - Farm A, nhà lưới A2",
            "area_sqm": 180.0,
            "plant_profile": "Dưa chuột (Cucumber)",
            "planting_date": date(2026, 4, 20),
            "expected_harvest_date": date(2026, 6, 19),
        },
        "sensors": [
            {"type": SensorType.TEMPERATURE, "name": "A2 - Nhiệt độ nhà lưới", "location": "Giữa giàn A2"},
            {"type": SensorType.HUMIDITY, "name": "A2 - Độ ẩm không khí", "location": "Giữa giàn A2"},
            {"type": SensorType.SOIL_MOISTURE, "name": "A2 - Độ ẩm giá thể", "location": "Túi giá thể A2"},
            {"type": SensorType.LIGHT, "name": "A2 - Cường độ sáng", "location": "Đỉnh giàn A2"},
            {"type": SensorType.PH, "name": "A2 - pH nước tưới", "location": "Bồn tưới A2"},
            {"type": SensorType.EC, "name": "A2 - EC nước tưới", "location": "Bồn tưới A2"},
        ],
        "actuators": [
            (ActuatorType.IRRIGATION, "A2 - Van tưới nhỏ giọt"),
            (ActuatorType.FERTILIZER_PUMP, "A2 - Bơm dinh dưỡng"),
            (ActuatorType.VENTILATION_FAN, "A2 - Quạt ngang"),
        ],
        "devices": [
            {
                "sensor_type": SensorType.SOIL_MOISTURE,
                "type": DeviceType.PUMP,
                "control_mode": DeviceControlMode.ON_OFF,
                "automation_trigger": DeviceAutomationTrigger.BELOW_MIN,
                "name": "A2 - Bơm tưới giá thể",
                "power_watt": 480.0,
                "timeout_seconds": 45,
            },
            {
                "sensor_type": SensorType.TEMPERATURE,
                "type": DeviceType.FAN,
                "control_mode": DeviceControlMode.MULTI_SPEED,
                "automation_trigger": DeviceAutomationTrigger.ABOVE_MAX,
                "name": "A2 - Quạt làm mát",
                "power_watt": 150.0,
                "timeout_seconds": 60,
            },
            {
                "sensor_type": SensorType.LIGHT,
                "type": DeviceType.SHADE_NET,
                "control_mode": DeviceControlMode.PERCENTAGE,
                "automation_trigger": DeviceAutomationTrigger.ABOVE_MAX,
                "name": "A2 - Lưới cắt nắng",
                "power_watt": 90.0,
                "timeout_seconds": 120,
            },
            {
                "sensor_type": SensorType.EC,
                "type": DeviceType.FERTILIZER_PUMP,
                "control_mode": DeviceControlMode.ON_OFF,
                "automation_trigger": DeviceAutomationTrigger.BELOW_MIN,
                "name": "A2 - Bơm châm phân",
                "power_watt": 70.0,
                "timeout_seconds": 30,
            },
        ],
    },
    {
        "owner_email": "farmer2@example.com",
        "zone": {
            "name": "Nhà màng xà lách B1",
            "description": "Xà lách thủy canh hồi lưu, cần khí hậu mát và ánh sáng vừa phải.",
            "location": "Lâm Đồng - Farm B, nhà màng B1",
            "area_sqm": 120.0,
            "plant_profile": "Xà lách (Lettuce)",
            "planting_date": date(2026, 5, 5),
            "expected_harvest_date": date(2026, 6, 19),
        },
        "sensors": [
            {"type": SensorType.TEMPERATURE, "name": "B1 - Nhiệt độ nhà màng", "location": "Kệ thủy canh B1"},
            {"type": SensorType.HUMIDITY, "name": "B1 - Độ ẩm không khí", "location": "Kệ thủy canh B1"},
            {"type": SensorType.LIGHT, "name": "B1 - Ánh sáng khu rau lá", "location": "Trên kệ B1"},
            {"type": SensorType.PH, "name": "B1 - pH bể thủy canh", "location": "Bể dinh dưỡng B1"},
            {"type": SensorType.EC, "name": "B1 - EC bể thủy canh", "location": "Bể dinh dưỡng B1"},
        ],
        "actuators": [
            (ActuatorType.GROW_LIGHT, "B1 - Đèn LED rau lá"),
            (ActuatorType.FERTILIZER_PUMP, "B1 - Bơm dinh dưỡng"),
            (ActuatorType.VENTILATION_FAN, "B1 - Quạt trao đổi khí"),
        ],
        "devices": [
            {
                "sensor_type": SensorType.TEMPERATURE,
                "type": DeviceType.FAN,
                "control_mode": DeviceControlMode.MULTI_SPEED,
                "automation_trigger": DeviceAutomationTrigger.ABOVE_MAX,
                "name": "B1 - Quạt làm mát nhà màng",
                "power_watt": 120.0,
                "timeout_seconds": 60,
            },
            {
                "sensor_type": SensorType.LIGHT,
                "type": DeviceType.LIGHT,
                "control_mode": DeviceControlMode.PERCENTAGE,
                "automation_trigger": DeviceAutomationTrigger.BELOW_MIN,
                "name": "B1 - Đèn LED rau lá",
                "power_watt": 180.0,
                "timeout_seconds": 90,
            },
            {
                "sensor_type": SensorType.EC,
                "type": DeviceType.FERTILIZER_PUMP,
                "control_mode": DeviceControlMode.ON_OFF,
                "automation_trigger": DeviceAutomationTrigger.BELOW_MIN,
                "name": "B1 - Bơm bổ sung dinh dưỡng",
                "power_watt": 60.0,
                "timeout_seconds": 30,
            },
        ],
    },
    {
        "owner_email": "farmer2@example.com",
        "zone": {
            "name": "Vườn hương thảo C1",
            "description": "Hương thảo trồng chậu trong nhà kính thoáng, ưu tiên khô ráo và ánh sáng mạnh.",
            "location": "Ninh Thuận - Farm C, khu thảo mộc C1",
            "area_sqm": 90.0,
            "plant_profile": "Hương thảo (Rosemary)",
            "planting_date": date(2026, 3, 15),
            "expected_harvest_date": date(2026, 6, 13),
        },
        "sensors": [
            {"type": SensorType.TEMPERATURE, "name": "C1 - Nhiệt độ khu thảo mộc", "location": "Dãy chậu C1"},
            {"type": SensorType.HUMIDITY, "name": "C1 - Độ ẩm không khí", "location": "Dãy chậu C1"},
            {"type": SensorType.SOIL_MOISTURE, "name": "C1 - Độ ẩm giá thể chậu", "location": "Chậu mẫu C1"},
            {"type": SensorType.LIGHT, "name": "C1 - Ánh sáng khu thảo mộc", "location": "Mái khu C1"},
        ],
        "actuators": [
            (ActuatorType.IRRIGATION, "C1 - Tưới nhỏ giọt chậu"),
            (ActuatorType.VENTILATION_FAN, "C1 - Quạt thông gió"),
        ],
        "devices": [
            {
                "sensor_type": SensorType.SOIL_MOISTURE,
                "type": DeviceType.PUMP,
                "control_mode": DeviceControlMode.ON_OFF,
                "automation_trigger": DeviceAutomationTrigger.BELOW_MIN,
                "name": "C1 - Bơm tưới chậu",
                "power_watt": 260.0,
                "timeout_seconds": 35,
            },
            {
                "sensor_type": SensorType.HUMIDITY,
                "type": DeviceType.FAN,
                "control_mode": DeviceControlMode.MULTI_SPEED,
                "automation_trigger": DeviceAutomationTrigger.ABOVE_MAX,
                "name": "C1 - Quạt giảm ẩm",
                "power_watt": 100.0,
                "timeout_seconds": 60,
            },
            {
                "sensor_type": SensorType.LIGHT,
                "type": DeviceType.SHADE_NET,
                "control_mode": DeviceControlMode.PERCENTAGE,
                "automation_trigger": DeviceAutomationTrigger.ABOVE_MAX,
                "name": "C1 - Lưới che nắng",
                "power_watt": 80.0,
                "timeout_seconds": 120,
            },
        ],
    },
]


PLANT_PROFILE_FIELDS = {
    "name",
    "description",
    "temp_min",
    "temp_max",
    "humidity_min",
    "humidity_max",
    "soil_moisture_min",
    "soil_moisture_max",
    "light_min",
    "light_max",
    "ph_min",
    "ph_max",
    "ec_min",
    "ec_max",
    "growth_period_days",
}


async def seed(db: AsyncSession) -> None:
    from sqlalchemy import select

    # ── Users ─────────────────────────────────────────────────────────────
    print("\n── Seed Users ──")
    created_users: dict[str, User] = {}
    for data in SEED_USERS:
        user = (
            await db.execute(select(User).where(User.email == data["email"]))
        ).scalar_one_or_none()
        if user:
            user.full_name = data["full_name"]
            user.role = data["role"]
            user.status = data["status"]
            user.is_verified = data["is_verified"]
            print(f"  ⏭  Bỏ qua: {data['email']} (đã tồn tại)")
            created_users[data["email"]] = user
            continue

        user = User(
            email=data["email"],
            hashed_password=hash_password(data["password"]),
            full_name=data["full_name"],
            role=data["role"],
            status=data["status"],
            is_verified=data["is_verified"],
        )
        db.add(user)
        await db.flush()
        await db.refresh(user)
        created_users[data["email"]] = user
        print(f"  ✅ Tạo: {data['email']} [{data['role']}]")

    # ── Plant Profiles ────────────────────────────────────────────────────
    print("\n── Seed Plant Profiles ──")
    created_profiles: dict[str, PlantProfile] = {}
    for data in SEED_PLANT_PROFILES:
        payload = {key: data[key] for key in PLANT_PROFILE_FIELDS}
        profile = (
            await db.execute(select(PlantProfile).where(PlantProfile.name == data["name"]))
        ).scalar_one_or_none()

        if profile is None:
            for alias in data.get("_aliases", ()):
                profile = (
                    await db.execute(select(PlantProfile).where(PlantProfile.name == alias))
                ).scalar_one_or_none()
                if profile:
                    break

        if profile:
            for field, value in payload.items():
                setattr(profile, field, value)
            await db.flush()
            await db.refresh(profile)
            created_profiles[data["name"]] = profile
            print(f"  ↻ Cập nhật: {data['name']}")
            continue

        pp = PlantProfile(**payload)
        db.add(pp)
        await db.flush()
        await db.refresh(pp)
        created_profiles[data["name"]] = pp
        print(f"  ✅ Tạo: {data['name']}")

    # ── Growing Zones + Sensors + Actuators + Devices ─────────────────────
    print("\n── Seed Farms, Sensors, Actuators & Devices ──")
    for entry in SEED_ZONES:
        owner = created_users.get(entry["owner_email"])
        if not owner:
            continue

        zone_data = entry["zone"]
        profile = created_profiles.get(zone_data["plant_profile"])

        zone = (
            await db.execute(select(GrowingZone).where(GrowingZone.name == zone_data["name"]))
        ).scalar_one_or_none()

        if zone:
            zone.description = zone_data["description"]
            zone.location = zone_data["location"]
            zone.area_sqm = zone_data["area_sqm"]
            zone.plant_profile_id = profile.id if profile else None
            zone.planting_date = zone_data["planting_date"]
            zone.expected_harvest_date = zone_data["expected_harvest_date"]
            zone.is_active = True
            print(f"  ↻ Cập nhật farm: {zone.name}")
        else:
            zone = GrowingZone(
                name=zone_data["name"],
                description=zone_data["description"],
                location=zone_data["location"],
                area_sqm=zone_data["area_sqm"],
                plant_profile_id=profile.id if profile else None,
                planting_date=zone_data["planting_date"],
                expected_harvest_date=zone_data["expected_harvest_date"],
            )
            db.add(zone)
            await db.flush()
            await db.refresh(zone)
            print(f"  ✅ Tạo farm: {zone.name}")

        assignment = (
            await db.execute(
                select(FarmerZoneAssignment).where(
                    FarmerZoneAssignment.farmer_id == owner.id,
                    FarmerZoneAssignment.zone_id == zone.id,
                )
            )
        ).scalar_one_or_none()
        if assignment is None:
            db.add(FarmerZoneAssignment(farmer_id=owner.id, zone_id=zone.id))
            print(f"      + Phân công farmer: {owner.email}")

        sensors_by_type: dict[SensorType, Sensor] = {}
        for spec in entry["sensors"]:
            s_type = spec["type"]
            sensor = (
                await db.execute(
                    select(Sensor).where(
                        Sensor.zone_id == zone.id,
                        Sensor.sensor_type == s_type,
                    )
                )
            ).scalar_one_or_none()

            if sensor:
                sensor.name = spec["name"]
                sensor.unit = SENSOR_UNIT.get(s_type, "")
                sensor.location = spec.get("location") or zone.location
                sensor.device_address = f"sensor/{zone.id.hex[:8]}/{s_type.value}"
                sensor.update_interval_seconds = spec.get("update_interval_seconds", 60)
                sensor.is_active = True
                print(f"      ↻ Cảm biến: {sensor.name} ({s_type.value})")
            else:
                sensor = Sensor(
                    name=spec["name"],
                    sensor_type=s_type,
                    unit=SENSOR_UNIT.get(s_type, ""),
                    location=spec.get("location") or zone.location,
                    device_address=f"sensor/{zone.id.hex[:8]}/{s_type.value}",
                    update_interval_seconds=spec.get("update_interval_seconds", 60),
                    zone_id=zone.id,
                )
                db.add(sensor)
                print(f"      + Cảm biến: {sensor.name} ({s_type.value})")

            sensors_by_type[s_type] = sensor

        await db.flush()

        for a_type, a_name in entry["actuators"]:
            actuator = (
                await db.execute(
                    select(Actuator).where(
                        Actuator.zone_id == zone.id,
                        Actuator.actuator_type == a_type,
                    )
                )
            ).scalar_one_or_none()
            if actuator:
                actuator.name = a_name
                actuator.is_active = True
                print(f"      ↻ Actuator: {a_name} ({a_type.value})")
            else:
                db.add(Actuator(name=a_name, actuator_type=a_type, zone_id=zone.id))
                print(f"      + Actuator: {a_name} ({a_type.value})")

        await db.flush()

        for spec in entry["devices"]:
            linked_sensor = sensors_by_type.get(spec["sensor_type"])
            if linked_sensor is None:
                continue

            device_type = spec["type"]
            automation_trigger = spec["automation_trigger"]
            device = (
                await db.execute(
                    select(Device).where(
                        Device.owner_id == owner.id,
                        Device.linked_sensor_id == linked_sensor.id,
                        Device.type == device_type.value,
                        Device.automation_trigger == automation_trigger.value,
                    )
                )
            ).scalar_one_or_none()

            topic_base = (
                f"farm/{owner.id.hex[:8]}/{zone.id.hex[:8]}/"
                f"{device_type.value}/{linked_sensor.sensor_type.value}"
            )
            payload = {
                "name": spec["name"],
                "location": zone.location or zone.name,
                "type": device_type.value,
                "control_mode": spec["control_mode"].value,
                "power_watt": spec["power_watt"],
                "owner_id": owner.id,
                "linked_sensor_id": linked_sensor.id,
                "automation_enabled": True,
                "automation_trigger": automation_trigger.value,
                "command_topic": f"{topic_base}/cmd",
                "state_topic": f"{topic_base}/state",
                "qos": 1,
                "timeout_seconds": spec["timeout_seconds"],
                "payload_on": '{"cmd":"ON"}',
                "payload_off": '{"cmd":"OFF"}',
                "connection_status": DeviceConnectionStatus.ONLINE.value,
                "last_command": "CONNECTED",
                "last_seen_at": datetime.now(timezone.utc),
                "is_active": True,
            }

            if device:
                for field, value in payload.items():
                    setattr(device, field, value)
                print(f"      ↻ Device MQTT: {device.name} -> {linked_sensor.name}")
            else:
                db.add(Device(**payload))
                print(f"      + Device MQTT: {spec['name']} -> {linked_sensor.name}")

    await db.commit()


async def main(reset: bool = False) -> None:
    print("🌱 Bắt đầu seed data (Agri-App)...")
    async with AsyncSessionLocal() as db:
        if reset:
            print("\n── Reset Database ──")
            await clear_existing_data(db)
        await seed(db)
    print("\n✅ Seed data hoàn tất!")


if __name__ == "__main__":
    args = _parse_args()
    asyncio.run(main(reset=args.reset))
