import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/services/api'
import { API_ENDPOINTS } from '@/services/endpoints'
import type { SensorReading } from '@/types/common.types'
import type { ApiResponse } from '@/types/api.types'

export const useReadings = (
  deviceId: string | undefined,
  windowHours = 24
) => {
  return useQuery({
    queryKey: ['readings', deviceId, windowHours],
    queryFn: () => {
      const toDate = new Date().toISOString()
      const fromDate = new Date(
        Date.now() - windowHours * 60 * 60 * 1000,
      ).toISOString()

      return apiGet<ApiResponse<SensorReading[]>>(API_ENDPOINTS.READINGS.LIST, {
        device_id: deviceId,
        from_date: fromDate,
        to_date: toDate,
      })
    },
    enabled: !!deviceId,
    refetchInterval: 30000,
  })
}
