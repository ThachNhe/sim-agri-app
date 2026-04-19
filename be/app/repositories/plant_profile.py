from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.plant_profile import PlantProfile
from app.repositories.base import BaseRepository


class PlantProfileRepository(BaseRepository[PlantProfile]):
    def __init__(self, db: AsyncSession):
        super().__init__(PlantProfile, db)

    async def get_all_ordered(self) -> List[PlantProfile]:
        result = await self.db.execute(
            select(PlantProfile).order_by(PlantProfile.name.asc())
        )
        return list(result.scalars().all())

    async def get_by_name(self, name: str) -> Optional[PlantProfile]:
        result = await self.db.execute(
            select(PlantProfile).where(PlantProfile.name == name)
        )
        return result.scalar_one_or_none()
