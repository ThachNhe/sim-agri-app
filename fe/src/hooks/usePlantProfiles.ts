import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPut, apiDelete } from '@/services/api'
import { API_ENDPOINTS } from '@/services/endpoints'
import type { PlantProfile } from '@/types/common.types'
import type { ApiResponse } from '@/types/api.types'

export const usePlantProfiles = (enabled = true) =>
    useQuery({
        queryKey: ['plant-profiles'],
        queryFn: () => apiGet<ApiResponse<PlantProfile[]>>(API_ENDPOINTS.PLANT_PROFILES.LIST),
        enabled,
    })

export const usePlantProfile = (id: string | undefined) =>
    useQuery({
        queryKey: ['plant-profiles', id],
        queryFn: () => apiGet<ApiResponse<PlantProfile>>(API_ENDPOINTS.PLANT_PROFILES.BY_ID(id!)),
        enabled: !!id,
    })

export const useCreatePlantProfile = () => {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (data: Partial<PlantProfile>) =>
            apiPost<ApiResponse<PlantProfile>>(API_ENDPOINTS.PLANT_PROFILES.CREATE, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['plant-profiles'] }),
    })
}

export const useUpdatePlantProfile = (id: string) => {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (data: Partial<PlantProfile>) =>
            apiPut<ApiResponse<PlantProfile>>(API_ENDPOINTS.PLANT_PROFILES.UPDATE(id), data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['plant-profiles'] }),
    })
}

export const useDeletePlantProfile = () => {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => apiDelete(API_ENDPOINTS.PLANT_PROFILES.DELETE(id)),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['plant-profiles'] }),
    })
}
