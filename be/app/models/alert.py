from datetime import datetime
from sqlalchemy import String, Boolean, Float, DateTime, func, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.growing_zone import GrowingZone
    from app.models.sensor import Sensor

from app.core.database import Base
from app.constants.enums import AlertType, AlertSeverity, SensorType


class Alert(Base):
    """Cảnh báo khi thông số cảm biến ra ngoài ngưỡng tối ưu của cây trồng."""

    __tablename__ = "alerts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    zone_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("growing_zones.id", ondelete="CASCADE"),
        nullable=False,
    )
    sensor_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sensors.id", ondelete="SET NULL"),
        nullable=True,
    )
    alert_type: Mapped[AlertType] = mapped_column(SAEnum(AlertType, values_callable=lambda x: [e.value for e in x]), nullable=False)
    severity: Mapped[AlertSeverity] = mapped_column(
        SAEnum(AlertSeverity, values_callable=lambda x: [e.value for e in x]), default=AlertSeverity.MEDIUM, nullable=False
    )
    parameter: Mapped[SensorType | None] = mapped_column(
        SAEnum(SensorType, values_callable=lambda x: [e.value for e in x]), nullable=True
    )
    actual_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    threshold_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    message: Mapped[str] = mapped_column(String(500), nullable=False)
    recommended_action: Mapped[str | None] = mapped_column(String(500), nullable=True)
    automation_status: Mapped[str] = mapped_column(String(30), default="none")
    automation_action: Mapped[str | None] = mapped_column(String(500), nullable=True)
    automation_device_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("devices.id", ondelete="SET NULL"),
        nullable=True,
    )
    automation_device_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    automation_command: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    triggered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )

    zone: Mapped["GrowingZone"] = relationship("GrowingZone", back_populates="alerts")
    sensor: Mapped["Sensor | None"] = relationship("Sensor")

    def __repr__(self) -> str:
        return f"<Alert id={self.id} zone_id={self.zone_id} type={self.alert_type}>"
