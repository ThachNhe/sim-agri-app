from datetime import datetime, date
from sqlalchemy import String, Float, Boolean, Date, DateTime, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.plant_profile import PlantProfile
    from app.models.sensor import Sensor
    from app.models.actuator import Actuator
    from app.models.alert import Alert
    from app.models.farmer_zone_assignment import FarmerZoneAssignment

from app.core.database import Base


class GrowingZone(Base):
    """Khu vực trồng trọt – được tạo bởi admin và phân công cho nông dân."""

    __tablename__ = "growing_zones"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(String(1000), nullable=True)
    location: Mapped[str] = mapped_column(String(255), nullable=True)
    area_sqm: Mapped[float] = mapped_column(Float, nullable=True)

    plant_profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("plant_profiles.id", ondelete="SET NULL"),
        nullable=True,
    )

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    planting_date: Mapped[date] = mapped_column(Date, nullable=True)
    expected_harvest_date: Mapped[date] = mapped_column(Date, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    plant_profile: Mapped["PlantProfile"] = relationship(
        "PlantProfile", back_populates="zones"
    )
    sensors: Mapped[list["Sensor"]] = relationship(
        "Sensor", back_populates="zone", cascade="all, delete-orphan"
    )
    actuators: Mapped[list["Actuator"]] = relationship(
        "Actuator", back_populates="zone", cascade="all, delete-orphan"
    )
    farmer_assignments: Mapped[list["FarmerZoneAssignment"]] = relationship(
        "FarmerZoneAssignment", back_populates="zone", cascade="all, delete-orphan"
    )
    alerts: Mapped[list["Alert"]] = relationship(
        "Alert", back_populates="zone", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<GrowingZone id={self.id} name={self.name}>"
