import { api } from '@/lib/api'
import type { LoginResponse, RegisterRequest, UserRead } from '@/types/auth'

export async function login(email: string, password: string): Promise<LoginResponse> {
  const params = new URLSearchParams()
  params.append('username', email)
  params.append('password', password)

  const { data } = await api.post<LoginResponse>('/auth/jwt/login', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  return data
}

export async function register(payload: RegisterRequest): Promise<UserRead> {
  const { data } = await api.post<UserRead>('/auth/register', payload)
  return data
}

export async function fetchCurrentUser(): Promise<UserRead> {
  const { data } = await api.get<UserRead>('/users/me')
  return data
}
