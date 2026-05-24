from typing import List
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.growing_zone import GrowingZone
from app.models.user import User
from app.constants.enums import UserRole
from app.repositories.growing_zone import GrowingZoneRepository
from app.schemas.growing_zone import GrowingZoneCreate, GrowingZoneUpdate, GrowingZoneResponse
from app.core.exception import NotFoundException, ForbiddenException


class GrowingZoneService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = GrowingZoneRepository(db)

    async def list_zones(self, user: User) -> List[GrowingZoneResponse]:
        if user.role == UserRole.ADMIN:
            zones = await self.repo.get_all_ordered()
        else:
            zones = await self.repo.get_by_farmer(user.id)
        return [GrowingZoneResponse.model_validate(z) for z in zones]

    async def get_zone(self, zone_id: UUID, user: User) -> GrowingZoneResponse:
        zone = await self._get_and_check(zone_id, user)
        return GrowingZoneResponse.model_validate(zone)

    async def create_zone(self, payload: GrowingZoneCreate, user: User) -> GrowingZoneResponse:
        if user.role != UserRole.ADMIN:
            raise ForbiddenException("Chỉ admin mới có quyền tạo khu vực trồng trọt")
        zone = GrowingZone(**payload.model_dump())
        zone = await self.repo.create(zone)
        return GrowingZoneResponse.model_validate(zone)

    async def update_zone(self, zone_id: UUID, payload: GrowingZoneUpdate, user: User) -> GrowingZoneResponse:
        if user.role != UserRole.ADMIN:
            raise ForbiddenException("Chỉ admin mới có quyền cập nhật khu vực trồng trọt")
        zone = await self._get_and_check(zone_id, user)
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(zone, field, value)
        await self.db.flush()
        await self.db.refresh(zone)
        return GrowingZoneResponse.model_validate(zone)

    async def delete_zone(self, zone_id: UUID, user: User) -> None:
        if user.role != UserRole.ADMIN:
            raise ForbiddenException("Chỉ admin mới có quyền xóa khu vực trồng trọt")
        zone = await self.repo.get_by_id(zone_id)
        if not zone:
            raise NotFoundException("Khu vực trồng trọt không tồn tại")
        await self.repo.delete(zone)

    async def _get_and_check(self, zone_id: UUID, user: User) -> GrowingZone:
        zone = await self.repo.get_by_id(zone_id)
        if not zone:
            raise NotFoundException("Khu vực trồng trọt không tồn tại")
        if user.role != UserRole.ADMIN:
            assigned = await self.repo.is_farmer_assigned(zone_id, user.id)
            if not assigned:
                raise ForbiddenException("Bạn không có quyền truy cập khu vực này")
        return zone
