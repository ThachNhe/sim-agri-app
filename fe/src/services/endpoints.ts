/**
 * Centralized API endpoints.
 * All endpoints are defined here to avoid magic strings scattered across the codebase.
 *
 * Usage:
 *   import { API_ENDPOINTS } from '@/services/endpoints'
 *   api.get(API_ENDPOINTS.USERS.LIST)
 *   api.get(API_ENDPOINTS.USERS.BY_ID(userId))
 */

export const API_ENDPOINTS = {
  // ─── Auth ────────────────────────────────────────────────────────────────
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
  },

  // ─── Devices ─────────────────────────────────────────────────────────────
  DEVICES: {
    LIST: '/devices',
    BY_ID: (id: string) => `/devices/${id}`,
    CREATE: '/devices',
    UPDATE: (id: string) => `/devices/${id}`,
    DELETE: (id: string) => `/devices/${id}`,
  },

  // ─── Readings ────────────────────────────────────────────────────────────
  READINGS: {
    LIST: '/readings', // requires ?device_id=&from=&to=
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
    USERS: '/admin/users',
    CREATE_USER: '/admin/users',
    UPDATE_USER_STATUS: (id: string) => `/admin/users/${id}/status`,
  },
} as const
