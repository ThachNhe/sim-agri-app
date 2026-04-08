import { apiPost, apiGet } from '@/services/api'
import { API_ENDPOINTS } from '@/services/endpoints'
import type {
  LoginPayload,
  RegisterPayload,
  LoginApiResponse,
  RegisterApiResponse,
} from '../types/auth.types'
import type { User } from '@/types/common.types'
import type { ApiResponse } from '@/types/api.types'
import {
  mapBackendUser,
  toBackendRegisterPayload,
  type BackendUserResponse,
} from '@/lib/mappers/user'

// ─── Auth Service ──────────────────────────────────────────────────────────

export const authService = {
  /**
   * Login with email & password
   * Returns user info + tokens
   */
  login: async (payload: LoginPayload): Promise<LoginApiResponse> => {
    const response = await apiPost<ApiResponse<{ user: BackendUserResponse }>>(
      API_ENDPOINTS.AUTH.LOGIN,
      payload,
    )

    return {
      ...response,
      data: {
        user: mapBackendUser(response.data.user),
      },
    }
  },

  /**
   * Register a new account
   */
  register: async (payload: RegisterPayload): Promise<RegisterApiResponse> => {
    const response = await apiPost<ApiResponse<BackendUserResponse>>(
      API_ENDPOINTS.AUTH.REGISTER,
      toBackendRegisterPayload(payload),
    )

    return {
      ...response,
      data: {
        user: mapBackendUser(response.data),
      },
    }
  },

  /**
   * Logout - invalidate token on server
   */
  logout: () =>
    apiPost<ApiResponse>(API_ENDPOINTS.AUTH.LOGOUT),

  /**
   * Get current authenticated user
   */
  getMe: async (): Promise<User> => {
    const response = await apiGet<ApiResponse<BackendUserResponse>>(
      API_ENDPOINTS.AUTH.ME,
    )

    return mapBackendUser(response.data)
  },

  /**
   * Send forgot password email
   */
  forgotPassword: (email: string) =>
    apiPost<ApiResponse>(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, { email }),

  /**
   * Reset password with token from email
   */
  resetPassword: (token: string, password: string) =>
    apiPost<ApiResponse>(API_ENDPOINTS.AUTH.RESET_PASSWORD, {
      token,
      password,
    }),
}
