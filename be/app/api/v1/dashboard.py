from datetime import datetime, timedelta, timezone
from uuid import UUID
from pydantic import BaseModel
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.dependencies.auth import CurrentUser
from app.schemas.base_response import BaseResponse
from app.models.device import Device
from app.models.alert import Alert
from app.models.sensor_reading import SensorReading
from app.constants.enums import UserRole

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


class DashboardSummary(BaseModel):
    total_devices: int
    alerts_today: int
    avg_temperature: float | None
    avg_humidity: float | None


@router.get(
    "/summary",
    response_model=BaseResponse[DashboardSummary],
    summary="Lấy thống kê dashboard",
)
async def get_dashboard_summary(
    current_user: CurrentUser,
    owner_id: UUID | None = None,
    db: AsyncSession = Depends(get_db),
):
    target_owner_id = owner_id if current_user.role == UserRole.ADMIN else current_user.id

    # Base query for devices
    devices_q = select(func.count(Device.id))
    
    # Base query for alerts today
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    alerts_q = select(func.count(Alert.id)).where(Alert.triggered_at >= today_start)
    
    # Query for avg temp/humidity for the last 24 hours
    yesterday = datetime.now(timezone.utc) - timedelta(days=1)
    readings_q = select(
        func.avg(SensorReading.temperature).label("avg_temp"),
        func.avg(SensorReading.humidity).label("avg_hum")
    ).where(SensorReading.recorded_at >= yesterday)

    if target_owner_id is not None:
        devices_q = devices_q.where(Device.owner_id == target_owner_id)
        alerts_q = alerts_q.join(Device).where(Device.owner_id == target_owner_id)
        readings_q = readings_q.join(Device).where(Device.owner_id == target_owner_id)

    total_devices = (await db.execute(devices_q)).scalar() or 0
    alerts_today = (await db.execute(alerts_q)).scalar() or 0
    readings_res = (await db.execute(readings_q)).first()
    
    avg_temperature = float(readings_res.avg_temp) if readings_res and readings_res.avg_temp is not None else None
    avg_humidity = float(readings_res.avg_hum) if readings_res and readings_res.avg_hum is not None else None

    data = DashboardSummary(
        total_devices=total_devices,
        alerts_today=alerts_today,
        avg_temperature=avg_temperature,
        avg_humidity=avg_humidity,
    )
    return BaseResponse.ok(data=data)
