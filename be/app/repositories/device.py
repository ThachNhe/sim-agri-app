from typing import List
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.device import Device
from app.repositories.base import BaseRepository


class DeviceRepository(BaseRepository[Device]):
    def __init__(self, db: AsyncSession):
        super().__init__(Device, db)

    async def get_by_owner(self, owner_id: UUID) -> List[Device]:
        result = await self.db.execute(select(Device).where(Device.owner_id == owner_id))
        return list(result.scalars().all())
