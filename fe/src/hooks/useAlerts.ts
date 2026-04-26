import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPatch } from '@/services/api'
import { API_ENDPOINTS } from '@/services/endpoints'
import type { Alert, AlertSummary } from '@/types/common.types'
import type { ApiResponse } from '@/types/api.types'

export const useAlerts = (farmerId?: string, enabled = true, limit?: number) => {
  return useQuery({
    queryKey: ['alerts', farmerId ?? 'all', limit ?? 'all'],
    queryFn: () =>
      apiGet<ApiResponse<Alert[]>>(API_ENDPOINTS.ALERTS.LIST, {
        ...(farmerId ? { farmer_id: farmerId } : {}),
        ...(limit !== undefined ? { limit } : {}),
      }),
    enabled,
    refetchInterval: 30000,
  })
}

export const useAlertSummary = (farmerId?: string, enabled = true) => {
  return useQuery({
    queryKey: ['alerts-summary', farmerId ?? 'all'],
    queryFn: () =>
      apiGet<ApiResponse<AlertSummary>>(API_ENDPOINTS.ALERTS.SUMMARY, farmerId ? { farmer_id: farmerId } : undefined),
    enabled,
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
