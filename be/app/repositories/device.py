from typing import List
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.device import Device
from app.models.sensor import Sensor
from app.repositories.base import BaseRepository


class DeviceRepository(BaseRepository[Device]):
    def __init__(self, db: AsyncSession):
        super().__init__(Device, db)

    async def get_by_owner(self, owner_id: UUID) -> List[Device]:
        return await self.get_by_owner_ordered(owner_id)

    async def get_by_id(self, id) -> Device | None:
        result = await self.db.execute(
            select(Device)
            .options(selectinload(Device.linked_sensor).selectinload(Sensor.zone))
            .where(Device.id == id)
        )
        return result.scalar_one_or_none()

    async def get_all_ordered(self) -> List[Device]:
        result = await self.db.execute(
            select(Device)
            .options(selectinload(Device.linked_sensor).selectinload(Sensor.zone))
            .order_by(Device.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_by_owner_ordered(self, owner_id: UUID) -> List[Device]:
        result = await self.db.execute(
            select(Device)
            .options(selectinload(Device.linked_sensor).selectinload(Sensor.zone))
            .where(Device.owner_id == owner_id)
            .order_by(Device.created_at.desc())
        )
        return list(result.scalars().all())
