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

    async def get_all_ordered(self, skip: int = 0, limit: int = 100) -> List[Alert]:
        result = await self.db.execute(
            select(Alert)
            .order_by(Alert.triggered_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

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
