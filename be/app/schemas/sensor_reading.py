from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime


class SensorReadingCreate(BaseModel):
    sensor_id: UUID
    value: float


class SensorReadingResponse(BaseModel):
    id: UUID
    sensor_id: UUID
    value: float
    recorded_at: datetime

    model_config = ConfigDict(from_attributes=True)

