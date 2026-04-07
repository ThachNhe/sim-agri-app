import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/services/api'
import { API_ENDPOINTS } from '@/services/endpoints'
import type { SensorReading } from '@/types/common.types'
import type { ApiResponse } from '@/types/api.types'

export const useReadings = (
  deviceId: string | undefined,
  from: string | undefined,
  to: string | undefined
) => {
  return useQuery({
    queryKey: ['readings', deviceId, from, to],
    queryFn: () =>
      apiGet<ApiResponse<SensorReading[]>>(API_ENDPOINTS.READINGS.LIST, {
        device_id: deviceId,
        from_date: from,
        to_date: to,
      }),
    enabled: !!deviceId && !!from && !!to,
    refetchInterval: 30000, 
  })
}
