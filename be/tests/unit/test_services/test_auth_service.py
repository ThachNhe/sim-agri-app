import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.auth import AuthService
from app.schemas.auth import RegisterRequest, LoginRequest
from app.core.exception import ConflictException, UnauthorizedException
from app.constants.enums import UserRole, UserStatus

pytestmark = pytest.mark.asyncio


def make_mock_user(
    email="user@example.com",
    hashed_password=None,
    role=UserRole.USER,
    status=UserStatus.ACTIVE,
):
    from app.utils.security import hash_password
    user = MagicMock()
    user.id = "some-uuid"
    user.email = email
    user.hashed_password = hashed_password or hash_password("Test@1234")
    user.role = role
    user.status = status
    user.full_name = "Test User"
    user.is_verified = True
    return user


class TestRegisterService:
    async def test_register_success(self):
        db = AsyncMock()
        service = AuthService(db)
        service.user_repo = AsyncMock()
        service.user_repo.email_exists.return_value = False
        service.user_repo.create.return_value = make_mock_user()

        result = await service.register(
            RegisterRequest(email="user@example.com", password="Test@1234")
        )
        assert result.email == "user@example.com"

    async def test_register_duplicate_raises_conflict(self):
        db = AsyncMock()
        service = AuthService(db)
        service.user_repo = AsyncMock()
        service.user_repo.email_exists.return_value = True

        with pytest.raises(ConflictException):
            await service.register(
                RegisterRequest(email="dup@example.com", password="Test@1234")
            )


class TestLoginService:
    async def test_login_success(self):
        db = AsyncMock()
        service = AuthService(db)
        service.user_repo = AsyncMock()
        service.user_repo.get_by_email.return_value = make_mock_user()

        result = await service.login(
            LoginRequest(email="user@example.com", password="Test@1234")
        )
        assert result.tokens.access_token is not None

    async def test_login_wrong_password_raises(self):
        db = AsyncMock()
        service = AuthService(db)
        service.user_repo = AsyncMock()
        service.user_repo.get_by_email.return_value = make_mock_user()

        with pytest.raises(UnauthorizedException):
            await service.login(
                LoginRequest(email="user@example.com", password="wrong_password")
            )

    async def test_login_banned_user_raises(self):
        db = AsyncMock()
        service = AuthService(db)
        service.user_repo = AsyncMock()
        service.user_repo.get_by_email.return_value = make_mock_user(
            status=UserStatus.BANNED
        )

        with pytest.raises(UnauthorizedException):
            await service.login(
                LoginRequest(email="user@example.com", password="Test@1234")
            )
