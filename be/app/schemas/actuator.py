from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from app.constants.enums import ActuatorType, ActuatorState


class ActuatorBase(BaseModel):
    name: str
    actuator_type: ActuatorType
    zone_id: UUID


class ActuatorCreate(ActuatorBase):
    pass


class ActuatorUpdate(BaseModel):
    name: str | None = None
    is_active: bool | None = None


class ActuatorCommandRequest(BaseModel):
    command: ActuatorState
    duration_seconds: int | None = None
    reason: str | None = None


class ActuatorCommandResponse(BaseModel):
    id: UUID
    actuator_id: UUID
    commanded_by: UUID | None
    command: ActuatorState
    duration_seconds: int | None
    reason: str | None
    executed_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ActuatorResponse(ActuatorBase):
    id: UUID
    is_active: bool
    current_state: ActuatorState
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
