from typing import List
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.plant_profile import PlantProfile
from app.repositories.plant_profile import PlantProfileRepository
from app.schemas.plant_profile import PlantProfileCreate, PlantProfileUpdate, PlantProfileResponse
from app.core.exception import NotFoundException, BadRequestException


class PlantProfileService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = PlantProfileRepository(db)

    async def list_profiles(self) -> List[PlantProfileResponse]:
        profiles = await self.repo.get_all_ordered()
        return [PlantProfileResponse.model_validate(p) for p in profiles]

    async def get_profile(self, profile_id: UUID) -> PlantProfileResponse:
        profile = await self.repo.get_by_id(profile_id)
        if not profile:
            raise NotFoundException("Không tìm thấy hồ sơ cây trồng")
        return PlantProfileResponse.model_validate(profile)

    async def create_profile(self, payload: PlantProfileCreate) -> PlantProfileResponse:
        existing = await self.repo.get_by_name(payload.name)
        if existing:
            raise BadRequestException(f"Đã tồn tại hồ sơ cây trồng tên '{payload.name}'")
        profile = PlantProfile(**payload.model_dump())
        profile = await self.repo.create(profile)
        return PlantProfileResponse.model_validate(profile)

    async def update_profile(self, profile_id: UUID, payload: PlantProfileUpdate) -> PlantProfileResponse:
        profile = await self.repo.get_by_id(profile_id)
        if not profile:
            raise NotFoundException("Không tìm thấy hồ sơ cây trồng")
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(profile, field, value)
        await self.db.flush()
        await self.db.refresh(profile)
        return PlantProfileResponse.model_validate(profile)

    async def delete_profile(self, profile_id: UUID) -> None:
        profile = await self.repo.get_by_id(profile_id)
        if not profile:
            raise NotFoundException("Không tìm thấy hồ sơ cây trồng")
        await self.repo.delete(profile)
