from datetime import datetime, timedelta, timezone
from uuid import UUID
from typing import List

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.device import Device
from app.models.user import User
from app.repositories.device import DeviceRepository
from app.repositories.sensor import SensorRepository
from app.repositories.growing_zone import GrowingZoneRepository
from app.schemas.device import DeviceCreate, DeviceUpdate, DeviceResponse
from app.constants.enums import DeviceConnectionStatus, UserRole
from app.core.exception import NotFoundException, ForbiddenException


class DeviceService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.device_repo = DeviceRepository(db)
        self.sensor_repo = SensorRepository(db)
        self.zone_repo = GrowingZoneRepository(db)

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

        await self._expire_finished_auto_runs(devices)
        return [self._to_response(d) for d in devices]

    async def get_device_by_id(self, device_id: UUID, user: User) -> DeviceResponse:
        device = await self._get_and_check_ownership(device_id, user)
        await self._expire_finished_auto_runs([device])
        return self._to_response(device)

    async def create_device(self, payload: DeviceCreate, user: User) -> DeviceResponse:
        if user.role == UserRole.ADMIN:
            raise ForbiddenException("Admin không có quyền thêm thiết bị")

        await self._check_linked_sensor_access(payload.linked_sensor_id, user)
        now = datetime.now(timezone.utc)
        device = Device(
            name=payload.name,
            location=payload.location,
            type=payload.type.value,
            control_mode=payload.control_mode.value,
            power_watt=payload.power_watt,
            owner_id=user.id,
            linked_sensor_id=payload.linked_sensor_id,
            automation_enabled=payload.automation_enabled,
            automation_trigger=payload.automation_trigger.value,
            command_topic=payload.command_topic,
            state_topic=payload.state_topic,
            qos=payload.qos,
            timeout_seconds=payload.timeout_seconds,
            payload_on=payload.payload_on,
            payload_off=payload.payload_off,
            connection_status=DeviceConnectionStatus.ONLINE.value,
            last_seen_at=now,
            last_command="CONNECTED",
        )
        device = await self.device_repo.create(device)
        device = await self.device_repo.get_by_id(device.id) or device
        return self._to_response(device)

    async def update_device(
        self, device_id: UUID, payload: DeviceUpdate, user: User
    ) -> DeviceResponse:
        device = await self._get_and_check_ownership(device_id, user)

        data = payload.model_dump(exclude_unset=True)
        if "linked_sensor_id" in data:
            await self._check_linked_sensor_access(payload.linked_sensor_id, user)

        for field, value in data.items():
            if field in {"type", "control_mode", "connection_status", "automation_trigger"} and value is not None:
                value = value.value
            setattr(device, field, value)

        if any(field in data for field in {"current_state", "current_value", "connection_status", "last_command"}):
            device.last_seen_at = datetime.now(timezone.utc)
            if "connection_status" not in data:
                device.connection_status = DeviceConnectionStatus.ONLINE.value

        await self.db.flush()
        await self.db.refresh(device)
        device = await self.device_repo.get_by_id(device.id) or device
        return self._to_response(device)

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

    async def _check_linked_sensor_access(self, sensor_id: UUID | None, user: User) -> None:
        if sensor_id is None:
            return
        sensor = await self.sensor_repo.get_by_id(sensor_id)
        if not sensor:
            raise NotFoundException("Cảm biến liên kết không tồn tại")
        zone = await self.zone_repo.get_by_id(sensor.zone_id)
        if not zone:
            raise NotFoundException("Khu vực của cảm biến không tồn tại")
        if user.role != UserRole.ADMIN:
            assigned = await self.zone_repo.is_farmer_assigned(sensor.zone_id, user.id)
            if not assigned:
                raise ForbiddenException("Bạn không có quyền liên kết cảm biến này")

    def _to_response(self, device: Device) -> DeviceResponse:
        response = DeviceResponse.model_validate(device)
        response.is_auto_running = self._is_auto_running(device)
        response.auto_shutdown_at = self._auto_shutdown_at(device)
        response.auto_remaining_seconds = self._auto_remaining_seconds(device)
        if device.linked_sensor is not None:
            response.linked_sensor_name = device.linked_sensor.name
            response.linked_sensor_type = device.linked_sensor.sensor_type.value
            response.linked_zone_id = device.linked_sensor.zone_id
            if device.linked_sensor.zone is not None:
                response.linked_zone_name = device.linked_sensor.zone.name
        return response

    async def _expire_finished_auto_runs(self, devices: List[Device]) -> None:
        now = datetime.now(timezone.utc)
        changed_devices: list[Device] = []

        for device in devices:
            if not self._is_auto_running(device):
                continue

            shutdown_at = self._auto_shutdown_at(device)
            if shutdown_at is None or shutdown_at > now:
                continue

            device.current_state = "off"
            device.current_value = 0
            device.connection_status = DeviceConnectionStatus.ONLINE.value
            device.last_seen_at = now
            device.last_command = f"AUTO OFF sau {device.timeout_seconds}s"
            changed_devices.append(device)

        if not changed_devices:
            return

        await self.db.flush()
        for device in changed_devices:
            await self.db.refresh(
                device,
                attribute_names=[
                    "current_state",
                    "current_value",
                    "connection_status",
                    "last_seen_at",
                    "last_command",
                    "updated_at",
                ],
            )

    @staticmethod
    def _is_auto_running(device: Device) -> bool:
        last_command = device.last_command or ""
        is_running = device.current_state == "on" or device.current_value > 0
        return is_running and last_command.startswith("AUTO ") and not last_command.startswith("AUTO OFF")

    @staticmethod
    def _aware_utc(value: datetime | None) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    @classmethod
    def _auto_shutdown_at(cls, device: Device) -> datetime | None:
        if not cls._is_auto_running(device):
            return None

        started_at = cls._aware_utc(device.last_seen_at)
        if started_at is None:
            return None

        return started_at + timedelta(seconds=max(device.timeout_seconds, 1))

    @classmethod
    def _auto_remaining_seconds(cls, device: Device) -> int | None:
        shutdown_at = cls._auto_shutdown_at(device)
        if shutdown_at is None:
            return None

        remaining = (shutdown_at - datetime.now(timezone.utc)).total_seconds()
        return max(0, int(round(remaining)))
