import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/services/api'
import { API_ENDPOINTS } from '@/services/endpoints'
import type { DashboardSummary } from '@/types/common.types'
import type { ApiResponse } from '@/types/api.types'

export const useDashboardSummary = (farmerId?: string, enabled = true) => {
  return useQuery({
    queryKey: ['dashboard-summary', farmerId ?? 'all'],
    queryFn: () =>
      apiGet<ApiResponse<DashboardSummary>>(API_ENDPOINTS.DASHBOARD.SUMMARY, farmerId ? { farmer_id: farmerId } : undefined),
    enabled,
    refetchInterval: 30000,
  })
}
