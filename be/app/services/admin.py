from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.constants.enums import UserRole, UserStatus
from app.constants.messages import ErrorMessage
from app.core.exception import ConflictException, ForbiddenException, NotFoundException
from app.models.user import User
from app.repositories.user import UserRepository
from app.schemas.admin import CreateFarmerRequest, UpdateUserStatusRequest
from app.schemas.auth import UserResponse
from app.utils.email import send_farmer_credentials_email
from app.utils.security import generate_random_password, hash_password


class AdminUserService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)

    async def list_users(self) -> list[UserResponse]:
        users = await self.user_repo.get_farmers_ordered()
        return [UserResponse.model_validate(user) for user in users]

    async def create_farmer(self, payload: CreateFarmerRequest) -> UserResponse:
        if await self.user_repo.email_exists(payload.email):
            raise ConflictException(ErrorMessage.EMAIL_ALREADY_EXISTS)

        temporary_password = generate_random_password()
        user = User(
            email=payload.email,
            full_name=payload.full_name,
            hashed_password=hash_password(temporary_password),
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
            is_verified=True,
        )
        user = await self.user_repo.create(user)

        await send_farmer_credentials_email(
            to_email=payload.email,
            full_name=payload.full_name,
            password=temporary_password,
        )

        return UserResponse.model_validate(user)

    async def update_user_status(
        self, user_id: UUID, payload: UpdateUserStatusRequest
    ) -> UserResponse:
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundException(ErrorMessage.NOT_FOUND)

        if user.role == UserRole.ADMIN:
            raise ForbiddenException("Không thể thay đổi trạng thái tài khoản admin")

        user.status = payload.status
        await self.db.flush()
        await self.db.refresh(user)
        return UserResponse.model_validate(user)