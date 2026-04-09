import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPatch } from '@/services/api'
import { API_ENDPOINTS } from '@/services/endpoints'
import type { Alert, AlertSummary } from '@/types/common.types'
import type { ApiResponse } from '@/types/api.types'

export const useAlerts = (ownerId?: string, enabled = true) => {
  return useQuery({
    queryKey: ['alerts', ownerId ?? 'all'],
    queryFn: () =>
      apiGet<ApiResponse<Alert[]>>(API_ENDPOINTS.ALERTS.LIST, ownerId ? { owner_id: ownerId } : undefined),
    enabled,
    refetchInterval: 30000,
  })
}

export const useAlertSummary = (ownerId?: string, enabled = true) => {
  return useQuery({
    queryKey: ['alerts-summary', ownerId ?? 'all'],
    queryFn: () =>
      apiGet<ApiResponse<AlertSummary>>(API_ENDPOINTS.ALERTS.SUMMARY, ownerId ? { owner_id: ownerId } : undefined),
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
