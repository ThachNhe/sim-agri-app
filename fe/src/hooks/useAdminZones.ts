import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiDelete, apiGet, apiPost, apiPut } from '@/services/api'
import { API_ENDPOINTS } from '@/services/endpoints'
import type { AssignedFarmerBrief, GrowingZone, GrowingZoneAdminResponse } from '@/types/common.types'
import type { ApiResponse } from '@/types/api.types'

/** Admin: danh sách tất cả khu vực kèm farmers được assign */
export const useAdminZones = (enabled = true) =>
    useQuery({
        queryKey: ['admin-zones'],
        queryFn: () => apiGet<ApiResponse<GrowingZoneAdminResponse[]>>(API_ENDPOINTS.ADMIN.ZONES),
        enabled,
    })

export const useAdminCreateZone = () => {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (data: Partial<GrowingZone>) =>
            apiPost<ApiResponse<GrowingZoneAdminResponse>>(API_ENDPOINTS.ADMIN.CREATE_ZONE, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-zones'] }),
    })
}

export const useAdminUpdateZone = () => {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<GrowingZone> }) =>
            apiPut<ApiResponse<GrowingZoneAdminResponse>>(API_ENDPOINTS.ADMIN.UPDATE_ZONE(id), data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-zones'] }),
    })
}

export const useAdminDeleteZone = () => {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => apiDelete(API_ENDPOINTS.ADMIN.DELETE_ZONE(id)),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-zones'] }),
    })
}

export const useAssignFarmer = () => {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ zoneId, farmerId }: { zoneId: string; farmerId: string }) =>
            apiPost<ApiResponse<GrowingZoneAdminResponse>>(API_ENDPOINTS.ADMIN.ASSIGN_FARMER(zoneId), {
                farmer_id: farmerId,
            }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-zones'] }),
    })
}

export const useUnassignFarmer = () => {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ zoneId, farmerId }: { zoneId: string; farmerId: string }) =>
            apiDelete(API_ENDPOINTS.ADMIN.UNASSIGN_FARMER(zoneId, farmerId)),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-zones'] }),
    })
}

export type { AssignedFarmerBrief }
