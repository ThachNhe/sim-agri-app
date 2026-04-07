// ─── User ─────────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'user'

export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  role: UserRole
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

// ─── Device ────────────────────────────────────────────────────────────────
export type DeviceType = 'sensor' | 'actuator' | 'gateway'

export interface Device {
  id: string
  name: string
  location: string
  type: DeviceType
  owner_id: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// ─── Sensor Reading ────────────────────────────────────────────────────────
export interface SensorReading {
  id: string
  device_id: string
  temperature: number
  humidity: number
  soil_moisture?: number
  recorded_at: string
}

// ─── Alert ─────────────────────────────────────────────────────────────────
export interface Alert {
  id: string
  device_id: string
  message: string
  threshold: number
  triggered_at: string
  is_read: boolean
}

// ─── Dashboard ─────────────────────────────────────────────────────────────
export interface DashboardSummary {
  total_devices: number
  alerts_today: number
  avg_temperature: number | null
  avg_humidity: number | null
}

