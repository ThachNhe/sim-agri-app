from pydantic import BaseModel, EmailStr, field_validator

from app.constants.enums import UserStatus


class CreateFarmerRequest(BaseModel):
    full_name: str
    email: EmailStr

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 2:
            raise ValueError("Họ tên phải có ít nhất 2 ký tự")
        return value


class UpdateUserStatusRequest(BaseModel):
    status: UserStatus