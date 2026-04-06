from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.dependencies.auth import CurrentUser
from app.schemas.base_response import BaseResponse
from app.schemas.auth import UserResponse
from app.models.user import User
from app.constants.enums import UserRole
from app.core.exception import ForbiddenException

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get(
    "/users",
    response_model=BaseResponse[List[UserResponse]],
    summary="Lấy danh sách tài khoản (Admin)",
)
async def get_all_users(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    if current_user.role != UserRole.ADMIN:
        raise ForbiddenException("Chỉ admin mới có quyền này")
        
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    users = result.scalars().all()
    
    return BaseResponse.ok(data=[UserResponse.model_validate(u) for u in users])
