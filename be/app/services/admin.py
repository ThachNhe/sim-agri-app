from uuid import UUID
from typing import List

from sqlalchemy.ext.asyncio import AsyncSession

from app.constants.enums import UserRole, UserStatus
from app.constants.messages import ErrorMessage
from app.core.exception import ConflictException, ForbiddenException, NotFoundException
from app.models.growing_zone import GrowingZone
from app.models.user import User
from app.repositories.user import UserRepository
from app.repositories.growing_zone import GrowingZoneRepository
from app.schemas.admin import AdminCreateZoneRequest, AssignFarmerRequest, CreateFarmerRequest, UpdateUserStatusRequest
from app.schemas.auth import UserResponse
from app.schemas.growing_zone import AssignedFarmerBrief, GrowingZoneAdminResponse, GrowingZoneResponse
from app.utils.email import send_farmer_credentials_email
from app.utils.security import generate_random_password, hash_password


class AdminUserService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)
        self.zone_repo = GrowingZoneRepository(db)

    # ── Farmer management ─────────────────────────────────────────────────

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

    # ── Zone management ───────────────────────────────────────────────────

    async def list_zones(self) -> List[GrowingZoneAdminResponse]:
        zones = await self.zone_repo.get_all_ordered()
        result = []
        for zone in zones:
            farmers = await self.zone_repo.get_assigned_farmers(zone.id)
            resp = GrowingZoneAdminResponse.model_validate(zone)
            resp.assigned_farmers = [AssignedFarmerBrief.model_validate(f) for f in farmers]
            result.append(resp)
        return result

    async def create_zone(self, payload: AdminCreateZoneRequest) -> GrowingZoneAdminResponse:
        zone = GrowingZone(**payload.model_dump())
        zone = await self.zone_repo.create(zone)
        resp = GrowingZoneAdminResponse.model_validate(zone)
        resp.assigned_farmers = []
        return resp

    async def update_zone(self, zone_id: UUID, payload) -> GrowingZoneAdminResponse:
        zone = await self.zone_repo.get_by_id(zone_id)
        if not zone:
            raise NotFoundException("Khu vực trồng trọt không tồn tại")
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(zone, field, value)
        await self.db.flush()
        await self.db.refresh(zone)
        farmers = await self.zone_repo.get_assigned_farmers(zone.id)
        resp = GrowingZoneAdminResponse.model_validate(zone)
        resp.assigned_farmers = [AssignedFarmerBrief.model_validate(f) for f in farmers]
        return resp

    async def delete_zone(self, zone_id: UUID) -> None:
        zone = await self.zone_repo.get_by_id(zone_id)
        if not zone:
            raise NotFoundException("Khu vực trồng trọt không tồn tại")
        await self.zone_repo.delete(zone)

    # ── Farmer assignment ─────────────────────────────────────────────────

    async def assign_farmer(self, zone_id: UUID, payload: AssignFarmerRequest) -> GrowingZoneAdminResponse:
        zone = await self.zone_repo.get_by_id(zone_id)
        if not zone:
            raise NotFoundException("Khu vực trồng trọt không tồn tại")

        farmer = await self.user_repo.get_by_id(payload.farmer_id)
        if not farmer or farmer.role != UserRole.USER:
            raise NotFoundException("Nông dân không tồn tại")

        already_assigned = await self.zone_repo.is_farmer_assigned(zone_id, payload.farmer_id)
        if already_assigned:
            raise ConflictException("Nông dân đã được phân công khu vực này rồi")

        await self.zone_repo.assign_farmer(zone_id, payload.farmer_id)

        farmers = await self.zone_repo.get_assigned_farmers(zone.id)
        resp = GrowingZoneAdminResponse.model_validate(zone)
        resp.assigned_farmers = [AssignedFarmerBrief.model_validate(f) for f in farmers]
        return resp

    async def unassign_farmer(self, zone_id: UUID, farmer_id: UUID) -> GrowingZoneAdminResponse:
        zone = await self.zone_repo.get_by_id(zone_id)
        if not zone:
            raise NotFoundException("Khu vực trồng trọt không tồn tại")

        removed = await self.zone_repo.unassign_farmer(zone_id, farmer_id)
        if not removed:
            raise NotFoundException("Nông dân chưa được phân công khu vực này")

        farmers = await self.zone_repo.get_assigned_farmers(zone.id)
        resp = GrowingZoneAdminResponse.model_validate(zone)
        resp.assigned_farmers = [AssignedFarmerBrief.model_validate(f) for f in farmers]
        return resp

    async def get_zone_farmers(self, zone_id: UUID) -> List[AssignedFarmerBrief]:
        zone = await self.zone_repo.get_by_id(zone_id)
        if not zone:
            raise NotFoundException("Khu vực trồng trọt không tồn tại")
        farmers = await self.zone_repo.get_assigned_farmers(zone_id)
        return [AssignedFarmerBrief.model_validate(f) for f in farmers]
