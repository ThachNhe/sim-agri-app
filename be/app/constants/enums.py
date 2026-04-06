from enum import Enum


class UserRole(str, Enum):
    ADMIN = "admin"
    USER = "user"


class DeviceType(str, Enum):
    SENSOR = "sensor"
    ACTUATOR = "actuator"
    GATEWAY = "gateway"


class UserStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    BANNED = "banned"


class TokenType(str, Enum):
    ACCESS = "access"
    REFRESH = "refresh"
