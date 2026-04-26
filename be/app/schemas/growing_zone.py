from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime, date
from typing import List


class GrowingZoneBase(BaseModel):
    name: str
    description: str | None = None
    location: str | None = None
    area_sqm: float | None = None
    plant_profile_id: UUID | None = None
    planting_date: date | None = None
    expected_harvest_date: date | None = None


class GrowingZoneCreate(GrowingZoneBase):
    pass


class GrowingZoneUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    location: str | None = None
    area_sqm: float | None = None
    plant_profile_id: UUID | None = None
    is_active: bool | None = None
    planting_date: date | None = None
    expected_harvest_date: date | None = None


class GrowingZoneResponse(GrowingZoneBase):
    id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AssignedFarmerBrief(BaseModel):
    id: UUID
    full_name: str | None = None
    email: str

    model_config = ConfigDict(from_attributes=True)


class GrowingZoneAdminResponse(GrowingZoneResponse):
    assigned_farmers: List[AssignedFarmerBrief] = []
