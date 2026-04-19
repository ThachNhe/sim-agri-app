from datetime import datetime
from sqlalchemy import String, Integer, Enum as SAEnum, DateTime, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.actuator import Actuator
    from app.models.user import User

from app.core.database import Base
from app.constants.enums import ActuatorState


class ActuatorCommand(Base):
    """Lịch sử lệnh điều khiển thiết bị – ghi lại ai ra lệnh gì và lý do."""

    __tablename__ = "actuator_commands"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    actuator_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("actuators.id", ondelete="CASCADE"),
        nullable=False,
    )
    # NULL = lệnh tự động từ hệ thống
    commanded_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    command: Mapped[ActuatorState] = mapped_column(
        SAEnum(ActuatorState, values_callable=lambda x: [e.value for e in x]), nullable=False
    )
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    reason: Mapped[str | None] = mapped_column(String(500), nullable=True)

    executed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )

    actuator: Mapped["Actuator"] = relationship("Actuator", back_populates="commands")
    user: Mapped["User | None"] = relationship("User", back_populates="commands")

    def __repr__(self) -> str:
        return f"<ActuatorCommand id={self.id} actuator={self.actuator_id} cmd={self.command}>"
