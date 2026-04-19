import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPut, apiDelete } from '@/services/api'
import { API_ENDPOINTS } from '@/services/endpoints'
import type { GrowingZone } from '@/types/common.types'
import type { ApiResponse } from '@/types/api.types'

export const useZones = (ownerId?: string, enabled = true) =>
    useQuery({
        queryKey: ['zones', ownerId ?? 'all'],
        queryFn: () =>
            apiGet<ApiResponse<GrowingZone[]>>(
                API_ENDPOINTS.ZONES.LIST,
                ownerId ? { owner_id: ownerId } : undefined,
            ),
        enabled,
    })

export const useZone = (zoneId: string | undefined) =>
    useQuery({
        queryKey: ['zones', zoneId],
        queryFn: () => apiGet<ApiResponse<GrowingZone>>(API_ENDPOINTS.ZONES.BY_ID(zoneId!)),
        enabled: !!zoneId,
    })

export const useCreateZone = () => {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (data: Partial<GrowingZone>) =>
            apiPost<ApiResponse<GrowingZone>>(API_ENDPOINTS.ZONES.CREATE, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['zones'] }),
    })
}

export const useUpdateZone = () => {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<GrowingZone> }) =>
            apiPut<ApiResponse<GrowingZone>>(API_ENDPOINTS.ZONES.UPDATE(id), data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['zones'] }),
    })
}

export const useDeleteZone = () => {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => apiDelete(API_ENDPOINTS.ZONES.DELETE(id)),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['zones'] }),
    })
}
