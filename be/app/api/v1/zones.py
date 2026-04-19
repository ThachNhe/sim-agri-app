from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import CurrentUser
from app.schemas.base_response import BaseResponse
from app.schemas.growing_zone import GrowingZoneCreate, GrowingZoneUpdate, GrowingZoneResponse
from app.services.growing_zone import GrowingZoneService

router = APIRouter(prefix="/zones", tags=["Growing Zones"])


def get_service(db: AsyncSession = Depends(get_db)) -> GrowingZoneService:
    return GrowingZoneService(db)


@router.get(
    "",
    response_model=BaseResponse[List[GrowingZoneResponse]],
    summary="Danh sách khu vực trồng trọt",
)
async def list_zones(
    current_user: CurrentUser,
    owner_id: UUID | None = None,
    service: GrowingZoneService = Depends(get_service),
):
    data = await service.list_zones(current_user, owner_id)
    return BaseResponse.ok(data=data)


@router.get(
    "/{zone_id}",
    response_model=BaseResponse[GrowingZoneResponse],
    summary="Chi tiết khu vực trồng trọt",
)
async def get_zone(
    zone_id: UUID,
    current_user: CurrentUser,
    service: GrowingZoneService = Depends(get_service),
):
    data = await service.get_zone(zone_id, current_user)
    return BaseResponse.ok(data=data)


@router.post(
    "",
    response_model=BaseResponse[GrowingZoneResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Thêm khu vực trồng trọt mới",
)
async def create_zone(
    payload: GrowingZoneCreate,
    current_user: CurrentUser,
    service: GrowingZoneService = Depends(get_service),
):
    data = await service.create_zone(payload, current_user)
    return BaseResponse.ok(data=data, message="Thêm khu vực trồng trọt thành công")


@router.put(
    "/{zone_id}",
    response_model=BaseResponse[GrowingZoneResponse],
    summary="Cập nhật khu vực trồng trọt",
)
async def update_zone(
    zone_id: UUID,
    payload: GrowingZoneUpdate,
    current_user: CurrentUser,
    service: GrowingZoneService = Depends(get_service),
):
    data = await service.update_zone(zone_id, payload, current_user)
    return BaseResponse.ok(data=data, message="Cập nhật khu vực thành công")


@router.delete(
    "/{zone_id}",
    response_model=BaseResponse,
    summary="Xóa khu vực trồng trọt",
)
async def delete_zone(
    zone_id: UUID,
    current_user: CurrentUser,
    service: GrowingZoneService = Depends(get_service),
):
    await service.delete_zone(zone_id, current_user)
    return BaseResponse.ok(message="Xóa khu vực trồng trọt thành công")
