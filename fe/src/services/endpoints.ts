/**
 * Centralized API endpoints.
 */

export const API_ENDPOINTS = {
  // ─── Auth ────────────────────────────────────────────────────────────────
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
  },

  // ─── Plant Profiles ───────────────────────────────────────────────────────
  PLANT_PROFILES: {
    LIST: '/plant-profiles',
    BY_ID: (id: string) => `/plant-profiles/${id}`,
    CREATE: '/plant-profiles',
    UPDATE: (id: string) => `/plant-profiles/${id}`,
    DELETE: (id: string) => `/plant-profiles/${id}`,
  },

  // ─── Growing Zones (Farmer) ───────────────────────────────────────────────
  ZONES: {
    LIST: '/zones',
    BY_ID: (id: string) => `/zones/${id}`,
    UPDATE: (id: string) => `/zones/${id}`,
  },

  // ─── Sensors ─────────────────────────────────────────────────────────────
  SENSORS: {
    LIST: '/sensors',           // requires ?zone_id=
    CREATE: '/sensors',
    UPDATE: (id: string) => `/sensors/${id}`,
    DELETE: (id: string) => `/sensors/${id}`,
  },

  // ─── Actuators ───────────────────────────────────────────────────────────
  ACTUATORS: {
    LIST: '/actuators',         // requires ?zone_id=
    CREATE: '/actuators',
    UPDATE: (id: string) => `/actuators/${id}`,
    DELETE: (id: string) => `/actuators/${id}`,
    COMMAND: (id: string) => `/actuators/${id}/command`,
    COMMANDS: (id: string) => `/actuators/${id}/commands`,
  },

  // ─── Readings ────────────────────────────────────────────────────────────
  READINGS: {
    LIST: '/readings',           // requires ?sensor_id=&from_date=&to_date=
    LATEST: '/readings/latest',  // requires ?zone_id=
  },

  // ─── Alerts ──────────────────────────────────────────────────────────────
  ALERTS: {
    LIST: '/alerts',
    MARK_READ: (id: string) => `/alerts/${id}/read`,
    SUMMARY: '/alerts/summary',
  },

  // ─── Dashboard ───────────────────────────────────────────────────────────
  DASHBOARD: {
    SUMMARY: '/dashboard/summary',
  },

  // ─── Admin ───────────────────────────────────────────────────────────────
  ADMIN: {
    // Farmer accounts
    USERS: '/admin/users',
    CREATE_USER: '/admin/users',
    UPDATE_USER_STATUS: (id: string) => `/admin/users/${id}/status`,
    // Zone management
    ZONES: '/admin/zones',
    ZONE_BY_ID: (id: string) => `/admin/zones/${id}`,
    CREATE_ZONE: '/admin/zones',
    UPDATE_ZONE: (id: string) => `/admin/zones/${id}`,
    DELETE_ZONE: (id: string) => `/admin/zones/${id}`,
    // Farmer ↔ zone assignments
    ZONE_FARMERS: (zoneId: string) => `/admin/zones/${zoneId}/farmers`,
    ASSIGN_FARMER: (zoneId: string) => `/admin/zones/${zoneId}/farmers`,
    UNASSIGN_FARMER: (zoneId: string, farmerId: string) =>
      `/admin/zones/${zoneId}/farmers/${farmerId}`,
  },
} as const

