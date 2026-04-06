from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError


class AppException(Exception):
    def __init__(
        self,
        status_code: int,
        message: str,
        error_code: str = None,
    ):
        self.status_code = status_code
        self.message = message
        self.error_code = error_code
        super().__init__(message)


class NotFoundException(AppException):
    def __init__(self, message: str = "Không tìm thấy dữ liệu"):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, message=message)


class UnauthorizedException(AppException):
    def __init__(self, message: str = "Unauthorized"):
        super().__init__(status_code=status.HTTP_401_UNAUTHORIZED, message=message)


class ForbiddenException(AppException):
    def __init__(self, message: str = "Forbidden"):
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, message=message)


class BadRequestException(AppException):
    def __init__(self, message: str = "Bad request"):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, message=message)


class ConflictException(AppException):
    def __init__(self, message: str = "Conflict"):
        super().__init__(status_code=status.HTTP_409_CONFLICT, message=message)


# ── Handlers ──────────────────────────────────────────────────────────────────

async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.message,
            "error_code": exc.error_code,
        },
    )


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    errors = [
        {"field": ".".join(str(l) for l in e["loc"][1:]), "message": e["msg"]}
        for e in exc.errors()
    ]
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"success": False, "message": "Dữ liệu không hợp lệ", "errors": errors},
    )


async def sqlalchemy_exception_handler(
    request: Request, exc: SQLAlchemyError
) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"success": False, "message": "Lỗi cơ sở dữ liệu"},
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"success": False, "message": "Lỗi hệ thống, vui lòng thử lại sau"},
    )
