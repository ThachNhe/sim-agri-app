from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.constants.enums import TokenType, UserRole
from app.constants.messages import ErrorMessage
from app.core.database import get_db
from app.core.exception import ForbiddenException, UnauthorizedException
from app.models.user import User
from app.repositories.user import UserRepository
from app.utils.security import decode_token
from sqlalchemy.ext.asyncio import AsyncSession

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    if not credentials:
        raise UnauthorizedException(ErrorMessage.UNAUTHORIZED)

    token_data = decode_token(credentials.credentials)

    if not token_data or token_data.get("type") != TokenType.ACCESS:
        raise UnauthorizedException(ErrorMessage.TOKEN_INVALID)

    user_repo = UserRepository(db)
    user = await user_repo.get_by_id(token_data["sub"])

    if not user:
        raise UnauthorizedException(ErrorMessage.USER_NOT_FOUND)

    return user


# ── Typed aliases ─────────────────────────────────────────────────────────────

CurrentUser = Annotated[User, Depends(get_current_user)]


def require_role(*roles: UserRole):
    """Dependency factory — dùng như: Depends(require_role(UserRole.ADMIN))"""

    async def _check(current_user: CurrentUser) -> User:
        if current_user.role not in roles:
            raise ForbiddenException(ErrorMessage.FORBIDDEN)
        return current_user

    return _check


AdminOnly = Depends(require_role(UserRole.ADMIN))
