import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPut } from '@/services/api'
import { API_ENDPOINTS } from '@/services/endpoints'
import type { GrowingZone } from '@/types/common.types'
import type { ApiResponse } from '@/types/api.types'

/** Farmer: danh sách khu vực được phân công cho mình */
export const useZones = (enabled = true) =>
    useQuery({
        queryKey: ['zones'],
        queryFn: () => apiGet<ApiResponse<GrowingZone[]>>(API_ENDPOINTS.ZONES.LIST),
        enabled,
    })

export const useZone = (zoneId: string | undefined) =>
    useQuery({
        queryKey: ['zones', zoneId],
        queryFn: () => apiGet<ApiResponse<GrowingZone>>(API_ENDPOINTS.ZONES.BY_ID(zoneId!)),
        enabled: !!zoneId,
    })

export const useUpdateZone = () => {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<GrowingZone> }) =>
            apiPut<ApiResponse<GrowingZone>>(API_ENDPOINTS.ZONES.UPDATE(id), data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['zones'] }),
    })
}
