from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func
from sqlalchemy.orm import selectinload

from app.models.alert import Alert
from app.models.growing_zone import GrowingZone
from app.models.farmer_zone_assignment import FarmerZoneAssignment
from app.repositories.base import BaseRepository


class AlertRepository(BaseRepository[Alert]):
    def __init__(self, db: AsyncSession):
        super().__init__(Alert, db)

    async def get_by_owner(
        self, farmer_id: UUID, skip: int = 0, limit: int | None = None
    ) -> List[Alert]:
        query = (
            select(Alert)
            .options(selectinload(Alert.zone), selectinload(Alert.sensor))
            .join(GrowingZone, GrowingZone.id == Alert.zone_id)
            .join(
                FarmerZoneAssignment,
                (FarmerZoneAssignment.zone_id == GrowingZone.id)
                & (FarmerZoneAssignment.farmer_id == farmer_id),
            )
            .order_by(Alert.triggered_at.desc())
            .offset(skip)
        )
        if limit is not None:
            query = query.limit(limit)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_by_id(self, id) -> Optional[Alert]:
        result = await self.db.execute(
            select(Alert)
            .options(selectinload(Alert.zone), selectinload(Alert.sensor))
            .where(Alert.id == id)
        )
        return result.scalar_one_or_none()

    async def get_by_owner_and_id(self, farmer_id: UUID, alert_id: UUID) -> Optional[Alert]:
        result = await self.db.execute(
            select(Alert)
            .options(selectinload(Alert.zone), selectinload(Alert.sensor))
            .join(GrowingZone, GrowingZone.id == Alert.zone_id)
            .join(
                FarmerZoneAssignment,
                (FarmerZoneAssignment.zone_id == GrowingZone.id)
                & (FarmerZoneAssignment.farmer_id == farmer_id),
            )
            .where(Alert.id == alert_id)
        )
        return result.scalar_one_or_none()

    async def get_all_ordered(self, skip: int = 0, limit: int | None = None) -> List[Alert]:
        query = (
            select(Alert)
            .options(selectinload(Alert.zone), selectinload(Alert.sensor))
            .order_by(Alert.triggered_at.desc())
            .offset(skip)
        )
        if limit is not None:
            query = query.limit(limit)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_summary(self, farmer_id: Optional[UUID] = None) -> tuple[int, int, int]:
        total_query = select(func.count(Alert.id))
        read_query = select(func.count(Alert.id)).where(Alert.is_read.is_(True))
        auto_query = select(func.count(Alert.id)).where(Alert.automation_status == "executed")

        if farmer_id is not None:
            total_query = (
                total_query
                .join(GrowingZone, GrowingZone.id == Alert.zone_id)
                .join(
                    FarmerZoneAssignment,
                    (FarmerZoneAssignment.zone_id == GrowingZone.id)
                    & (FarmerZoneAssignment.farmer_id == farmer_id),
                )
            )
            read_query = (
                read_query
                .join(GrowingZone, GrowingZone.id == Alert.zone_id)
                .join(
                    FarmerZoneAssignment,
                    (FarmerZoneAssignment.zone_id == GrowingZone.id)
                    & (FarmerZoneAssignment.farmer_id == farmer_id),
                )
            )
            auto_query = (
                auto_query
                .join(GrowingZone, GrowingZone.id == Alert.zone_id)
                .join(
                    FarmerZoneAssignment,
                    (FarmerZoneAssignment.zone_id == GrowingZone.id)
                    & (FarmerZoneAssignment.farmer_id == farmer_id),
                )
            )

        total_alerts = (await self.db.execute(total_query)).scalar() or 0
        read_alerts = (await self.db.execute(read_query)).scalar() or 0
        auto_executed_alerts = (await self.db.execute(auto_query)).scalar() or 0
        return total_alerts, read_alerts, auto_executed_alerts

    async def mark_as_read(self, alert_id: UUID) -> Optional[Alert]:
        result = await self.db.execute(
            update(Alert)
            .where(Alert.id == alert_id)
            .values(is_read=True)
            .returning(Alert)
        )
        await self.db.flush()
        alert = result.scalar_one_or_none()
        if alert is None:
            return None
        return await self.get_by_id(alert.id)
