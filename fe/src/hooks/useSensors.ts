import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPatch, apiDelete } from '@/services/api'
import { API_ENDPOINTS } from '@/services/endpoints'
import type { Sensor } from '@/types/common.types'
import type { ApiResponse } from '@/types/api.types'

export const useSensors = (zoneId: string | undefined, enabled = true) =>
    useQuery({
        queryKey: ['sensors', zoneId],
        queryFn: () =>
            apiGet<ApiResponse<Sensor[]>>(API_ENDPOINTS.SENSORS.LIST, { zone_id: zoneId }),
        enabled: !!zoneId && enabled,
    })

export const useCreateSensor = () => {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (data: Partial<Sensor>) =>
            apiPost<ApiResponse<Sensor>>(API_ENDPOINTS.SENSORS.CREATE, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['sensors'] }),
    })
}

export const useUpdateSensor = () => {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Sensor> }) =>
            apiPatch<ApiResponse<Sensor>>(API_ENDPOINTS.SENSORS.UPDATE(id), data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['sensors'] }),
    })
}

export const useDeleteSensor = () => {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => apiDelete(API_ENDPOINTS.SENSORS.DELETE(id)),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['sensors'] }),
    })
}
