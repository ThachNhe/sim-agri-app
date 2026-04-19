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

    async def get_by_sensor_and_date(
        self, sensor_id: UUID, from_date: datetime, to_date: datetime
    ) -> List[SensorReading]:
        result = await self.db.execute(
            select(SensorReading)
            .where(SensorReading.sensor_id == sensor_id)
            .where(SensorReading.recorded_at >= from_date)
            .where(SensorReading.recorded_at <= to_date)
            .order_by(SensorReading.recorded_at.asc())
        )
        return list(result.scalars().all())

    async def get_latest_by_sensor(self, sensor_id: UUID) -> Optional[SensorReading]:
        result = await self.db.execute(
            select(SensorReading)
            .where(SensorReading.sensor_id == sensor_id)
            .order_by(SensorReading.recorded_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def get_latest_by_zone(self, zone_id: UUID) -> List[SensorReading]:
        """Lấy bản ghi mới nhất của mỗi cảm biến trong một khu vực."""
        from app.models.sensor import Sensor
        from sqlalchemy import func

        subq = (
            select(
                SensorReading.sensor_id,
                func.max(SensorReading.recorded_at).label("max_ts"),
            )
            .join(Sensor, Sensor.id == SensorReading.sensor_id)
            .where(Sensor.zone_id == zone_id)
            .group_by(SensorReading.sensor_id)
            .subquery()
        )

        result = await self.db.execute(
            select(SensorReading).join(
                subq,
                (SensorReading.sensor_id == subq.c.sensor_id)
                & (SensorReading.recorded_at == subq.c.max_ts),
            )
        )
        return list(result.scalars().all())
