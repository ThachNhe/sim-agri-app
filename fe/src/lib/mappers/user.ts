import type { User, UserRole, UserStatus } from '@/types/common.types'

export interface BackendUserResponse {
    id: string
    email: string
    full_name: string | null
    role: UserRole
    status: UserStatus
    is_verified: boolean
    created_at: string
    updated_at: string
}

export function mapBackendUser(user: BackendUserResponse): User {
    return {
        id: user.id,
        email: user.email,
        name: user.full_name?.trim() || user.email,
        role: user.role,
        status: user.status,
        isVerified: user.is_verified,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
    }
}

export function mapBackendUsers(users: BackendUserResponse[]): User[] {
    return users.map(mapBackendUser)
}

export function toBackendRegisterPayload(payload: {
    name: string
    email: string
    password: string
}) {
    return {
        full_name: payload.name,
        email: payload.email,
        password: payload.password,
    }
}

export function toBackendCreateFarmerPayload(payload: {
    fullName: string
    email: string
}) {
    return {
        full_name: payload.fullName,
        email: payload.email,
    }
}