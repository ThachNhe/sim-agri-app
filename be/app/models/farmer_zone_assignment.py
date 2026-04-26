from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.growing_zone import GrowingZone

from app.core.database import Base


class FarmerZoneAssignment(Base):
    """Bảng trung gian: nông dân được phân công quản lý khu vực trồng trọt."""

    __tablename__ = "farmer_zone_assignments"

    farmer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    zone_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("growing_zones.id", ondelete="CASCADE"),
        primary_key=True,
    )
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    farmer: Mapped["User"] = relationship("User", back_populates="zone_assignments")
    zone: Mapped["GrowingZone"] = relationship(
        "GrowingZone", back_populates="farmer_assignments"
    )

    def __repr__(self) -> str:
        return f"<FarmerZoneAssignment farmer={self.farmer_id} zone={self.zone_id}>"
