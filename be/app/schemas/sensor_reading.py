from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime


class SensorReadingResponse(BaseModel):
    id: UUID
    device_id: UUID
    temperature: float
    humidity: float
    soil_moisture: float | None = None
    recorded_at: datetime

    model_config = ConfigDict(from_attributes=True)
