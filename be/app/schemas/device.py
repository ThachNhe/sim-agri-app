from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from app.constants.enums import DeviceType


class DeviceBase(BaseModel):
    name: str
    location: str
    type: DeviceType


class DeviceCreate(DeviceBase):
    pass


class DeviceUpdate(BaseModel):
    name: str | None = None
    location: str | None = None
    type: DeviceType | None = None
    is_active: bool | None = None


class DeviceResponse(DeviceBase):
    id: UUID
    owner_id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
