from uuid import UUID
from typing import List

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.device import Device
from app.models.user import User
from app.repositories.device import DeviceRepository
from app.schemas.device import DeviceCreate, DeviceUpdate, DeviceResponse
from app.constants.enums import UserRole
from app.core.exception import NotFoundException, ForbiddenException


class DeviceService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.device_repo = DeviceRepository(db)

    async def get_devices(
        self, user: User, owner_id: UUID | None = None
    ) -> List[DeviceResponse]:
        if user.role == UserRole.ADMIN:
            if owner_id is not None:
                devices = await self.device_repo.get_by_owner_ordered(owner_id)
            else:
                devices = await self.device_repo.get_all_ordered()
        else:
            devices = await self.device_repo.get_by_owner_ordered(user.id)
        return [DeviceResponse.model_validate(d) for d in devices]

    async def get_device_by_id(self, device_id: UUID, user: User) -> DeviceResponse:
        device = await self._get_and_check_ownership(device_id, user)
        return DeviceResponse.model_validate(device)

    async def create_device(self, payload: DeviceCreate, user: User) -> DeviceResponse:
        if user.role == UserRole.ADMIN:
            raise ForbiddenException("Admin không có quyền thêm thiết bị")

        device = Device(
            name=payload.name,
            location=payload.location,
            type=payload.type,
            owner_id=user.id,
        )
        device = await self.device_repo.create(device)
        return DeviceResponse.model_validate(device)

    async def update_device(
        self, device_id: UUID, payload: DeviceUpdate, user: User
    ) -> DeviceResponse:
        device = await self._get_and_check_ownership(device_id, user)

        if payload.name is not None:
            device.name = payload.name
        if payload.location is not None:
            device.location = payload.location
        if payload.type is not None:
            device.type = payload.type
        if payload.is_active is not None:
            device.is_active = payload.is_active

        await self.db.flush()
        await self.db.refresh(device)
        return DeviceResponse.model_validate(device)

    async def delete_device(self, device_id: UUID, user: User) -> None:
        device = await self._get_and_check_ownership(device_id, user)
        await self.device_repo.delete(device)

    async def _get_and_check_ownership(self, device_id: UUID, user: User) -> Device:
        device = await self.device_repo.get_by_id(device_id)
        if not device:
            raise NotFoundException("Thiết bị không tồn tại")
        if user.role != UserRole.ADMIN and device.owner_id != user.id:
            raise ForbiddenException("Bạn không có quyền truy cập thiết bị này")
        return device
