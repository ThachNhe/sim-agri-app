from typing import List
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sensor import Sensor
from app.models.user import User
from app.constants.enums import UserRole, SENSOR_UNIT
from app.repositories.sensor import SensorRepository
from app.repositories.growing_zone import GrowingZoneRepository
from app.schemas.sensor import SensorCreate, SensorUpdate, SensorResponse
from app.core.exception import NotFoundException, ForbiddenException


class SensorService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = SensorRepository(db)
        self.zone_repo = GrowingZoneRepository(db)

    async def list_sensors(self, zone_id: UUID, user: User) -> List[SensorResponse]:
        await self._check_zone_access(zone_id, user)
        sensors = await self.repo.get_by_zone(zone_id)
        return [SensorResponse.model_validate(s) for s in sensors]

    async def create_sensor(self, payload: SensorCreate, user: User) -> SensorResponse:
        await self._check_zone_access(payload.zone_id, user)
        unit = payload.unit or SENSOR_UNIT.get(payload.sensor_type, "")
        sensor_data = payload.model_dump(exclude={"unit"})
        sensor = Sensor(**sensor_data, unit=unit)
        sensor.unit = unit
        sensor = await self.repo.create(sensor)
        return SensorResponse.model_validate(sensor)

    async def update_sensor(self, sensor_id: UUID, payload: SensorUpdate, user: User) -> SensorResponse:
        sensor = await self._get_sensor_with_access(sensor_id, user)
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(sensor, field, value)
        await self.db.flush()
        await self.db.refresh(sensor)
        return SensorResponse.model_validate(sensor)

    async def delete_sensor(self, sensor_id: UUID, user: User) -> None:
        sensor = await self._get_sensor_with_access(sensor_id, user)
        await self.repo.delete(sensor)

    async def _check_zone_access(self, zone_id: UUID, user: User):
        zone = await self.zone_repo.get_by_id(zone_id)
        if not zone:
            raise NotFoundException("Khu vực trồng trọt không tồn tại")
        if user.role != UserRole.ADMIN and zone.owner_id != user.id:
            raise ForbiddenException("Bạn không có quyền truy cập khu vực này")

    async def _get_sensor_with_access(self, sensor_id: UUID, user: User) -> Sensor:
        sensor = await self.repo.get_by_id(sensor_id)
        if not sensor:
            raise NotFoundException("Cảm biến không tồn tại")
        await self._check_zone_access(sensor.zone_id, user)
        return sensor
