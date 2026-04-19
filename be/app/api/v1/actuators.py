from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import CurrentUser
from app.schemas.base_response import BaseResponse
from app.schemas.actuator import (
    ActuatorCreate, ActuatorUpdate, ActuatorResponse,
    ActuatorCommandRequest, ActuatorCommandResponse,
)
from app.services.actuator import ActuatorService

router = APIRouter(prefix="/actuators", tags=["Actuators"])


def get_service(db: AsyncSession = Depends(get_db)) -> ActuatorService:
    return ActuatorService(db)


@router.get(
    "",
    response_model=BaseResponse[List[ActuatorResponse]],
    summary="Danh sách thiết bị điều chỉnh theo khu vực",
)
async def list_actuators(
    zone_id: UUID,
    current_user: CurrentUser,
    service: ActuatorService = Depends(get_service),
):
    data = await service.list_actuators(zone_id, current_user)
    return BaseResponse.ok(data=data)


@router.post(
    "",
    response_model=BaseResponse[ActuatorResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Thêm thiết bị điều chỉnh vào khu vực",
)
async def create_actuator(
    payload: ActuatorCreate,
    current_user: CurrentUser,
    service: ActuatorService = Depends(get_service),
):
    data = await service.create_actuator(payload, current_user)
    return BaseResponse.ok(data=data, message="Thêm thiết bị điều chỉnh thành công")


@router.patch(
    "/{actuator_id}",
    response_model=BaseResponse[ActuatorResponse],
    summary="Cập nhật thiết bị điều chỉnh",
)
async def update_actuator(
    actuator_id: UUID,
    payload: ActuatorUpdate,
    current_user: CurrentUser,
    service: ActuatorService = Depends(get_service),
):
    data = await service.update_actuator(actuator_id, payload, current_user)
    return BaseResponse.ok(data=data, message="Cập nhật thành công")


@router.delete(
    "/{actuator_id}",
    response_model=BaseResponse,
    summary="Xóa thiết bị điều chỉnh",
)
async def delete_actuator(
    actuator_id: UUID,
    current_user: CurrentUser,
    service: ActuatorService = Depends(get_service),
):
    await service.delete_actuator(actuator_id, current_user)
    return BaseResponse.ok(message="Xóa thiết bị thành công")


@router.post(
    "/{actuator_id}/command",
    response_model=BaseResponse[ActuatorCommandResponse],
    summary="Gửi lệnh điều khiển thiết bị (Bật/Tắt tưới nước, bơm phân, ...)",
)
async def send_command(
    actuator_id: UUID,
    payload: ActuatorCommandRequest,
    current_user: CurrentUser,
    service: ActuatorService = Depends(get_service),
):
    data = await service.send_command(actuator_id, payload, current_user)
    action = "Bật" if payload.command.value == "on" else "Tắt"
    return BaseResponse.ok(data=data, message=f"{action} thiết bị thành công")


@router.get(
    "/{actuator_id}/commands",
    response_model=BaseResponse[List[ActuatorCommandResponse]],
    summary="Lịch sử lệnh điều khiển",
)
async def get_commands(
    actuator_id: UUID,
    current_user: CurrentUser,
    service: ActuatorService = Depends(get_service),
):
    data = await service.get_commands(actuator_id, current_user)
    return BaseResponse.ok(data=data)
