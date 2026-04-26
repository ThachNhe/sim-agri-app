from typing import List
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.actuator import Actuator
from app.models.actuator_command import ActuatorCommand
from app.models.user import User
from app.constants.enums import UserRole
from app.repositories.actuator import ActuatorRepository
from app.repositories.growing_zone import GrowingZoneRepository
from app.schemas.actuator import (
    ActuatorCreate, ActuatorUpdate, ActuatorResponse,
    ActuatorCommandRequest, ActuatorCommandResponse,
)
from app.core.exception import NotFoundException, ForbiddenException


class ActuatorService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = ActuatorRepository(db)
        self.zone_repo = GrowingZoneRepository(db)

    async def list_actuators(self, zone_id: UUID, user: User) -> List[ActuatorResponse]:
        await self._check_zone_access(zone_id, user)
        actuators = await self.repo.get_by_zone(zone_id)
        return [ActuatorResponse.model_validate(a) for a in actuators]

    async def create_actuator(self, payload: ActuatorCreate, user: User) -> ActuatorResponse:
        await self._check_zone_access(payload.zone_id, user)
        actuator = Actuator(**payload.model_dump())
        actuator = await self.repo.create(actuator)
        return ActuatorResponse.model_validate(actuator)

    async def update_actuator(self, actuator_id: UUID, payload: ActuatorUpdate, user: User) -> ActuatorResponse:
        actuator = await self._get_with_access(actuator_id, user)
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(actuator, field, value)
        await self.db.flush()
        await self.db.refresh(actuator)
        return ActuatorResponse.model_validate(actuator)

    async def delete_actuator(self, actuator_id: UUID, user: User) -> None:
        actuator = await self._get_with_access(actuator_id, user)
        await self.repo.delete(actuator)

    async def send_command(
        self, actuator_id: UUID, payload: ActuatorCommandRequest, user: User
    ) -> ActuatorCommandResponse:
        actuator = await self._get_with_access(actuator_id, user)

        # Cập nhật trạng thái thiết bị
        updated = await self.repo.update_state(actuator_id, payload.command)
        if not updated:
            raise NotFoundException("Thiết bị không tồn tại")

        # Ghi lịch sử lệnh
        cmd = ActuatorCommand(
            actuator_id=actuator_id,
            commanded_by=user.id,
            command=payload.command,
            duration_seconds=payload.duration_seconds,
            reason=payload.reason,
        )
        self.db.add(cmd)
        await self.db.flush()
        await self.db.refresh(cmd)
        return ActuatorCommandResponse.model_validate(cmd)

    async def get_commands(self, actuator_id: UUID, user: User) -> List[ActuatorCommandResponse]:
        await self._get_with_access(actuator_id, user)
        commands = await self.repo.get_commands(actuator_id)
        return [ActuatorCommandResponse.model_validate(c) for c in commands]

    async def _check_zone_access(self, zone_id: UUID, user: User):
        zone = await self.zone_repo.get_by_id(zone_id)
        if not zone:
            raise NotFoundException("Khu vực trồng trọt không tồn tại")
        if user.role != UserRole.ADMIN:
            assigned = await self.zone_repo.is_farmer_assigned(zone_id, user.id)
            if not assigned:
                raise ForbiddenException("Bạn không có quyền truy cập khu vực này")

    async def _get_with_access(self, actuator_id: UUID, user: User) -> Actuator:
        actuator = await self.repo.get_by_id(actuator_id)
        if not actuator:
            raise NotFoundException("Thiết bị điều khiển không tồn tại")
        await self._check_zone_access(actuator.zone_id, user)
        return actuator
