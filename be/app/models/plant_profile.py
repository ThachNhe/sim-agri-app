from datetime import datetime
from sqlalchemy import String, Float, Integer, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.growing_zone import GrowingZone

from app.core.database import Base


class PlantProfile(Base):
    """Hồ sơ cây trồng – định nghĩa các thông số sinh trưởng tối ưu."""

    __tablename__ = "plant_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    description: Mapped[str] = mapped_column(String(1000), nullable=True)

    # Nhiệt độ không khí tối ưu (°C)
    temp_min: Mapped[float] = mapped_column(Float, nullable=False)
    temp_max: Mapped[float] = mapped_column(Float, nullable=False)

    # Độ ẩm không khí tối ưu (%)
    humidity_min: Mapped[float] = mapped_column(Float, nullable=False)
    humidity_max: Mapped[float] = mapped_column(Float, nullable=False)

    # Độ ẩm đất tối ưu (%)
    soil_moisture_min: Mapped[float] = mapped_column(Float, nullable=False)
    soil_moisture_max: Mapped[float] = mapped_column(Float, nullable=False)

    # Cường độ ánh sáng tối ưu (lux)
    light_min: Mapped[float] = mapped_column(Float, nullable=True)
    light_max: Mapped[float] = mapped_column(Float, nullable=True)

    # Độ pH đất tối ưu
    ph_min: Mapped[float] = mapped_column(Float, nullable=True)
    ph_max: Mapped[float] = mapped_column(Float, nullable=True)

    # Độ dẫn điện / dinh dưỡng tối ưu (μS/cm)
    ec_min: Mapped[float] = mapped_column(Float, nullable=True)
    ec_max: Mapped[float] = mapped_column(Float, nullable=True)

    # Thời gian sinh trưởng điển hình (ngày)
    growth_period_days: Mapped[int] = mapped_column(Integer, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    zones: Mapped[list["GrowingZone"]] = relationship(
        "GrowingZone", back_populates="plant_profile"
    )

    def __repr__(self) -> str:
        return f"<PlantProfile id={self.id} name={self.name}>"
