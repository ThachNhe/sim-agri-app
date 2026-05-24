from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from app.constants.enums import (
    DeviceAutomationTrigger,
    DeviceConnectionStatus,
    DeviceControlMode,
    DeviceType,
)


class DeviceBase(BaseModel):
    name: str
    location: str
    type: DeviceType
    control_mode: DeviceControlMode
    power_watt: float | None = None
    linked_sensor_id: UUID | None = None
    automation_enabled: bool = True
    automation_trigger: DeviceAutomationTrigger = DeviceAutomationTrigger.BOTH
    command_topic: str
    state_topic: str
    qos: int = 1
    timeout_seconds: int = 10
    payload_on: str = '{"cmd":"ON"}'
    payload_off: str = '{"cmd":"OFF"}'


class DeviceCreate(DeviceBase):
    pass


class DeviceUpdate(BaseModel):
    name: str | None = None
    location: str | None = None
    type: DeviceType | None = None
    control_mode: DeviceControlMode | None = None
    power_watt: float | None = None
    linked_sensor_id: UUID | None = None
    automation_enabled: bool | None = None
    automation_trigger: DeviceAutomationTrigger | None = None
    command_topic: str | None = None
    state_topic: str | None = None
    qos: int | None = None
    timeout_seconds: int | None = None
    payload_on: str | None = None
    payload_off: str | None = None
    current_state: str | None = None
    current_value: float | None = None
    connection_status: DeviceConnectionStatus | None = None
    last_command: str | None = None
    is_active: bool | None = None


class DeviceResponse(DeviceBase):
    id: UUID
    owner_id: UUID
    current_state: str
    current_value: float
    connection_status: DeviceConnectionStatus
    last_command: str | None
    last_seen_at: datetime | None
    is_auto_running: bool = False
    auto_remaining_seconds: int | None = None
    auto_shutdown_at: datetime | None = None
    linked_sensor_name: str | None = None
    linked_sensor_type: str | None = None
    linked_zone_id: UUID | None = None
    linked_zone_name: str | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
