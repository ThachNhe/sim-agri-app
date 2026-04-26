from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload

from app.models.growing_zone import GrowingZone
from app.models.farmer_zone_assignment import FarmerZoneAssignment
from app.models.user import User
from app.repositories.base import BaseRepository


class GrowingZoneRepository(BaseRepository[GrowingZone]):
    def __init__(self, db: AsyncSession):
        super().__init__(GrowingZone, db)

    async def get_by_farmer(self, farmer_id: UUID) -> List[GrowingZone]:
        """Lấy danh sách khu vực mà nông dân được phân công."""
        result = await self.db.execute(
            select(GrowingZone)
            .join(FarmerZoneAssignment, FarmerZoneAssignment.zone_id == GrowingZone.id)
            .where(FarmerZoneAssignment.farmer_id == farmer_id)
            .order_by(GrowingZone.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_all_ordered(self) -> List[GrowingZone]:
        result = await self.db.execute(
            select(GrowingZone).order_by(GrowingZone.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_by_id_with_relations(self, zone_id: UUID) -> Optional[GrowingZone]:
        result = await self.db.execute(
            select(GrowingZone)
            .where(GrowingZone.id == zone_id)
            .options(
                selectinload(GrowingZone.plant_profile),
                selectinload(GrowingZone.sensors),
                selectinload(GrowingZone.actuators),
            )
        )
        return result.scalar_one_or_none()

    async def is_farmer_assigned(self, zone_id: UUID, farmer_id: UUID) -> bool:
        """Kiểm tra nông dân có được phân công quản lý khu vực này không."""
        result = await self.db.execute(
            select(FarmerZoneAssignment).where(
                FarmerZoneAssignment.zone_id == zone_id,
                FarmerZoneAssignment.farmer_id == farmer_id,
            )
        )
        return result.scalar_one_or_none() is not None

    async def get_assigned_farmers(self, zone_id: UUID) -> List[User]:
        """Lấy danh sách nông dân được phân công quản lý khu vực."""
        result = await self.db.execute(
            select(User)
            .join(FarmerZoneAssignment, FarmerZoneAssignment.farmer_id == User.id)
            .where(FarmerZoneAssignment.zone_id == zone_id)
            .order_by(FarmerZoneAssignment.assigned_at)
        )
        return list(result.scalars().all())

    async def assign_farmer(self, zone_id: UUID, farmer_id: UUID) -> FarmerZoneAssignment:
        """Phân công nông dân quản lý khu vực."""
        assignment = FarmerZoneAssignment(farmer_id=farmer_id, zone_id=zone_id)
        self.db.add(assignment)
        await self.db.flush()
        return assignment

    async def unassign_farmer(self, zone_id: UUID, farmer_id: UUID) -> bool:
        """Gỡ phân công nông dân khỏi khu vực."""
        result = await self.db.execute(
            delete(FarmerZoneAssignment).where(
                FarmerZoneAssignment.zone_id == zone_id,
                FarmerZoneAssignment.farmer_id == farmer_id,
            )
        )
        await self.db.flush()
        return result.rowcount > 0
