from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.constants.messages import SuccessMessage
from app.core.database import get_db
from app.core.settings import settings
from app.dependencies.auth import CurrentUser
from app.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    UserResponse,
)
from app.schemas.base_response import BaseResponse
from app.services.auth import AuthService

router = APIRouter(prefix="/auth", tags=["Auth"])


def get_auth_service(db: AsyncSession = Depends(get_db)) -> AuthService:
    return AuthService(db)


def _set_token_cookies(response: Response, access_token: str):
    """Set access_token as HttpOnly cookie (7 days)."""
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        max_age=7 * 24 * 60 * 60,  # 7 days
        path="/",
    )


def _clear_token_cookies(response: Response):
    """Clear auth cookies."""
    response.delete_cookie(key="access_token", path="/")


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
    response: Response,
    service: AuthService = Depends(get_auth_service),
):
    data = await service.login(payload)
    _set_token_cookies(response, data.tokens.access_token)
    # Only return user info, tokens are in cookies
    return BaseResponse.ok(
        data=LoginResponse(user=data.user),
        message=SuccessMessage.LOGIN_SUCCESS,
    )


@router.post(
    "/logout",
    response_model=BaseResponse,
    summary="Đăng xuất",
)
async def logout(response: Response):
    _clear_token_cookies(response)
    return BaseResponse.ok(message="Đăng xuất thành công")


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
