import { useMutation } from '@tanstack/react-query'
import type { LoginRequest, RegisterRequest } from '@/types/api.types'
import { useAuthStore } from '@/stores/useAuthStore'
import { useNavigate } from '@tanstack/react-router'
import { authService } from '@/features/auths/services/auth.service'

export const useLogin = () => {
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()

  return useMutation({
    mutationFn: (data: LoginRequest) => authService.login(data),
    onSuccess: (res) => {
      // Tokens are in HttpOnly cookies — only store user info
      login(res.data.user)
      navigate({ to: '/' })
    },
  })
}

export const useRegister = () => {
  const navigate = useNavigate()
  return useMutation({
    mutationFn: (data: RegisterRequest) => authService.register(data),
    onSuccess: () => navigate({ to: '/login' }),
  })
}

export const useLogout = () => {
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  return useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      logout()
      navigate({ to: '/login' })
    },
  })
}
