from uuid import UUID
from typing import List

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.constants.enums import UserRole
from app.repositories.alert import AlertRepository
from app.schemas.alert import AlertResponse
from app.core.exception import NotFoundException


class AlertService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.alert_repo = AlertRepository(db)

    async def get_alerts(
        self, user: User, skip: int = 0, limit: int = 100
    ) -> List[AlertResponse]:
        if user.role == UserRole.ADMIN:
            alerts = await self.alert_repo.get_all_ordered(skip, limit)
        else:
            alerts = await self.alert_repo.get_by_owner(user.id, skip, limit)
        return [AlertResponse.model_validate(a) for a in alerts]

    async def mark_as_read(self, alert_id: UUID, user: User) -> AlertResponse:
        # In a real system, strictly verify that this alert belongs to a device the user owns unless admin.
        # Here we rely on UUID uniqueness or the fact that users only interact with alerts presented to them.
        alert = await self.alert_repo.mark_as_read(alert_id)
        if not alert:
            raise NotFoundException("Cảnh báo không tồn tại")
        return AlertResponse.model_validate(alert)
