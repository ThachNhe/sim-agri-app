from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.constants.messages import SuccessMessage
from app.core.database import get_db
from app.dependencies.auth import CurrentUser
from app.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    LoginResponse,
    RefreshTokenRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from app.schemas.base_response import BaseResponse
from app.services.auth import AuthService

router = APIRouter(prefix="/auth", tags=["Auth"])


def get_auth_service(db: AsyncSession = Depends(get_db)) -> AuthService:
    return AuthService(db)


@router.post(
    "/register",
    response_model=BaseResponse[UserResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Đăng ký tài khoản",
)
async def register(
    payload: RegisterRequest,
    service: AuthService = Depends(get_auth_service),
):
    data = await service.register(payload)
    return BaseResponse.ok(data=data, message=SuccessMessage.REGISTER_SUCCESS)


@router.post(
    "/login",
    response_model=BaseResponse[LoginResponse],
    summary="Đăng nhập",
)
async def login(
    payload: LoginRequest,
    service: AuthService = Depends(get_auth_service),
):
    data = await service.login(payload)
    return BaseResponse.ok(data=data, message=SuccessMessage.LOGIN_SUCCESS)


@router.post(
    "/refresh",
    response_model=BaseResponse[TokenResponse],
    summary="Làm mới access token",
)
async def refresh_token(
    payload: RefreshTokenRequest,
    service: AuthService = Depends(get_auth_service),
):
    data = await service.refresh_token(payload)
    return BaseResponse.ok(data=data)


@router.get(
    "/me",
    response_model=BaseResponse[UserResponse],
    summary="Lấy thông tin cá nhân",
)
async def get_me(
    current_user: CurrentUser,
    service: AuthService = Depends(get_auth_service),
):
    data = await service.get_me(current_user)
    return BaseResponse.ok(data=data)


@router.put(
    "/change-password",
    response_model=BaseResponse,
    summary="Đổi mật khẩu",
)
async def change_password(
    payload: ChangePasswordRequest,
    current_user: CurrentUser,
    service: AuthService = Depends(get_auth_service),
):
    await service.change_password(current_user, payload)
    return BaseResponse.ok(message=SuccessMessage.PASSWORD_CHANGED)
