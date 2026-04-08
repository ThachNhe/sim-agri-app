import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPatch, apiPost } from '@/services/api'
import { API_ENDPOINTS } from '@/services/endpoints'
import type { User, UserStatus } from '@/types/common.types'
import type { ApiResponse } from '@/types/api.types'
import {
  mapBackendUser,
  mapBackendUsers,
  toBackendCreateFarmerPayload,
  type BackendUserResponse,
} from '@/lib/mappers/user'

export const useUsers = (enabled = true) => {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await apiGet<ApiResponse<BackendUserResponse[]>>(
        API_ENDPOINTS.ADMIN.USERS,
      )

      return {
        ...response,
        data: mapBackendUsers(response.data),
      } as ApiResponse<User[]>
    },
    enabled,
  })
}

export interface CreateFarmerInput {
  fullName: string
  email: string
}

export const useCreateUser = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateFarmerInput) => {
      const response = await apiPost<ApiResponse<BackendUserResponse>>(
        API_ENDPOINTS.ADMIN.CREATE_USER,
        toBackendCreateFarmerPayload(data),
      )

      return {
        ...response,
        data: mapBackendUser(response.data),
      } as ApiResponse<User>
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })
}

export const useToggleUserStatus = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string
      status: UserStatus
    }) => {
      const response = await apiPatch<ApiResponse<BackendUserResponse>>(
        API_ENDPOINTS.ADMIN.UPDATE_USER_STATUS(id),
        { status },
      )

      return {
        ...response,
        data: mapBackendUser(response.data),
      } as ApiResponse<User>
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })
}
