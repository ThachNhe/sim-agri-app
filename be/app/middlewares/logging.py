import time
import uuid
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.logger import logger


class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid.uuid4())[:8]
        start = time.perf_counter()

        logger.info(
            f"[{request_id}] --> {request.method} {request.url.path}"
            + (f"?{request.url.query}" if request.url.query else "")
        )

        response = await call_next(request)

        elapsed = (time.perf_counter() - start) * 1000
        logger.info(
            f"[{request_id}] <-- {response.status_code} ({elapsed:.1f}ms)"
        )

        response.headers["X-Request-ID"] = request_id
        return response
