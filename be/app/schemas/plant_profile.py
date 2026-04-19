from pydantic import BaseModel, ConfigDict, field_validator
from uuid import UUID
from datetime import datetime


class PlantProfileBase(BaseModel):
    name: str
    description: str | None = None

    temp_min: float
    temp_max: float
    humidity_min: float
    humidity_max: float
    soil_moisture_min: float
    soil_moisture_max: float

    light_min: float | None = None
    light_max: float | None = None
    ph_min: float | None = None
    ph_max: float | None = None
    ec_min: float | None = None
    ec_max: float | None = None

    growth_period_days: int | None = None

    @field_validator("temp_max")
    @classmethod
    def temp_max_gt_min(cls, v: float, info) -> float:
        if "temp_min" in info.data and v <= info.data["temp_min"]:
            raise ValueError("temp_max phải lớn hơn temp_min")
        return v

    @field_validator("humidity_max")
    @classmethod
    def humidity_max_gt_min(cls, v: float, info) -> float:
        if "humidity_min" in info.data and v <= info.data["humidity_min"]:
            raise ValueError("humidity_max phải lớn hơn humidity_min")
        return v

    @field_validator("soil_moisture_max")
    @classmethod
    def soil_max_gt_min(cls, v: float, info) -> float:
        if "soil_moisture_min" in info.data and v <= info.data["soil_moisture_min"]:
            raise ValueError("soil_moisture_max phải lớn hơn soil_moisture_min")
        return v


class PlantProfileCreate(PlantProfileBase):
    pass


class PlantProfileUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    temp_min: float | None = None
    temp_max: float | None = None
    humidity_min: float | None = None
    humidity_max: float | None = None
    soil_moisture_min: float | None = None
    soil_moisture_max: float | None = None
    light_min: float | None = None
    light_max: float | None = None
    ph_min: float | None = None
    ph_max: float | None = None
    ec_min: float | None = None
    ec_max: float | None = None
    growth_period_days: int | None = None


class PlantProfileResponse(PlantProfileBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
