from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func

from app.models.alert import Alert
from app.models.device import Device
from app.repositories.base import BaseRepository


class AlertRepository(BaseRepository[Alert]):
    def __init__(self, db: AsyncSession):
        super().__init__(Alert, db)

    async def get_by_owner(
        self, owner_id: UUID, skip: int = 0, limit: int = 100
    ) -> List[Alert]:
        result = await self.db.execute(
            select(Alert)
            .join(Device)
            .where(Device.owner_id == owner_id)
            .order_by(Alert.triggered_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_by_owner_and_id(self, owner_id: UUID, alert_id: UUID) -> Optional[Alert]:
        result = await self.db.execute(
            select(Alert)
            .join(Device)
            .where(Alert.id == alert_id)
            .where(Device.owner_id == owner_id)
        )
        return result.scalar_one_or_none()

    async def get_all_ordered(self, skip: int = 0, limit: int = 100) -> List[Alert]:
        result = await self.db.execute(
            select(Alert)
            .order_by(Alert.triggered_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_summary(self, owner_id: Optional[UUID] = None) -> tuple[int, int]:
        total_query = select(func.count(Alert.id))
        read_query = select(func.count(Alert.id)).where(Alert.is_read.is_(True))

        if owner_id is not None:
            total_query = total_query.join(Device).where(Device.owner_id == owner_id)
            read_query = read_query.join(Device).where(Device.owner_id == owner_id)

        total_alerts = (await self.db.execute(total_query)).scalar() or 0
        read_alerts = (await self.db.execute(read_query)).scalar() or 0
        return total_alerts, read_alerts

    async def get_unread_count(self, owner_id: UUID) -> int:
        result = await self.db.execute(
            select(func.count(Alert.id))
            .join(Device)
            .where(Device.owner_id == owner_id)
            .where(Alert.is_read == False)
        )
        return result.scalar_one()

    async def mark_as_read(self, alert_id: UUID) -> Optional[Alert]:
        result = await self.db.execute(
            update(Alert)
            .where(Alert.id == alert_id)
            .values(is_read=True)
            .returning(Alert)
        )
        await self.db.flush()
        return result.scalar_one_or_none()
