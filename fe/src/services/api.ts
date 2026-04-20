import axios, { type AxiosError } from 'axios'
import { useAuthStore } from '@/stores/useAuthStore'
import type { ApiErrorResponse } from '@/types/api.types'

// ─── Axios Instance ────────────────────────────────────────────────────────

export const api = axios.create({
  baseURL: '/api/v1',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Always send cookies
})

// ─── Response Interceptor ──────────────────────────────────────────────────

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    // On 401, token expired — auto logout and redirect to login
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }

    return Promise.reject(error)
  },
)

// ─── Typed helper methods ──────────────────────────────────────────────────

export const apiGet = <T>(url: string, params?: object) =>
  api.get<T>(url, { params }).then((res) => res.data)

export const apiPost = <T>(url: string, data?: unknown) =>
  api.post<T>(url, data).then((res) => res.data)

export const apiPut = <T>(url: string, data?: unknown) =>
  api.put<T>(url, data).then((res) => res.data)

export const apiPatch = <T>(url: string, data?: unknown) =>
  api.patch<T>(url, data).then((res) => res.data)

export const apiDelete = <T>(url: string) =>
  api.delete<T>(url).then((res) => res.data)
