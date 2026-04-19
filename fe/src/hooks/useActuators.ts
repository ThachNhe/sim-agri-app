import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPatch, apiDelete } from '@/services/api'
import { API_ENDPOINTS } from '@/services/endpoints'
import type { Actuator, ActuatorCommand, ActuatorState } from '@/types/common.types'
import type { ApiResponse } from '@/types/api.types'

export const useActuators = (zoneId: string | undefined, enabled = true) =>
    useQuery({
        queryKey: ['actuators', zoneId],
        queryFn: () =>
            apiGet<ApiResponse<Actuator[]>>(API_ENDPOINTS.ACTUATORS.LIST, { zone_id: zoneId }),
        enabled: !!zoneId && enabled,
    })

export const useCreateActuator = () => {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (data: Partial<Actuator>) =>
            apiPost<ApiResponse<Actuator>>(API_ENDPOINTS.ACTUATORS.CREATE, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['actuators'] }),
    })
}

export const useUpdateActuator = () => {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Actuator> }) =>
            apiPatch<ApiResponse<Actuator>>(API_ENDPOINTS.ACTUATORS.UPDATE(id), data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['actuators'] }),
    })
}

export const useDeleteActuator = () => {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => apiDelete(API_ENDPOINTS.ACTUATORS.DELETE(id)),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['actuators'] }),
    })
}

export const useSendCommand = (actuatorId: string) => {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({
            command,
            duration_seconds,
            reason,
        }: {
            command: ActuatorState
            duration_seconds?: number
            reason?: string
        }) =>
            apiPost<ApiResponse<ActuatorCommand>>(API_ENDPOINTS.ACTUATORS.COMMAND(actuatorId), {
                command,
                duration_seconds,
                reason,
            }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['actuators'] })
            qc.invalidateQueries({ queryKey: ['actuator-commands', actuatorId] })
        },
    })
}

export const useActuatorCommands = (actuatorId: string | undefined) =>
    useQuery({
        queryKey: ['actuator-commands', actuatorId],
        queryFn: () =>
            apiGet<ApiResponse<ActuatorCommand[]>>(API_ENDPOINTS.ACTUATORS.COMMANDS(actuatorId!)),
        enabled: !!actuatorId,
    })
