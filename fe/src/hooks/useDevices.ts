import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPut, apiDelete } from '@/services/api'
import { API_ENDPOINTS } from '@/services/endpoints'
import type { Device } from '@/types/common.types'
import type { ApiResponse } from '@/types/api.types'

export const useDevices = (ownerId?: string, enabled = true) => {
  return useQuery({
    queryKey: ['devices', ownerId ?? 'all'],
    queryFn: () =>
      apiGet<ApiResponse<Device[]>>(API_ENDPOINTS.DEVICES.LIST, ownerId ? { owner_id: ownerId } : undefined),
    enabled,
  })
}

export const useCreateDevice = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Device>) =>
      apiPost<ApiResponse<Device>>(API_ENDPOINTS.DEVICES.CREATE, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['devices'] }),
  })
}

export const useUpdateDevice = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Device> }) =>
      apiPut<ApiResponse<Device>>(API_ENDPOINTS.DEVICES.UPDATE(id), data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['devices'] }),
  })
}

export const useDeleteDevice = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiDelete(API_ENDPOINTS.DEVICES.DELETE(id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['devices'] }),
  })
}
