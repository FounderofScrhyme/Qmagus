import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { fetchCurrentUser, login as apiLogin, register as apiRegister } from '@/lib/auth'
import type { UserRead } from '@/types/auth'

interface AuthState {
  token: string | null
  user: UserRead | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
  hydrate: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true })
        try {
          const { access_token } = await apiLogin(email, password)
          set({ token: access_token })
          const user = await fetchCurrentUser()
          set({ user })
        } finally {
          set({ isLoading: false })
        }
      },

      register: async (email, password) => {
        set({ isLoading: true })
        try {
          await apiRegister({ email, password })
          await get().login(email, password)
        } finally {
          set({ isLoading: false })
        }
      },

      logout: () => {
        set({ token: null, user: null })
      },

      hydrate: async () => {
        const { token } = get()
        if (!token) return

        set({ isLoading: true })
        try {
          const user = await fetchCurrentUser()
          set({ user })
        } catch {
          set({ token: null, user: null })
        } finally {
          set({ isLoading: false })
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token }),
    },
  ),
)

export const selectIsAuthenticated = (state: AuthState) => Boolean(state.token)
