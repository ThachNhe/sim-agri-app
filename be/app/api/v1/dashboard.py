from datetime import datetime, timedelta, timezone
from uuid import UUID
from pydantic import BaseModel
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.dependencies.auth import CurrentUser
from app.schemas.base_response import BaseResponse
from app.models.growing_zone import GrowingZone
from app.models.farmer_zone_assignment import FarmerZoneAssignment
from app.models.alert import Alert
from app.models.sensor import Sensor
from app.models.sensor_reading import SensorReading
from app.constants.enums import UserRole, AlertSeverity

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


class ZoneHealthItem(BaseModel):
    zone_id: UUID
    zone_name: str
    plant_name: str | None
    active_sensors: int
    latest_readings: dict[str, float | None]    # sensor_type → value
    alerts_today: int
    high_severity_alerts: int


class DashboardSummary(BaseModel):
    total_zones: int
    active_zones: int
    total_sensors: int
    alerts_today: int
    high_severity_alerts: int
    zones_health: list[ZoneHealthItem]


@router.get(
    "/summary",
    response_model=BaseResponse[DashboardSummary],
    summary="Tổng quan khu vực trồng trọt và trạng thái cảm biến",
)
async def get_dashboard_summary(
    current_user: CurrentUser,
    farmer_id: UUID | None = None,
    db: AsyncSession = Depends(get_db),
):
    # Admin can optionally filter by a specific farmer; farmers always see their own zones
    target_farmer_id = farmer_id if current_user.role == UserRole.ADMIN else current_user.id

    # ── Zones ──────────────────────────────────────────────────────────────
    zones_q = select(GrowingZone)
    if target_farmer_id:
        zones_q = zones_q.join(
            FarmerZoneAssignment,
            (FarmerZoneAssignment.zone_id == GrowingZone.id)
            & (FarmerZoneAssignment.farmer_id == target_farmer_id),
        )
    zones = list((await db.execute(zones_q)).scalars().all())

    total_zones = len(zones)
    active_zones = sum(1 for z in zones if z.is_active)
    zone_ids = [z.id for z in zones]

    # ── Sensors ────────────────────────────────────────────────────────────
    total_sensors = 0
    if zone_ids:
        sensors_count = (
            await db.execute(
                select(func.count(Sensor.id)).where(Sensor.zone_id.in_(zone_ids))
            )
        ).scalar() or 0
        total_sensors = int(sensors_count)

    # ── Alerts today ───────────────────────────────────────────────────────
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    alerts_today = 0
    high_severity_alerts = 0
    if zone_ids:
        alerts_today = int(
            (
                await db.execute(
                    select(func.count(Alert.id))
                    .where(Alert.zone_id.in_(zone_ids))
                    .where(Alert.triggered_at >= today_start)
                )
            ).scalar() or 0
        )
        high_severity_alerts = int(
            (
                await db.execute(
                    select(func.count(Alert.id))
                    .where(Alert.zone_id.in_(zone_ids))
                    .where(Alert.triggered_at >= today_start)
                    .where(Alert.severity == AlertSeverity.HIGH)
                )
            ).scalar() or 0
        )

    # ── Per-zone health ────────────────────────────────────────────────────
    zones_health: list[ZoneHealthItem] = []
    for zone in zones:
        # Sensors in this zone
        sensors_res = await db.execute(
            select(Sensor).where(Sensor.zone_id == zone.id, Sensor.is_active.is_(True))
        )
        sensors = list(sensors_res.scalars().all())

        # Latest reading per sensor
        latest_readings: dict[str, float | None] = {}
        for sensor in sensors:
            reading = (
                await db.execute(
                    select(SensorReading)
                    .where(SensorReading.sensor_id == sensor.id)
                    .order_by(SensorReading.recorded_at.desc())
                    .limit(1)
                )
            ).scalar_one_or_none()
            latest_readings[sensor.sensor_type.value] = reading.value if reading else None

        # Alerts today for this zone
        zone_alerts_today = int(
            (
                await db.execute(
                    select(func.count(Alert.id))
                    .where(Alert.zone_id == zone.id)
                    .where(Alert.triggered_at >= today_start)
                )
            ).scalar() or 0
        )
        zone_high_alerts = int(
            (
                await db.execute(
                    select(func.count(Alert.id))
                    .where(Alert.zone_id == zone.id)
                    .where(Alert.triggered_at >= today_start)
                    .where(Alert.severity == AlertSeverity.HIGH)
                )
            ).scalar() or 0
        )

        # Fetch plant profile name (lazy load via separate query to avoid N+1 with ORM)
        plant_name: str | None = None
        if zone.plant_profile_id:
            from app.models.plant_profile import PlantProfile
            pp = (
                await db.execute(
                    select(PlantProfile).where(PlantProfile.id == zone.plant_profile_id)
                )
            ).scalar_one_or_none()
            plant_name = pp.name if pp else None

        zones_health.append(
            ZoneHealthItem(
                zone_id=zone.id,
                zone_name=zone.name,
                plant_name=plant_name,
                active_sensors=len(sensors),
                latest_readings=latest_readings,
                alerts_today=zone_alerts_today,
                high_severity_alerts=zone_high_alerts,
            )
        )

    return BaseResponse.ok(
        data=DashboardSummary(
            total_zones=total_zones,
            active_zones=active_zones,
            total_sensors=total_sensors,
            alerts_today=alerts_today,
            high_severity_alerts=high_severity_alerts,
            zones_health=zones_health,
        )
    )
