import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { User } from '@/types/common.types'

interface AuthState {
  // State
  user: User | null
  isAuthenticated: boolean

  // Actions
  setUser: (user: User) => void
  login: (user: User) => void
  logout: () => void
  updateUser: (partial: Partial<User>) => void
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set) => ({
        // Initial state
        user: null,
        isAuthenticated: false,

        // Actions
        setUser: (user) => set({ user }, false, 'auth/setUser'),

        login: (user) =>
          set({ user, isAuthenticated: true }, false, 'auth/login'),

        logout: () =>
          set(
            { user: null, isAuthenticated: false },
            false,
            'auth/logout',
          ),

        updateUser: (partial) =>
          set(
            (state) => ({
              user: state.user ? { ...state.user, ...partial } : null,
            }),
            false,
            'auth/updateUser',
          ),
      }),
      {
        name: 'auth-storage',
        partialize: (state) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
        }),
      },
    ),
    { name: 'AuthStore' },
  ),
)
