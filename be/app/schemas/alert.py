from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from app.constants.enums import AlertType, AlertSeverity, SensorType


class AlertResponse(BaseModel):
    id: UUID
    zone_id: UUID
    sensor_id: UUID | None
    alert_type: AlertType
    severity: AlertSeverity
    parameter: SensorType | None
    actual_value: float | None
    threshold_value: float | None
    message: str
    recommended_action: str | None
    is_read: bool
    triggered_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AlertSummaryResponse(BaseModel):
    total_alerts: int
    read_alerts: int
    unread_alerts: int

