from fastapi import APIRouter

from .auth import router as auth_router
from .devices import router as devices_router
from .readings import router as readings_router
from .alerts import router as alerts_router
from .dashboard import router as dashboard_router
from .admin import router as admin_router

router = APIRouter(prefix="/v1")
router.include_router(auth_router)
router.include_router(devices_router)
router.include_router(readings_router)
router.include_router(alerts_router)
router.include_router(dashboard_router)
router.include_router(admin_router)

# Thêm router mới vào đây khi mở rộng:
# from app.api.v1 import users, products
# router.include_router(users.router)
