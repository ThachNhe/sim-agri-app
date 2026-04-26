"""
Seed data cho development/staging.
Chạy: python alembic/seed_data.py
"""
import asyncio
import sys
import os
from datetime import date

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import AsyncSessionLocal
from app.models.user import User
from app.models.plant_profile import PlantProfile
from app.models.growing_zone import GrowingZone
from app.models.sensor import Sensor
from app.models.actuator import Actuator
from app.constants.enums import UserRole, UserStatus, SensorType, ActuatorType, SENSOR_UNIT
from app.utils.security import hash_password
from app.models.farmer_zone_assignment import FarmerZoneAssignment


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
    {
        "name": "Lúa (Oryza sativa)",
        "description": "Cây lúa nhiệt đới, phù hợp vùng đồng bằng sông Cửu Long",
        "temp_min": 22.0, "temp_max": 35.0,
        "humidity_min": 70.0, "humidity_max": 90.0,
        "soil_moisture_min": 60.0, "soil_moisture_max": 90.0,
        "ph_min": 5.5, "ph_max": 6.5,
        "ec_min": 0.5, "ec_max": 1.5,
        "growth_period_days": 120,
    },
    {
        "name": "Cà chua (Solanum lycopersicum)",
        "description": "Cà chua trồng nhà kính hoặc ngoài trời",
        "temp_min": 18.0, "temp_max": 30.0,
        "humidity_min": 55.0, "humidity_max": 75.0,
        "soil_moisture_min": 40.0, "soil_moisture_max": 70.0,
        "light_min": 10000.0, "light_max": 70000.0,
        "ph_min": 6.0, "ph_max": 6.8,
        "ec_min": 1.5, "ec_max": 3.0,
        "growth_period_days": 90,
    },
    {
        "name": "Dưa hấu (Citrullus lanatus)",
        "description": "Dưa hấu trồng đồng bằng, ưa nắng",
        "temp_min": 24.0, "temp_max": 38.0,
        "humidity_min": 50.0, "humidity_max": 70.0,
        "soil_moisture_min": 35.0, "soil_moisture_max": 65.0,
        "ph_min": 6.0, "ph_max": 7.0,
        "ec_min": 1.2, "ec_max": 2.5,
        "growth_period_days": 80,
    },
    {
        "name": "Rau muống (Ipomoea aquatica)",
        "description": "Rau muống nước, phát triển nhanh",
        "temp_min": 25.0, "temp_max": 37.0,
        "humidity_min": 65.0, "humidity_max": 85.0,
        "soil_moisture_min": 70.0, "soil_moisture_max": 95.0,
        "ph_min": 5.5, "ph_max": 7.0,
        "growth_period_days": 30,
    },
    {
        "name": "Ớt chuông (Capsicum annuum)",
        "description": "Ớt chuông trồng nhà kính thủy canh",
        "temp_min": 20.0, "temp_max": 28.0,
        "humidity_min": 60.0, "humidity_max": 80.0,
        "soil_moisture_min": 45.0, "soil_moisture_max": 70.0,
        "light_min": 15000.0, "light_max": 60000.0,
        "ph_min": 6.0, "ph_max": 6.5,
        "ec_min": 2.0, "ec_max": 3.5,
        "growth_period_days": 100,
    },
]


async def seed(db: AsyncSession) -> None:
    from sqlalchemy import select

    # ── Users ─────────────────────────────────────────────────────────────
    print("\n── Seed Users ──")
    created_users: dict[str, User] = {}
    for data in SEED_USERS:
        existing = await db.execute(select(User).where(User.email == data["email"]))
        if existing.scalar_one_or_none():
            print(f"  ⏭  Bỏ qua: {data['email']} (đã tồn tại)")
            u = (await db.execute(select(User).where(User.email == data["email"]))).scalar_one()
            created_users[data["email"]] = u
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
        existing = (await db.execute(
            select(PlantProfile).where(PlantProfile.name == data["name"])
        )).scalar_one_or_none()
        if existing:
            print(f"  ⏭  Bỏ qua: {data['name']}")
            created_profiles[data["name"]] = existing
            continue

        pp = PlantProfile(**data)
        db.add(pp)
        await db.flush()
        await db.refresh(pp)
        created_profiles[data["name"]] = pp
        print(f"  ✅ Tạo: {data['name']}")

    # ── Growing Zones + Sensors + Actuators (for farmer1) ─────────────────
    farmer1 = created_users.get("farmer1@example.com")
    farmer2 = created_users.get("farmer2@example.com")

    SEED_ZONES = [
        {
            "owner": farmer1,
            "zone": {
                "name": "Nhà kính cà chua số 1",
                "description": "Khu trồng cà chua cherry thủy canh",
                "location": "Khu A – Lô 1",
                "area_sqm": 200.0,
                "plant_profile": "Cà chua (Solanum lycopersicum)",
                "planting_date": date(2026, 2, 1),
                "expected_harvest_date": date(2026, 5, 1),
            },
            "sensors": [
                (SensorType.TEMPERATURE, "Cảm biến nhiệt độ không khí"),
                (SensorType.HUMIDITY, "Cảm biến độ ẩm không khí"),
                (SensorType.SOIL_MOISTURE, "Cảm biến độ ẩm đất"),
                (SensorType.LIGHT, "Cảm biến ánh sáng"),
                (SensorType.PH, "Cảm biến pH dung dịch"),
                (SensorType.EC, "Cảm biến EC dinh dưỡng"),
            ],
            "actuators": [
                (ActuatorType.IRRIGATION, "Hệ thống tưới nhỏ giọt"),
                (ActuatorType.FERTILIZER_PUMP, "Bơm phân bón tự động"),
                (ActuatorType.GROW_LIGHT, "Đèn LED bổ sung ánh sáng"),
                (ActuatorType.VENTILATION_FAN, "Quạt thông gió"),
            ],
        },
        {
            "owner": farmer1,
            "zone": {
                "name": "Ruộng lúa số 2",
                "description": "Canh tác lúa nước kết hợp cảm biến IoT",
                "location": "Khu B – Đồng Tháp",
                "area_sqm": 5000.0,
                "plant_profile": "Lúa (Oryza sativa)",
                "planting_date": date(2026, 3, 15),
                "expected_harvest_date": date(2026, 7, 15),
            },
            "sensors": [
                (SensorType.TEMPERATURE, "Cảm biến nhiệt độ"),
                (SensorType.HUMIDITY, "Cảm biến độ ẩm"),
                (SensorType.SOIL_MOISTURE, "Cảm biến độ ẩm đất lúa"),
                (SensorType.PH, "Cảm biến pH đất"),
            ],
            "actuators": [
                (ActuatorType.IRRIGATION, "Hệ thống bơm tưới lúa"),
            ],
        },
        {
            "owner": farmer2,
            "zone": {
                "name": "Vườn ớt chuông nhà kính",
                "description": "Trồng ớt chuông hữu cơ trong nhà kính",
                "location": "Khu C – Đà Lạt",
                "area_sqm": 300.0,
                "plant_profile": "Ớt chuông (Capsicum annuum)",
                "planting_date": date(2026, 1, 10),
                "expected_harvest_date": date(2026, 4, 20),
            },
            "sensors": [
                (SensorType.TEMPERATURE, "Nhiệt độ nhà kính"),
                (SensorType.HUMIDITY, "Độ ẩm không khí"),
                (SensorType.SOIL_MOISTURE, "Độ ẩm giá thể"),
                (SensorType.LIGHT, "Cường độ sáng"),
                (SensorType.CO2, "Nồng độ CO₂"),
                (SensorType.EC, "EC dinh dưỡng"),
            ],
            "actuators": [
                (ActuatorType.IRRIGATION, "Tưới nhỏ giọt"),
                (ActuatorType.HEATER, "Máy sưởi đêm"),
                (ActuatorType.VENTILATION_FAN, "Quạt thông gió"),
                (ActuatorType.GROW_LIGHT, "Đèn LED"),
            ],
        },
    ]

    print("\n── Seed Growing Zones, Sensors & Actuators ──")
    for entry in SEED_ZONES:
        owner: User = entry["owner"]
        if not owner:
            continue

        zone_data = entry["zone"]
        profile = created_profiles.get(zone_data["plant_profile"])

        existing_zone = (await db.execute(
            select(GrowingZone)
            .where(GrowingZone.name == zone_data["name"])
        )).scalar_one_or_none()

        if existing_zone:
            print(f"  ⏭  Bỏ qua zone: {zone_data['name']}")
            continue

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
        print(f"  ✅ Tạo zone: {zone.name}")


        assignment = FarmerZoneAssignment(
            farmer_id=owner.id,
            zone_id=zone.id,
        )
        db.add(assignment)

        for s_type, s_name in entry["sensors"]:
            sensor = Sensor(
                name=s_name,
                sensor_type=s_type,
                unit=SENSOR_UNIT.get(s_type, ""),
                zone_id=zone.id,
            )
            db.add(sensor)
            print(f"      + Cảm biến: {s_name} ({s_type.value})")

        for a_type, a_name in entry["actuators"]:
            actuator = Actuator(
                name=a_name,
                actuator_type=a_type,
                zone_id=zone.id,
            )
            db.add(actuator)
            print(f"      + Thiết bị: {a_name} ({a_type.value})")

    await db.commit()


async def main() -> None:
    print("🌱 Bắt đầu seed data (Agri-App)...")
    async with AsyncSessionLocal() as db:
        await seed(db)
    print("\n✅ Seed data hoàn tất!")


if __name__ == "__main__":
    asyncio.run(main())
