from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.models.actuator import Actuator
from app.models.actuator_command import ActuatorCommand
from app.constants.enums import ActuatorState
from app.repositories.base import BaseRepository


class ActuatorRepository(BaseRepository[Actuator]):
    def __init__(self, db: AsyncSession):
        super().__init__(Actuator, db)

    async def get_by_zone(self, zone_id: UUID) -> List[Actuator]:
        result = await self.db.execute(
            select(Actuator)
            .where(Actuator.zone_id == zone_id)
            .order_by(Actuator.actuator_type.asc())
        )
        return list(result.scalars().all())

    async def update_state(self, actuator_id: UUID, state: ActuatorState) -> Optional[Actuator]:
        result = await self.db.execute(
            update(Actuator)
            .where(Actuator.id == actuator_id)
            .values(current_state=state)
            .returning(Actuator)
        )
        await self.db.flush()
        return result.scalar_one_or_none()

    async def get_commands(self, actuator_id: UUID, limit: int = 50) -> List[ActuatorCommand]:
        result = await self.db.execute(
            select(ActuatorCommand)
            .where(ActuatorCommand.actuator_id == actuator_id)
            .order_by(ActuatorCommand.executed_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())
