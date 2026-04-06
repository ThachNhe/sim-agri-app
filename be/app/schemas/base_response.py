from typing import Any, Generic, Optional, TypeVar
from pydantic import BaseModel

T = TypeVar("T")


class BaseResponse(BaseModel, Generic[T]):
    success: bool = True
    message: str = "Thành công"
    data: Optional[T] = None

    @classmethod
    def ok(cls, data: T = None, message: str = "Thành công") -> "BaseResponse[T]":
        return cls(success=True, message=message, data=data)

    @classmethod
    def fail(cls, message: str = "Thất bại") -> "BaseResponse[None]":
        return cls(success=False, message=message, data=None)


class PaginatedResponse(BaseModel, Generic[T]):
    success: bool = True
    message: str = "Thành công"
    data: list[T] = []
    total: int = 0
    page: int = 1
    page_size: int = 20
    total_pages: int = 0
