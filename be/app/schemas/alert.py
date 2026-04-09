from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime


class AlertResponse(BaseModel):
    id: UUID
    device_id: UUID
    message: str
    threshold: float
    triggered_at: datetime
    is_read: bool

    model_config = ConfigDict(from_attributes=True)


class AlertSummaryResponse(BaseModel):
    total_alerts: int
    read_alerts: int
    unread_alerts: int
