from uuid import UUID
from datetime import datetime
from typing import List

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.repositories.sensor_reading import SensorReadingRepository
from app.schemas.sensor_reading import SensorReadingResponse
from app.services.device import DeviceService


class SensorReadingService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.reading_repo = SensorReadingRepository(db)
        self.device_service = DeviceService(db)

    async def get_readings(
        self, device_id: UUID, from_date: datetime, to_date: datetime, user: User
    ) -> List[SensorReadingResponse]:
        # Validate device ownership via device_service
        await self.device_service.get_device_by_id(device_id, user)
        readings = await self.reading_repo.get_by_device_and_date(
            device_id, from_date, to_date
        )
        return [SensorReadingResponse.model_validate(r) for r in readings]
