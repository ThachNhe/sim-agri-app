// ─── User ─────────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'user'
export type UserStatus = 'active' | 'inactive' | 'banned'

export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  role: UserRole
  status: UserStatus
  isVerified: boolean
  createdAt: string
  updatedAt: string
}

// ─── Pagination ────────────────────────────────────────────────────────────

export interface PaginationParams {
  page: number
  limit: number
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

// ─── Sort & Filter ─────────────────────────────────────────────────────────

export type SortOrder = 'asc' | 'desc'

export interface SortParams {
  sortBy: string
  sortOrder: SortOrder
}

// ─── Select Option ─────────────────────────────────────────────────────────

export interface SelectOption<T = string> {
  label: string
  value: T
  disabled?: boolean
}

// ─── Key-Value ─────────────────────────────────────────────────────────────

export type KeyValue<T = string> = Record<string, T>

// ─── Nullable helpers ──────────────────────────────────────────────────────

export type Nullable<T> = T | null
export type Optional<T> = T | undefined
export type Maybe<T> = T | null | undefined

// ─── Plant Profile ─────────────────────────────────────────────────────────

export interface PlantProfile {
  id: string
  name: string
  description?: string
  temp_min: number
  temp_max: number
  humidity_min: number
  humidity_max: number
  soil_moisture_min: number
  soil_moisture_max: number
  light_min?: number
  light_max?: number
  ph_min?: number
  ph_max?: number
  ec_min?: number
  ec_max?: number
  growth_period_days?: number
  created_at: string
  updated_at: string
}

// ─── Growing Zone ──────────────────────────────────────────────────────────

export interface GrowingZone {
  id: string
  name: string
  description?: string
  location?: string
  area_sqm?: number
  plant_profile_id?: string
  owner_id: string
  is_active: boolean
  planting_date?: string
  expected_harvest_date?: string
  created_at: string
  updated_at: string
}

// ─── Sensor ────────────────────────────────────────────────────────────────

export type SensorType =
  | 'temperature'
  | 'humidity'
  | 'soil_moisture'
  | 'light'
  | 'ph'
  | 'ec'
  | 'co2'

export const SENSOR_LABEL: Record<SensorType, string> = {
  temperature: 'Nhiệt độ',
  humidity: 'Độ ẩm KK',
  soil_moisture: 'Độ ẩm đất',
  light: 'Ánh sáng',
  ph: 'pH đất',
  ec: 'EC dinh dưỡng',
  co2: 'CO₂',
}

export const SENSOR_UNIT: Record<SensorType, string> = {
  temperature: '°C',
  humidity: '%',
  soil_moisture: '%',
  light: 'lux',
  ph: '',
  ec: 'μS/cm',
  co2: 'ppm',
}

export interface Sensor {
  id: string
  name: string
  sensor_type: SensorType
  unit: string
  zone_id: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// ─── Actuator ──────────────────────────────────────────────────────────────

export type ActuatorType =
  | 'irrigation'
  | 'fertilizer_pump'
  | 'grow_light'
  | 'ventilation_fan'
  | 'heater'

export type ActuatorState = 'on' | 'off'

export const ACTUATOR_LABEL: Record<ActuatorType, string> = {
  irrigation: 'Tưới nước',
  fertilizer_pump: 'Bơm phân bón',
  grow_light: 'Đèn chiếu sáng',
  ventilation_fan: 'Quạt thông gió',
  heater: 'Máy sưởi',
}

export interface Actuator {
  id: string
  name: string
  actuator_type: ActuatorType
  zone_id: string
  is_active: boolean
  current_state: ActuatorState
  created_at: string
  updated_at: string
}

export interface ActuatorCommand {
  id: string
  actuator_id: string
  commanded_by?: string
  command: ActuatorState
  duration_seconds?: number
  reason?: string
  executed_at: string
}

// ─── Sensor Reading ────────────────────────────────────────────────────────

export interface SensorReading {
  id: string
  sensor_id: string
  value: number
  recorded_at: string
}

// ─── Alert ─────────────────────────────────────────────────────────────────

export type AlertType = 'above_max' | 'below_min' | 'device_offline'
export type AlertSeverity = 'low' | 'medium' | 'high'

export interface Alert {
  id: string
  zone_id: string
  sensor_id?: string
  alert_type: AlertType
  severity: AlertSeverity
  parameter?: SensorType
  actual_value?: number
  threshold_value?: number
  message: string
  recommended_action?: string
  is_read: boolean
  triggered_at: string
}

export interface AlertSummary {
  total_alerts: number
  read_alerts: number
  unread_alerts: number
}

// ─── Dashboard ─────────────────────────────────────────────────────────────

export interface ZoneHealthItem {
  zone_id: string
  zone_name: string
  plant_name?: string
  active_sensors: number
  latest_readings: Partial<Record<SensorType, number | null>>
  alerts_today: number
  high_severity_alerts: number
}

export interface DashboardSummary {
  total_zones: number
  active_zones: number
  total_sensors: number
  alerts_today: number
  high_severity_alerts: number
  zones_health: ZoneHealthItem[]
}




