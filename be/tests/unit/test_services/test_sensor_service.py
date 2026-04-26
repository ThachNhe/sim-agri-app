import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

from app.constants.enums import SENSOR_UNIT, SensorType, UserRole
from app.schemas.sensor import SensorCreate
from app.services.sensor import SensorService

pytestmark = pytest.mark.asyncio


class TestSensorService:
    @pytest.mark.parametrize(
        ("payload_kwargs", "expected_unit"),
        [
            (
                {"name": "Cảm biến nhiệt độ", "sensor_type": SensorType.TEMPERATURE},
                SENSOR_UNIT[SensorType.TEMPERATURE],
            ),
            (
                {
                    "name": "Cảm biến pH tuỳ chỉnh",
                    "sensor_type": SensorType.PH,
                    "unit": "pH custom",
                },
                "pH custom",
            ),
        ],
    )
    async def test_create_sensor_sets_unit_without_duplicate_keyword(
        self,
        payload_kwargs,
        expected_unit,
    ):
        db = AsyncMock()
        service = SensorService(db)
        service.repo = MagicMock()
        service.zone_repo = MagicMock()

        user_id = uuid4()
        zone_id = uuid4()

        user = MagicMock()
        user.id = user_id
        user.role = UserRole.USER

        zone = MagicMock()
        service.zone_repo.get_by_id = AsyncMock(return_value=zone)
        service.zone_repo.is_farmer_assigned = AsyncMock(return_value=True)

        async def fake_create(sensor):
            now = datetime.now(timezone.utc)
            sensor.id = uuid4()
            sensor.is_active = True
            sensor.created_at = now
            sensor.updated_at = now
            return sensor

        service.repo.create = AsyncMock(side_effect=fake_create)

        payload = SensorCreate(zone_id=zone_id, **payload_kwargs)

        result = await service.create_sensor(payload, user)

        created_sensor = service.repo.create.await_args.args[0]
        assert created_sensor.unit == expected_unit
        assert result.unit == expected_unit
        assert result.name == payload.name
        assert result.zone_id == zone_id