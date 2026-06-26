import { isAxiosError } from 'axios'

interface ApiErrorBody {
  error?: {
    code?: string
    message?: string
  }
  detail?: string | { reason?: string; message?: string }
}

export function getErrorMessage(error: unknown, fallback = 'エラーが発生しました'): string {
  if (!isAxiosError<ApiErrorBody>(error)) {
    return error instanceof Error ? error.message : fallback
  }

  const data = error.response?.data
  if (data?.error?.message) {
    return data.error.message
  }

  if (typeof data?.detail === 'string') {
    return data.detail
  }

  if (data?.detail && typeof data.detail === 'object') {
    if (data.detail.reason) return data.detail.reason
    if (data.detail.message) return data.detail.message
  }

  return fallback
}
