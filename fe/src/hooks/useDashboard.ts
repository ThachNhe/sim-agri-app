import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/services/api'
import { API_ENDPOINTS } from '@/services/endpoints'
import type { DashboardSummary } from '@/types/common.types'
import type { ApiResponse } from '@/types/api.types'

export const useDashboardSummary = () => {
  return useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () =>
      apiGet<ApiResponse<DashboardSummary>>(API_ENDPOINTS.DASHBOARD.SUMMARY),
    refetchInterval: 30000,
  })
}
