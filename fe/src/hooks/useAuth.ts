import { useMutation } from '@tanstack/react-query'
import { apiPost } from '@/services/api'
import { API_ENDPOINTS } from '@/services/endpoints'
import type { LoginRequest, LoginResponse, RegisterRequest, ApiResponse } from '@/types/api.types'
import { useAuthStore } from '@/stores/useAuthStore'
import { useNavigate } from '@tanstack/react-router'
import type { User } from '@/types/common.types'

interface LoginResult {
  user: User
  tokens: LoginResponse
}

export const useLogin = () => {
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()

  return useMutation({
    mutationFn: (data: LoginRequest) =>
      apiPost<ApiResponse<LoginResult>>(API_ENDPOINTS.AUTH.LOGIN, data),
    onSuccess: (res) => {
      login(res.data.user, res.data.tokens.accessToken)
      navigate({ to: '/' })
    },
  })
}

export const useRegister = () => {
  const navigate = useNavigate()
  return useMutation({
    mutationFn: (data: RegisterRequest) =>
      apiPost<ApiResponse<User>>(API_ENDPOINTS.AUTH.REGISTER, data),
    onSuccess: () => navigate({ to: '/login' }),
  })
}
