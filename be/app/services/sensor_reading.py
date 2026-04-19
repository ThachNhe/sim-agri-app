from uuid import UUID
from datetime import datetime
from typing import List

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.repositories.sensor_reading import SensorReadingRepository
from app.repositories.sensor import SensorRepository
from app.repositories.growing_zone import GrowingZoneRepository
from app.schemas.sensor_reading import SensorReadingResponse
from app.constants.enums import UserRole
from app.core.exception import NotFoundException, ForbiddenException


class SensorReadingService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.reading_repo = SensorReadingRepository(db)
        self.sensor_repo = SensorRepository(db)
        self.zone_repo = GrowingZoneRepository(db)

    async def get_readings(
        self, sensor_id: UUID, from_date: datetime, to_date: datetime, user: User
    ) -> List[SensorReadingResponse]:
        sensor = await self.sensor_repo.get_by_id(sensor_id)
        if not sensor:
            raise NotFoundException("Cảm biến không tồn tại")
        zone = await self.zone_repo.get_by_id(sensor.zone_id)
        if not zone:
            raise NotFoundException("Khu vực không tồn tại")
        if user.role != UserRole.ADMIN and zone.owner_id != user.id:
            raise ForbiddenException("Bạn không có quyền xem dữ liệu cảm biến này")

        readings = await self.reading_repo.get_by_sensor_and_date(sensor_id, from_date, to_date)
        return [SensorReadingResponse.model_validate(r) for r in readings]

    async def get_latest_by_zone(self, zone_id: UUID, user: User) -> List[SensorReadingResponse]:
        zone = await self.zone_repo.get_by_id(zone_id)
        if not zone:
            raise NotFoundException("Khu vực không tồn tại")
        if user.role != UserRole.ADMIN and zone.owner_id != user.id:
            raise ForbiddenException("Bạn không có quyền xem dữ liệu khu vực này")

        readings = await self.reading_repo.get_latest_by_zone(zone_id)
        return [SensorReadingResponse.model_validate(r) for r in readings]
