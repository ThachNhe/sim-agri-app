
import type { User } from '@/types/common.types'

// ─── Auth State ────────────────────────────────────────────────────────────

export interface AuthSession {
  user: User
}

// ─── Form Values ───────────────────────────────────────────────────────────

export interface LoginFormValues {
  email: string
  password: string
  rememberMe?: boolean
}

export interface RegisterFormValues {
  name: string
  email: string
  password: string
  confirmPassword: string
}

export interface ForgotPasswordFormValues {
  email: string
}

export interface ResetPasswordFormValues {
  token: string
  password: string
  confirmPassword: string
}

// ─── API Payloads ──────────────────────────────────────────────────────────

export type LoginPayload = Omit<LoginFormValues, 'rememberMe'>
export type RegisterPayload = Omit<RegisterFormValues, 'confirmPassword'>

// ─── API Responses ─────────────────────────────────────────────────────────

export interface LoginApiResponse {
  user: User
}

export interface RegisterApiResponse {
  user: User
  message: string
}
