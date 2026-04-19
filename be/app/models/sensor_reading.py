from datetime import datetime
from sqlalchemy import Float, DateTime, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.sensor import Sensor

from app.core.database import Base


class SensorReading(Base):
    """Một bản ghi đo từ cảm biến – mỗi bản ghi chứa giá trị đơn của một thông số."""

    __tablename__ = "sensor_readings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    sensor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sensors.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # Giá trị đo được (đơn vị theo sensor_type)
    value: Mapped[float] = mapped_column(Float, nullable=False)

    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )

    sensor: Mapped["Sensor"] = relationship("Sensor", back_populates="readings")

    def __repr__(self) -> str:
        return f"<SensorReading id={self.id} sensor_id={self.sensor_id} value={self.value}>"
