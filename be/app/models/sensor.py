from datetime import datetime
from sqlalchemy import String, Boolean, Enum as SAEnum, DateTime, func, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.growing_zone import GrowingZone
    from app.models.sensor_reading import SensorReading

from app.core.database import Base
from app.constants.enums import SensorType


class Sensor(Base):
    """Cảm biến đo thông số môi trường trong khu vực trồng trọt."""

    __tablename__ = "sensors"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    sensor_type: Mapped[SensorType] = mapped_column(
        SAEnum(SensorType, values_callable=lambda x: [e.value for e in x]), nullable=False
    )
    unit: Mapped[str] = mapped_column(String(50), nullable=False, default="")
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    device_address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    update_interval_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=60)
    zone_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("growing_zones.id", ondelete="CASCADE"),
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    zone: Mapped["GrowingZone"] = relationship("GrowingZone", back_populates="sensors")
    readings: Mapped[list["SensorReading"]] = relationship(
        "SensorReading", back_populates="sensor", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Sensor id={self.id} name={self.name} type={self.sensor_type}>"
