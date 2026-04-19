from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.sensor import Sensor
from app.repositories.base import BaseRepository


class SensorRepository(BaseRepository[Sensor]):
    def __init__(self, db: AsyncSession):
        super().__init__(Sensor, db)

    async def get_by_zone(self, zone_id: UUID) -> List[Sensor]:
        result = await self.db.execute(
            select(Sensor)
            .where(Sensor.zone_id == zone_id)
            .order_by(Sensor.sensor_type.asc())
        )
        return list(result.scalars().all())

    async def get_active_by_zone(self, zone_id: UUID) -> List[Sensor]:
        result = await self.db.execute(
            select(Sensor)
            .where(Sensor.zone_id == zone_id, Sensor.is_active.is_(True))
            .order_by(Sensor.sensor_type.asc())
        )
        return list(result.scalars().all())
