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
  is_active: boolean
  planting_date?: string
  expected_harvest_date?: string
  created_at: string
  updated_at: string
}

export interface AssignedFarmerBrief {
  id: string
  full_name: string | null
  email: string
}

export interface GrowingZoneAdminResponse extends GrowingZone {
  assigned_farmers: AssignedFarmerBrief[]
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
  location?: string
  device_address?: string
  update_interval_seconds: number
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

export type AlertType = 'above_max' | 'below_min' | 'compound_condition' | 'device_offline'
export type AlertSeverity = 'low' | 'medium' | 'high'

export interface Alert {
  id: string
  zone_id: string
  zone_name?: string
  sensor_id?: string
  sensor_name?: string
  sensor_unit?: string
  alert_type: AlertType
  severity: AlertSeverity
  parameter?: SensorType
  actual_value?: number
  threshold_value?: number
  message: string
  recommended_action?: string
  automation_status: 'none' | 'executed' | 'pending' | string
  automation_action?: string
  automation_device_id?: string
  automation_device_name?: string
  automation_command?: string
  is_read: boolean
  triggered_at: string
}

export interface AlertSummary {
  total_alerts: number
  read_alerts: number
  unread_alerts: number
  auto_executed_alerts: number
}

// ─── MQTT Control Device ──────────────────────────────────────────────────

export type DeviceType =
  | 'pump'
  | 'light'
  | 'fan'
  | 'heater'
  | 'fertilizer_pump'
  | 'co2_injector'
  | 'shade_net'
  | 'valve'
  | 'sensor'
  | 'actuator'
  | 'gateway'

export type DeviceControlMode = 'on_off' | 'percentage' | 'multi_speed'
export type DeviceConnectionStatus = 'online' | 'connecting' | 'offline'

export const DEVICE_TYPE_LABEL: Record<DeviceType, string> = {
  pump: 'Bơm',
  light: 'Đèn',
  fan: 'Quạt',
  heater: 'Máy sưởi',
  fertilizer_pump: 'Bơm phân',
  co2_injector: 'Bổ sung CO₂',
  shade_net: 'Lưới che',
  valve: 'Van',
  sensor: 'Cảm biến',
  actuator: 'Thiết bị tác động',
  gateway: 'Gateway',
}

export const DEVICE_CONTROL_LABEL: Record<DeviceControlMode, string> = {
  on_off: 'Bật / tắt',
  percentage: 'Điều chỉnh %',
  multi_speed: 'Nhiều tốc độ',
}

export interface Device {
  id: string
  name: string
  location: string
  type: DeviceType
  control_mode: DeviceControlMode
  power_watt?: number
  owner_id: string
  linked_sensor_id?: string
  linked_sensor_name?: string
  linked_sensor_type?: SensorType
  linked_zone_id?: string
  automation_enabled: boolean
  command_topic: string
  state_topic: string
  qos: number
  timeout_seconds: number
  payload_on: string
  payload_off: string
  current_state: string
  current_value: number
  connection_status: DeviceConnectionStatus
  last_command?: string
  last_seen_at?: string
  is_auto_running: boolean
  auto_remaining_seconds?: number
  auto_shutdown_at?: string
  is_active: boolean
  created_at: string
  updated_at: string
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

