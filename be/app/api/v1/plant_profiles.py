from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import CurrentUser
from app.constants.enums import UserRole
from app.core.exception import ForbiddenException
from app.schemas.base_response import BaseResponse
from app.schemas.plant_profile import PlantProfileCreate, PlantProfileUpdate, PlantProfileResponse
from app.services.plant_profile import PlantProfileService

router = APIRouter(prefix="/plant-profiles", tags=["Plant Profiles"])


def get_service(db: AsyncSession = Depends(get_db)) -> PlantProfileService:
    return PlantProfileService(db)


@router.get(
    "",
    response_model=BaseResponse[List[PlantProfileResponse]],
    summary="Danh sách hồ sơ cây trồng",
)
async def list_profiles(
    current_user: CurrentUser,
    service: PlantProfileService = Depends(get_service),
):
    data = await service.list_profiles()
    return BaseResponse.ok(data=data)


@router.get(
    "/{profile_id}",
    response_model=BaseResponse[PlantProfileResponse],
    summary="Chi tiết hồ sơ cây trồng",
)
async def get_profile(
    profile_id: UUID,
    current_user: CurrentUser,
    service: PlantProfileService = Depends(get_service),
):
    data = await service.get_profile(profile_id)
    return BaseResponse.ok(data=data)


@router.post(
    "",
    response_model=BaseResponse[PlantProfileResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Tạo hồ sơ cây trồng (Admin)",
)
async def create_profile(
    payload: PlantProfileCreate,
    current_user: CurrentUser,
    service: PlantProfileService = Depends(get_service),
):
    if current_user.role != UserRole.ADMIN:
        raise ForbiddenException("Chỉ admin mới có quyền tạo hồ sơ cây trồng")
    data = await service.create_profile(payload)
    return BaseResponse.ok(data=data, message="Tạo hồ sơ cây trồng thành công")


@router.put(
    "/{profile_id}",
    response_model=BaseResponse[PlantProfileResponse],
    summary="Cập nhật hồ sơ cây trồng (Admin)",
)
async def update_profile(
    profile_id: UUID,
    payload: PlantProfileUpdate,
    current_user: CurrentUser,
    service: PlantProfileService = Depends(get_service),
):
    if current_user.role != UserRole.ADMIN:
        raise ForbiddenException("Chỉ admin mới có quyền cập nhật hồ sơ cây trồng")
    data = await service.update_profile(profile_id, payload)
    return BaseResponse.ok(data=data, message="Cập nhật hồ sơ thành công")


@router.delete(
    "/{profile_id}",
    response_model=BaseResponse,
    summary="Xóa hồ sơ cây trồng (Admin)",
)
async def delete_profile(
    profile_id: UUID,
    current_user: CurrentUser,
    service: PlantProfileService = Depends(get_service),
):
    if current_user.role != UserRole.ADMIN:
        raise ForbiddenException("Chỉ admin mới có quyền xóa hồ sơ cây trồng")
    await service.delete_profile(profile_id)
    return BaseResponse.ok(message="Xóa hồ sơ cây trồng thành công")
