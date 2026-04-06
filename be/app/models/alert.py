from datetime import datetime
from sqlalchemy import String, Boolean, Float, DateTime, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.device import Device

from app.core.database import Base


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    device_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("devices.id", ondelete="CASCADE"), nullable=False
    )
    message: Mapped[str] = mapped_column(String(255), nullable=False)
    threshold: Mapped[float] = mapped_column(Float, nullable=False)
    triggered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)

    device: Mapped["Device"] = relationship("Device", back_populates="alerts")

    def __repr__(self) -> str:
        return f"<Alert id={self.id} device_id={self.device_id}>"
