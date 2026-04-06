from typing import List
from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import CurrentUser
from app.schemas.base_response import BaseResponse
from app.schemas.sensor_reading import SensorReadingResponse
from app.services.sensor_reading import SensorReadingService

router = APIRouter(prefix="/readings", tags=["Sensor Readings"])


def get_reading_service(db: AsyncSession = Depends(get_db)) -> SensorReadingService:
    return SensorReadingService(db)


@router.get(
    "",
    response_model=BaseResponse[List[SensorReadingResponse]],
    summary="Lấy dữ liệu cảm biến",
)
async def get_readings(
    device_id: UUID,
    from_date: datetime,
    to_date: datetime,
    current_user: CurrentUser,
    service: SensorReadingService = Depends(get_reading_service),
):
    data = await service.get_readings(device_id, from_date, to_date, current_user)
    return BaseResponse.ok(data=data)
