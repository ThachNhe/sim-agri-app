from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import CurrentUser
from app.schemas.base_response import BaseResponse
from app.schemas.alert import AlertResponse
from app.services.alert import AlertService

router = APIRouter(prefix="/alerts", tags=["Alerts"])


def get_alert_service(db: AsyncSession = Depends(get_db)) -> AlertService:
    return AlertService(db)


@router.get(
    "",
    response_model=BaseResponse[List[AlertResponse]],
    summary="Lấy danh sách cảnh báo",
)
async def get_alerts(
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
    service: AlertService = Depends(get_alert_service),
):
    data = await service.get_alerts(current_user, skip, limit)
    return BaseResponse.ok(data=data)


@router.patch(
    "/{alert_id}/read",
    response_model=BaseResponse[AlertResponse],
    summary="Đánh dấu đã đọc",
)
async def mark_as_read(
    alert_id: UUID,
    current_user: CurrentUser,
    service: AlertService = Depends(get_alert_service),
):
    data = await service.mark_as_read(alert_id, current_user)
    return BaseResponse.ok(data=data, message="Đã đánh dấu đọc")
