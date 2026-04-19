from fastapi import APIRouter

from .auth import router as auth_router
from .plant_profiles import router as plant_profiles_router
from .zones import router as zones_router
from .sensors import router as sensors_router
from .actuators import router as actuators_router
from .readings import router as readings_router
from .alerts import router as alerts_router
from .dashboard import router as dashboard_router
from .admin import router as admin_router

router = APIRouter(prefix="/v1")
router.include_router(auth_router)
router.include_router(plant_profiles_router)
router.include_router(zones_router)
router.include_router(sensors_router)
router.include_router(actuators_router)
router.include_router(readings_router)
router.include_router(alerts_router)
router.include_router(dashboard_router)
router.include_router(admin_router)
