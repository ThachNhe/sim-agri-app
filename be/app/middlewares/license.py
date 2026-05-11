from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.core.license import is_license_valid


class LicenseGateMiddleware(BaseHTTPMiddleware):
    """Chặn toàn bộ request khi license key không còn hợp lệ."""

    async def dispatch(self, request: Request, call_next):
        if not is_license_valid():
            return JSONResponse(
                {"detail": "Dịch vụ tạm ngưng. Vui lòng liên hệ nhà cung cấp."},
                status_code=503,
            )
        return await call_next(request)
