import asyncio
import random
import logging
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.device import Device
from app.models.sensor_reading import SensorReading
from app.models.alert import Alert

logger = logging.getLogger(__name__)


async def generate_faker_data():
    logger.info("Khởi động NASA Fetcher task...")
    while True:
        try:
            async with AsyncSessionLocal() as db:
                result = await db.execute(
                    select(Device).where(Device.is_active == True)
                )
                devices = result.scalars().all()
                
                for device in devices:
                    if device.type.value != "sensor":
                        continue

                    temp = round(random.uniform(15.0, 40.0), 1)
                    humidity = round(random.uniform(30.0, 90.0), 1)
                    moisture = round(random.uniform(10.0, 80.0), 1)

                    reading = SensorReading(
                        device_id=device.id,
                        temperature=temp,
                        humidity=humidity,
                        soil_moisture=moisture,
                    )
                    db.add(reading)

                    if temp > 35.0:
                        alert = Alert(
                            device_id=device.id,
                            message=f"Nhiệt độ cao bất thường: {temp}°C",
                            threshold=35.0,
                        )
                        db.add(alert)
                    if humidity < 35.0:
                        alert = Alert(
                            device_id=device.id,
                            message=f"Độ ẩm quá thấp: {humidity}%",
                            threshold=35.0,
                        )
                        db.add(alert)

                await db.commit()
                logger.debug(f"Đã cập nhật dữ liệu cho {len(devices)} thiết bị.")
        except Exception as e:
            logger.error(f"Lỗi khi chạy NASA Fetcher: {e}")

        await asyncio.sleep(30)
