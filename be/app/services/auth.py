from sqlalchemy.ext.asyncio import AsyncSession

from app.constants.enums import TokenType, UserStatus
from app.constants.messages import ErrorMessage, SuccessMessage
from app.core.exception import (
    BadRequestException,
    ConflictException,
    UnauthorizedException,
)
from app.models.user import User
from app.repositories.user import UserRepository
from app.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    LoginResponse,
    RefreshTokenRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from app.utils.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)

    # ── Register ──────────────────────────────────────────────────────────────

    async def register(self, payload: RegisterRequest) -> UserResponse:
        if await self.user_repo.email_exists(payload.email):
            raise ConflictException(ErrorMessage.EMAIL_ALREADY_EXISTS)

        user = User(
            email=payload.email,
            hashed_password=hash_password(payload.password),
            full_name=payload.full_name,
        )
        user = await self.user_repo.create(user)
        return UserResponse.model_validate(user)

    # ── Login ─────────────────────────────────────────────────────────────────

    async def login(self, payload: LoginRequest) -> LoginResponse:
        user = await self.user_repo.get_by_email(payload.email)

        if not user or not verify_password(payload.password, user.hashed_password):
            raise UnauthorizedException(ErrorMessage.INVALID_CREDENTIALS)

        self._check_user_status(user)

        tokens = self._generate_tokens(user)
        return LoginResponse(user=UserResponse.model_validate(user), tokens=tokens)

    # ── Refresh token ─────────────────────────────────────────────────────────

    async def refresh_token(self, payload: RefreshTokenRequest) -> TokenResponse:
        token_data = decode_token(payload.refresh_token)

        if not token_data or token_data.get("type") != TokenType.REFRESH:
            raise UnauthorizedException(ErrorMessage.TOKEN_INVALID)

        user = await self.user_repo.get_by_id(token_data["sub"])
        if not user:
            raise UnauthorizedException(ErrorMessage.USER_NOT_FOUND)

        self._check_user_status(user)
        return self._generate_tokens(user)

    # ── Change password ───────────────────────────────────────────────────────

    async def change_password(
        self, user: User, payload: ChangePasswordRequest
    ) -> None:
        if not verify_password(payload.old_password, user.hashed_password):
            raise BadRequestException("Mật khẩu cũ không đúng")

        if payload.old_password == payload.new_password:
            raise BadRequestException("Mật khẩu mới phải khác mật khẩu cũ")

        user.hashed_password = hash_password(payload.new_password)
        await self.db.flush()

    # ── Me ────────────────────────────────────────────────────────────────────

    async def get_me(self, user: User) -> UserResponse:
        return UserResponse.model_validate(user)

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _check_user_status(self, user: User) -> None:
        if user.status == UserStatus.INACTIVE:
            raise UnauthorizedException(ErrorMessage.INACTIVE_USER)
        if user.status == UserStatus.BANNED:
            raise UnauthorizedException(ErrorMessage.BANNED_USER)

    def _generate_tokens(self, user: User) -> TokenResponse:
        access_token = create_access_token(
            subject=str(user.id),
            extra={"role": user.role, "email": user.email},
        )
        refresh_token = create_refresh_token(subject=str(user.id))
        return TokenResponse(access_token=access_token, refresh_token=refresh_token)
