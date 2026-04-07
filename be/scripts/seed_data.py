import asyncio
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.user import User
from app.models.device import Device
from app.constants.enums import UserRole, DeviceType
from app.utils.security import hash_password


async def seed():
    async with AsyncSessionLocal() as db:
        admin_result = await db.execute(select(User).where(User.email == "admin@example.com"))
        if admin_result.scalar_one_or_none():
            print("Admin already exists. Skip seeding to avoid duplication.")
            return

        admin = User(
            email="admin@example.com",
            hashed_password=hash_password("admin123"),
            full_name="Admin",
            role=UserRole.ADMIN,
            is_verified=True,
        )
        db.add(admin)

        farmer1 = User(
            email="farmer1@example.com",
            hashed_password=hash_password("farmer123"),
            full_name="Nguyễn Văn Nông Dân 1",
            role=UserRole.USER,
            is_verified=True,
        )
        db.add(farmer1)

        await db.flush()

        devices = [
            Device(
                name="Cảm biến Vườn 1",
                location="Khu A",
                type=DeviceType.SENSOR,
                owner_id=farmer1.id,
            ),
            Device(
                name="Cảm biến Vườn 2",
                location="Khu B",
                type=DeviceType.SENSOR,
                owner_id=farmer1.id,
            ),
            Device(
                name="Máy bơm nước 1",
                location="Khu Trung Tâm",
                type=DeviceType.ACTUATOR,
                owner_id=farmer1.id,
            ),
        ]
        
        db.add_all(devices)
        await db.commit()
        print("Done seeding data.")


if __name__ == "__main__":
    asyncio.run(seed())
