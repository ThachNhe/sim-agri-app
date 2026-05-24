from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, Float, Integer, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.sensor import Sensor

from app.core.database import Base
from app.constants.enums import DeviceConnectionStatus, DeviceControlMode, DeviceType


class Device(Base):
    """Thiết bị điều khiển MQTT dùng cho demo automation."""

    __tablename__ = "devices"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    location: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str] = mapped_column(String(50), default=DeviceType.PUMP.value, nullable=False)
    control_mode: Mapped[str] = mapped_column(
        String(30), default=DeviceControlMode.ON_OFF.value, nullable=False
    )
    power_watt: Mapped[float | None] = mapped_column(Float, nullable=True)
    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    linked_sensor_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sensors.id", ondelete="SET NULL"), nullable=True
    )
    automation_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    automation_trigger: Mapped[str] = mapped_column(String(30), default="both", nullable=False)
    command_topic: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    state_topic: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    qos: Mapped[int] = mapped_column(Integer, default=1)
    timeout_seconds: Mapped[int] = mapped_column(Integer, default=10)
    payload_on: Mapped[str] = mapped_column(String(500), default='{"cmd":"ON"}')
    payload_off: Mapped[str] = mapped_column(String(500), default='{"cmd":"OFF"}')
    current_state: Mapped[str] = mapped_column(String(20), default="off")
    current_value: Mapped[float] = mapped_column(Float, default=0)
    connection_status: Mapped[str] = mapped_column(
        String(30), default=DeviceConnectionStatus.OFFLINE.value
    )
    last_command: Mapped[str | None] = mapped_column(String(500), nullable=True)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    owner: Mapped["User"] = relationship("User", back_populates="devices")
    linked_sensor: Mapped["Sensor | None"] = relationship("Sensor")

    def __repr__(self) -> str:
        return f"<Device id={self.id} name={self.name}>"
