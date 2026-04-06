from datetime import datetime
from sqlalchemy import Float, DateTime, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.device import Device

from app.core.database import Base


class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    device_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("devices.id", ondelete="CASCADE"), nullable=False
    )
    temperature: Mapped[float] = mapped_column(Float, nullable=False)
    humidity: Mapped[float] = mapped_column(Float, nullable=False)
    soil_moisture: Mapped[float] = mapped_column(Float, nullable=True)
    
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )

    device: Mapped["Device"] = relationship("Device", back_populates="readings")

    def __repr__(self) -> str:
        return f"<SensorReading id={self.id} device_id={self.device_id}>"
