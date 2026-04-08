import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/services/api'
import { API_ENDPOINTS } from '@/services/endpoints'
import type { SensorReading } from '@/types/common.types'
import type { ApiResponse } from '@/types/api.types'

export const useReadings = (
  deviceId: string | undefined,
  selectedDate: string | undefined,
) => {
  return useQuery({
    queryKey: ['readings', deviceId, selectedDate],
    queryFn: () => {
      const baseDate = selectedDate
        ? new Date(`${selectedDate}T00:00:00`)
        : new Date()
      const fromDate = new Date(baseDate)
      fromDate.setHours(0, 0, 0, 0)

      const toDate = new Date(baseDate)
      toDate.setHours(23, 59, 59, 999)

      return apiGet<ApiResponse<SensorReading[]>>(API_ENDPOINTS.READINGS.LIST, {
        device_id: deviceId,
        from_date: fromDate.toISOString(),
        to_date: toDate.toISOString(),
      })
    },
    enabled: !!deviceId,
    refetchInterval: 30000,
  })
}
