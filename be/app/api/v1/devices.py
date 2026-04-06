from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import CurrentUser
from app.schemas.base_response import BaseResponse
from app.schemas.device import DeviceCreate, DeviceUpdate, DeviceResponse
from app.services.device import DeviceService

router = APIRouter(prefix="/devices", tags=["Devices"])


def get_device_service(db: AsyncSession = Depends(get_db)) -> DeviceService:
    return DeviceService(db)


@router.post(
    "",
    response_model=BaseResponse[DeviceResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Thêm thiết bị mới",
)
async def create_device(
    payload: DeviceCreate,
    current_user: CurrentUser,
    service: DeviceService = Depends(get_device_service),
):
    data = await service.create_device(payload, current_user)
    return BaseResponse.ok(data=data, message="Thêm thiết bị thành công")


@router.get(
    "",
    response_model=BaseResponse[List[DeviceResponse]],
    summary="Lấy danh sách thiết bị",
)
async def get_devices(
    current_user: CurrentUser,
    service: DeviceService = Depends(get_device_service),
):
    data = await service.get_devices(current_user)
    return BaseResponse.ok(data=data)


@router.get(
    "/{device_id}",
    response_model=BaseResponse[DeviceResponse],
    summary="Lấy thông tin thiết bị",
)
async def get_device(
    device_id: UUID,
    current_user: CurrentUser,
    service: DeviceService = Depends(get_device_service),
):
    data = await service.get_device_by_id(device_id, current_user)
    return BaseResponse.ok(data=data)


@router.put(
    "/{device_id}",
    response_model=BaseResponse[DeviceResponse],
    summary="Cập nhật thiết bị",
)
async def update_device(
    device_id: UUID,
    payload: DeviceUpdate,
    current_user: CurrentUser,
    service: DeviceService = Depends(get_device_service),
):
    data = await service.update_device(device_id, payload, current_user)
    return BaseResponse.ok(data=data, message="Cập nhật thành công")


@router.delete(
    "/{device_id}",
    response_model=BaseResponse,
    summary="Xóa thiết bị",
)
async def delete_device(
    device_id: UUID,
    current_user: CurrentUser,
    service: DeviceService = Depends(get_device_service),
):
    await service.delete_device(device_id, current_user)
    return BaseResponse.ok(message="Xóa thành công")
