import type { components } from '@/types/api.generated'

export type UserRead = components['schemas']['UserRead']
export type LoginResponse = components['schemas']['BearerResponse']
export type RegisterRequest = Pick<
  components['schemas']['UserCreate'],
  'email' | 'password'
>
