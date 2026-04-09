import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/services/api'
import { API_ENDPOINTS } from '@/services/endpoints'
import type { DashboardSummary } from '@/types/common.types'
import type { ApiResponse } from '@/types/api.types'

export const useDashboardSummary = (ownerId?: string, enabled = true) => {
  return useQuery({
    queryKey: ['dashboard-summary', ownerId ?? 'all'],
    queryFn: () =>
      apiGet<ApiResponse<DashboardSummary>>(API_ENDPOINTS.DASHBOARD.SUMMARY, ownerId ? { owner_id: ownerId } : undefined),
    enabled,
    refetchInterval: 30000,
  })
}
