import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/services/api'
import { API_ENDPOINTS } from '@/services/endpoints'
import type { SensorReading } from '@/types/common.types'
import type { ApiResponse } from '@/types/api.types'

export const useReadings = (
  sensorId: string | undefined,
  selectedDate: string | undefined,
) => {
  return useQuery({
    queryKey: ['readings', sensorId, selectedDate],
    queryFn: () => {
      const baseDate = selectedDate
        ? new Date(`${selectedDate}T00:00:00`)
        : new Date()
      const fromDate = new Date(baseDate)
      fromDate.setHours(0, 0, 0, 0)

      const toDate = new Date(baseDate)
      toDate.setHours(23, 59, 59, 999)

      return apiGet<ApiResponse<SensorReading[]>>(API_ENDPOINTS.READINGS.LIST, {
        sensor_id: sensorId,
        from_date: fromDate.toISOString(),
        to_date: toDate.toISOString(),
      })
    },
    enabled: !!sensorId,
    refetchInterval: 30000,
  })
}

export const useLatestReadings = (zoneId: string | undefined, enabled = true) => {
  return useQuery({
    queryKey: ['readings', 'latest', zoneId],
    queryFn: () =>
      apiGet<ApiResponse<SensorReading[]>>(API_ENDPOINTS.READINGS.LATEST, {
        zone_id: zoneId,
      }),
    enabled: !!zoneId && enabled,
    refetchInterval: 30000,
  })
}

