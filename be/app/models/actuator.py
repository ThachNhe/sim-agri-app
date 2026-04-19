from datetime import datetime
from sqlalchemy import String, Boolean, Enum as SAEnum, DateTime, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.growing_zone import GrowingZone
    from app.models.actuator_command import ActuatorCommand

from app.core.database import Base
from app.constants.enums import ActuatorType, ActuatorState


class Actuator(Base):
    """Thiết bị điều chỉnh môi trường (tưới nước, bơm phân, đèn, quạt, máy sưởi)."""

    __tablename__ = "actuators"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    actuator_type: Mapped[ActuatorType] = mapped_column(
        SAEnum(ActuatorType, values_callable=lambda x: [e.value for e in x]), nullable=False
    )
    zone_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("growing_zones.id", ondelete="CASCADE"),
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    current_state: Mapped[ActuatorState] = mapped_column(
        SAEnum(ActuatorState, values_callable=lambda x: [e.value for e in x]), default=ActuatorState.OFF, nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    zone: Mapped["GrowingZone"] = relationship("GrowingZone", back_populates="actuators")
    commands: Mapped[list["ActuatorCommand"]] = relationship(
        "ActuatorCommand", back_populates="actuator", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Actuator id={self.id} name={self.name} type={self.actuator_type}>"
