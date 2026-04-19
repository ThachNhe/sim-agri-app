from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from app.constants.enums import SensorType


class SensorBase(BaseModel):
    name: str
    sensor_type: SensorType
    unit: str = ""
    zone_id: UUID


class SensorCreate(SensorBase):
    pass


class SensorUpdate(BaseModel):
    name: str | None = None
    is_active: bool | None = None


class SensorResponse(SensorBase):
    id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
