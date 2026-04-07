import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPatch } from '@/services/api'
import { API_ENDPOINTS } from '@/services/endpoints'
import type { Alert } from '@/types/common.types'
import type { ApiResponse } from '@/types/api.types'

export const useAlerts = () => {
  return useQuery({
    queryKey: ['alerts'],
    queryFn: () => apiGet<ApiResponse<Alert[]>>(API_ENDPOINTS.ALERTS.LIST),
    refetchInterval: 30000,
  })
}

export const useMarkAlertRead = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiPatch<ApiResponse<Alert>>(API_ENDPOINTS.ALERTS.MARK_READ(id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  })
}
