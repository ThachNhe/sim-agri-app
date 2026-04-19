from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import CurrentUser
from app.schemas.base_response import BaseResponse
from app.schemas.sensor import SensorCreate, SensorUpdate, SensorResponse
from app.services.sensor import SensorService

router = APIRouter(prefix="/sensors", tags=["Sensors"])


def get_service(db: AsyncSession = Depends(get_db)) -> SensorService:
    return SensorService(db)


@router.get(
    "",
    response_model=BaseResponse[List[SensorResponse]],
    summary="Lấy danh sách cảm biến theo khu vực",
)
async def list_sensors(
    zone_id: UUID,
    current_user: CurrentUser,
    service: SensorService = Depends(get_service),
):
    data = await service.list_sensors(zone_id, current_user)
    return BaseResponse.ok(data=data)


@router.post(
    "",
    response_model=BaseResponse[SensorResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Thêm cảm biến vào khu vực",
)
async def create_sensor(
    payload: SensorCreate,
    current_user: CurrentUser,
    service: SensorService = Depends(get_service),
):
    data = await service.create_sensor(payload, current_user)
    return BaseResponse.ok(data=data, message="Thêm cảm biến thành công")


@router.patch(
    "/{sensor_id}",
    response_model=BaseResponse[SensorResponse],
    summary="Cập nhật cảm biến",
)
async def update_sensor(
    sensor_id: UUID,
    payload: SensorUpdate,
    current_user: CurrentUser,
    service: SensorService = Depends(get_service),
):
    data = await service.update_sensor(sensor_id, payload, current_user)
    return BaseResponse.ok(data=data, message="Cập nhật cảm biến thành công")


@router.delete(
    "/{sensor_id}",
    response_model=BaseResponse,
    summary="Xóa cảm biến",
)
async def delete_sensor(
    sensor_id: UUID,
    current_user: CurrentUser,
    service: SensorService = Depends(get_service),
):
    await service.delete_sensor(sensor_id, current_user)
    return BaseResponse.ok(message="Xóa cảm biến thành công")
