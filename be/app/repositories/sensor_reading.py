from typing import List, Optional
from uuid import UUID
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.sensor_reading import SensorReading
from app.repositories.base import BaseRepository


class SensorReadingRepository(BaseRepository[SensorReading]):
    def __init__(self, db: AsyncSession):
        super().__init__(SensorReading, db)

    async def get_by_device_and_date(
        self, device_id: UUID, from_date: datetime, to_date: datetime
    ) -> List[SensorReading]:
        result = await self.db.execute(
            select(SensorReading)
            .where(SensorReading.device_id == device_id)
            .where(SensorReading.recorded_at >= from_date)
            .where(SensorReading.recorded_at <= to_date)
            .order_by(SensorReading.recorded_at.asc())
        )
        return list(result.scalars().all())

    async def get_latest_by_device(self, device_id: UUID) -> Optional[SensorReading]:
        result = await self.db.execute(
            select(SensorReading)
            .where(SensorReading.device_id == device_id)
            .order_by(SensorReading.recorded_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()
