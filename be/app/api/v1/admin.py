from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, status

from app.dependencies.auth import CurrentUser
from app.constants.enums import UserRole, UserStatus
from app.core.exception import ForbiddenException
from app.constants.messages import SuccessMessage
from app.core.database import get_db
from app.schemas.admin import (
    AdminCreateZoneRequest,
    AssignFarmerRequest,
    CreateFarmerRequest,
    UpdateUserStatusRequest,
)
from app.schemas.auth import UserResponse
from app.schemas.growing_zone import AssignedFarmerBrief, GrowingZoneAdminResponse, GrowingZoneUpdate
from app.schemas.base_response import BaseResponse
from app.services.admin import AdminUserService
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/admin", tags=["Admin"])


def get_admin_service(db: AsyncSession = Depends(get_db)) -> AdminUserService:
    return AdminUserService(db)


def _require_admin(current_user: CurrentUser) -> None:
    if current_user.role != UserRole.ADMIN:
        raise ForbiddenException("Chỉ admin mới có quyền này")


# ── Farmer management ─────────────────────────────────────────────────────────

@router.get(
    "/users",
    response_model=BaseResponse[List[UserResponse]],
    summary="Lấy danh sách farmer (Admin)",
)
async def get_all_users(
    current_user: CurrentUser,
    service: AdminUserService = Depends(get_admin_service),
):
    _require_admin(current_user)
    return BaseResponse.ok(data=await service.list_users())


@router.post(
    "/users",
    response_model=BaseResponse[UserResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Tạo farmer mới",
)
async def create_farmer(
    payload: CreateFarmerRequest,
    current_user: CurrentUser,
    service: AdminUserService = Depends(get_admin_service),
):
    _require_admin(current_user)
    data = await service.create_farmer(payload)
    return BaseResponse.ok(
        data=data,
        message=f"{SuccessMessage.FARMER_CREATED}. Mật khẩu đã được gửi qua email.",
    )


@router.patch(
    "/users/{user_id}/status",
    response_model=BaseResponse[UserResponse],
    summary="Khóa hoặc mở khóa farmer",
)
async def update_user_status(
    user_id: UUID,
    payload: UpdateUserStatusRequest,
    current_user: CurrentUser,
    service: AdminUserService = Depends(get_admin_service),
):
    _require_admin(current_user)
    data = await service.update_user_status(user_id, payload)

    if payload.status == UserStatus.BANNED:
        message = "Khóa tài khoản thành công"
    else:
        message = "Mở khóa tài khoản thành công"

    return BaseResponse.ok(data=data, message=message)


# ── Zone management ────────────────────────────────────────────────────────────

@router.get(
    "/zones",
    response_model=BaseResponse[List[GrowingZoneAdminResponse]],
    summary="Danh sách tất cả khu vực trồng trọt (Admin)",
)
async def list_zones(
    current_user: CurrentUser,
    service: AdminUserService = Depends(get_admin_service),
):
    _require_admin(current_user)
    return BaseResponse.ok(data=await service.list_zones())


@router.post(
    "/zones",
    response_model=BaseResponse[GrowingZoneAdminResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Tạo khu vực trồng trọt mới (Admin)",
)
async def create_zone(
    payload: AdminCreateZoneRequest,
    current_user: CurrentUser,
    service: AdminUserService = Depends(get_admin_service),
):
    _require_admin(current_user)
    data = await service.create_zone(payload)
    return BaseResponse.ok(data=data, message="Tạo khu vực trồng trọt thành công")


@router.put(
    "/zones/{zone_id}",
    response_model=BaseResponse[GrowingZoneAdminResponse],
    summary="Cập nhật khu vực trồng trọt (Admin)",
)
async def update_zone(
    zone_id: UUID,
    payload: GrowingZoneUpdate,
    current_user: CurrentUser,
    service: AdminUserService = Depends(get_admin_service),
):
    _require_admin(current_user)
    data = await service.update_zone(zone_id, payload)
    return BaseResponse.ok(data=data, message="Cập nhật khu vực thành công")


@router.delete(
    "/zones/{zone_id}",
    response_model=BaseResponse,
    summary="Xóa khu vực trồng trọt (Admin)",
)
async def delete_zone(
    zone_id: UUID,
    current_user: CurrentUser,
    service: AdminUserService = Depends(get_admin_service),
):
    _require_admin(current_user)
    await service.delete_zone(zone_id)
    return BaseResponse.ok(message="Xóa khu vực trồng trọt thành công")


# ── Farmer assignment ─────────────────────────────────────────────────────────

@router.get(
    "/zones/{zone_id}/farmers",
    response_model=BaseResponse[List[AssignedFarmerBrief]],
    summary="Danh sách nông dân được phân công khu vực",
)
async def get_zone_farmers(
    zone_id: UUID,
    current_user: CurrentUser,
    service: AdminUserService = Depends(get_admin_service),
):
    _require_admin(current_user)
    data = await service.get_zone_farmers(zone_id)
    return BaseResponse.ok(data=data)


@router.post(
    "/zones/{zone_id}/farmers",
    response_model=BaseResponse[GrowingZoneAdminResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Phân công nông dân quản lý khu vực",
)
async def assign_farmer(
    zone_id: UUID,
    payload: AssignFarmerRequest,
    current_user: CurrentUser,
    service: AdminUserService = Depends(get_admin_service),
):
    _require_admin(current_user)
    data = await service.assign_farmer(zone_id, payload)
    return BaseResponse.ok(data=data, message="Phân công nông dân thành công")


@router.delete(
    "/zones/{zone_id}/farmers/{farmer_id}",
    response_model=BaseResponse[GrowingZoneAdminResponse],
    summary="Gỡ phân công nông dân khỏi khu vực",
)
async def unassign_farmer(
    zone_id: UUID,
    farmer_id: UUID,
    current_user: CurrentUser,
    service: AdminUserService = Depends(get_admin_service),
):
    _require_admin(current_user)
    data = await service.unassign_farmer(zone_id, farmer_id)
    return BaseResponse.ok(data=data, message="Gỡ phân công thành công")
