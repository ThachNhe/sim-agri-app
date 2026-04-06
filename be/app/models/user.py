from datetime import datetime
from sqlalchemy import String, Boolean, Enum as SAEnum, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.device import Device

from app.core.database import Base
from app.constants.enums import UserRole, UserStatus


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=True)

    role: Mapped[UserRole] = mapped_column(
        SAEnum(UserRole), default=UserRole.USER, nullable=False
    )
    status: Mapped[UserStatus] = mapped_column(
        SAEnum(UserStatus), default=UserStatus.ACTIVE, nullable=False
    )

    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    devices: Mapped[list["Device"]] = relationship("Device", back_populates="owner", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email}>"
