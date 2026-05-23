from uuid import UUID
from typing import List

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.alert import Alert
from app.models.user import User
from app.constants.enums import UserRole
from app.repositories.alert import AlertRepository
from app.schemas.alert import AlertResponse, AlertSummaryResponse
from app.core.exception import NotFoundException


class AlertService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.alert_repo = AlertRepository(db)

    async def get_alerts(
        self, user: User, skip: int = 0, limit: int | None = None, farmer_id: UUID | None = None
    ) -> List[AlertResponse]:
        if user.role == UserRole.ADMIN:
            if farmer_id is not None:
                alerts = await self.alert_repo.get_by_owner(farmer_id, skip, limit)
            else:
                alerts = await self.alert_repo.get_all_ordered(skip, limit)
        else:
            alerts = await self.alert_repo.get_by_owner(user.id, skip, limit)
        return [self._to_response(a) for a in alerts]

    async def get_summary(
        self, user: User, farmer_id: UUID | None = None
    ) -> AlertSummaryResponse:
        summary_farmer_id = farmer_id if user.role == UserRole.ADMIN else user.id
        total_alerts, read_alerts, auto_executed_alerts = await self.alert_repo.get_summary(summary_farmer_id)
        return AlertSummaryResponse(
            total_alerts=total_alerts,
            read_alerts=read_alerts,
            unread_alerts=max(total_alerts - read_alerts, 0),
            auto_executed_alerts=auto_executed_alerts,
        )

    async def mark_as_read(self, alert_id: UUID, user: User) -> AlertResponse:
        if user.role == UserRole.ADMIN:
            alert = await self.alert_repo.get_by_id(alert_id)
        else:
            alert = await self.alert_repo.get_by_owner_and_id(user.id, alert_id)

        if not alert:
            raise NotFoundException("Cảnh báo không tồn tại")

        updated_alert = await self.alert_repo.mark_as_read(alert_id)
        if not updated_alert:
            raise NotFoundException("Cảnh báo không tồn tại")

        return self._to_response(updated_alert)

    def _to_response(self, alert: Alert) -> AlertResponse:
        response = AlertResponse.model_validate(alert)
        if alert.zone is not None:
            response.zone_name = alert.zone.name
        if alert.sensor is not None:
            response.sensor_name = alert.sensor.name
            response.sensor_unit = alert.sensor.unit
        return response
