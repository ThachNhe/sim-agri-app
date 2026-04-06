"""
Seed data cho development/staging.
Chạy: python alembic/seed_data.py
"""
import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import AsyncSessionLocal
from app.models.user import User
from app.constants.enums import UserRole, UserStatus
from app.utils.security import hash_password


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
        "email": "user@example.com",
        "password": "User@123",
        "full_name": "Test User",
        "role": UserRole.USER,
        "status": UserStatus.ACTIVE,
        "is_verified": True,
    },
]


async def seed(db: AsyncSession) -> None:
    from sqlalchemy import select

    for data in SEED_USERS:
        existing = await db.execute(select(User).where(User.email == data["email"]))
        if existing.scalar_one_or_none():
            print(f"  ⏭  Bỏ qua: {data['email']} (đã tồn tại)")
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
        print(f"  ✅ Tạo: {data['email']} [{data['role']}]")

    await db.commit()


async def main() -> None:
    print("🌱 Bắt đầu seed data...")
    async with AsyncSessionLocal() as db:
        await seed(db)
    print("✅ Seed data hoàn tất!")


if __name__ == "__main__":
    asyncio.run(main())
