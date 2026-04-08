import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/services/api'
import { API_ENDPOINTS } from '@/services/endpoints'
import type { User } from '@/types/common.types'
import type { ApiResponse } from '@/types/api.types'

export const useUsers = (enabled = true) => {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => apiGet<ApiResponse<User[]>>(API_ENDPOINTS.ADMIN.USERS),
    enabled,
  })
}
