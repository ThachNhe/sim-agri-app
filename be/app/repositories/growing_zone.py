from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.growing_zone import GrowingZone
from app.repositories.base import BaseRepository


class GrowingZoneRepository(BaseRepository[GrowingZone]):
    def __init__(self, db: AsyncSession):
        super().__init__(GrowingZone, db)

    async def get_by_owner(self, owner_id: UUID) -> List[GrowingZone]:
        result = await self.db.execute(
            select(GrowingZone)
            .where(GrowingZone.owner_id == owner_id)
            .order_by(GrowingZone.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_all_ordered(self) -> List[GrowingZone]:
        result = await self.db.execute(
            select(GrowingZone).order_by(GrowingZone.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_by_id_with_relations(self, zone_id: UUID) -> Optional[GrowingZone]:
        result = await self.db.execute(
            select(GrowingZone)
            .where(GrowingZone.id == zone_id)
            .options(
                selectinload(GrowingZone.plant_profile),
                selectinload(GrowingZone.sensors),
                selectinload(GrowingZone.actuators),
            )
        )
        return result.scalar_one_or_none()
