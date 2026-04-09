from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, status

from app.dependencies.auth import CurrentUser
from app.constants.enums import UserRole, UserStatus
from app.core.exception import ForbiddenException
from app.constants.messages import SuccessMessage
from app.core.database import get_db
from app.schemas.admin import CreateFarmerRequest, UpdateUserStatusRequest
from app.schemas.auth import UserResponse
from app.schemas.base_response import BaseResponse
from app.services.admin import AdminUserService
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/admin", tags=["Admin"])


def get_admin_service(db: AsyncSession = Depends(get_db)) -> AdminUserService:
    return AdminUserService(db)


def _require_admin(current_user: CurrentUser) -> None:
    if current_user.role != UserRole.ADMIN:
        raise ForbiddenException("Chỉ admin mới có quyền này")


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
