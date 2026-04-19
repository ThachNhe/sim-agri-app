from enum import Enum


class UserRole(str, Enum):
    ADMIN = "admin"
    USER = "user"


class UserStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    BANNED = "banned"


class TokenType(str, Enum):
    ACCESS = "access"
    REFRESH = "refresh"


class SensorType(str, Enum):
    TEMPERATURE = "temperature"       # Nhiệt độ không khí (°C)
    HUMIDITY = "humidity"             # Độ ẩm không khí (%)
    SOIL_MOISTURE = "soil_moisture"   # Độ ẩm đất (%)
    LIGHT = "light"                   # Cường độ ánh sáng (lux)
    PH = "ph"                         # Độ pH đất
    EC = "ec"                         # Độ dẫn điện / dinh dưỡng (μS/cm)
    CO2 = "co2"                       # Nồng độ CO₂ (ppm)


SENSOR_UNIT: dict[SensorType, str] = {
    SensorType.TEMPERATURE: "°C",
    SensorType.HUMIDITY: "%",
    SensorType.SOIL_MOISTURE: "%",
    SensorType.LIGHT: "lux",
    SensorType.PH: "",
    SensorType.EC: "μS/cm",
    SensorType.CO2: "ppm",
}


class ActuatorType(str, Enum):
    IRRIGATION = "irrigation"             # Hệ thống tưới nước
    FERTILIZER_PUMP = "fertilizer_pump"   # Bơm phân bón
    GROW_LIGHT = "grow_light"             # Đèn trồng cây
    VENTILATION_FAN = "ventilation_fan"   # Quạt thông gió
    HEATER = "heater"                     # Máy sưởi


class ActuatorState(str, Enum):
    ON = "on"
    OFF = "off"


class AlertType(str, Enum):
    ABOVE_MAX = "above_max"       # Thông số vượt ngưỡng tối đa
    BELOW_MIN = "below_min"       # Thông số dưới ngưỡng tối thiểu
    DEVICE_OFFLINE = "device_offline"


class AlertSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
