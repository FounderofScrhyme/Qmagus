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

export function getStreamErrorMessage(message: string): string {
  const normalized = message.toLowerCase()

  if (
    normalized.includes('openai api key') ||
    normalized.includes('openai_not_configured')
  ) {
    return 'OpenAI APIキーが未設定です。.env の OPENAI_API_KEY に有効なキーを設定し、docker compose を再起動してください。'
  }

  if (normalized.includes('daily message limit')) {
    return '本日の送信上限（アプリ設定）に達しました。明日再度お試しください。'
  }

  if (normalized.includes('message rate limit exceeded')) {
    return '送信が集中しています（アプリの1分あたり上限）。1分ほど待ってから再度お試しください。'
  }

  if (
    normalized.includes('quota exceeded') ||
    normalized.includes('insufficient_quota') ||
    normalized.includes('exceeded your current quota')
  ) {
    return 'OpenAI APIの利用上限に達しています。https://platform.openai.com/settings/organization/billing でクレジット残高を確認してください。'
  }

  if (
    normalized.includes('temporary rate limit') ||
    normalized.includes('openai api rate limit')
  ) {
    return 'OpenAI側の一時的な利用制限です。1〜2分待ってから再度お試しください。'
  }

  if (normalized.includes('openai api key is invalid')) {
    return 'OpenAI APIキーが無効です。.env の OPENAI_API_KEY を確認し、docker compose を再起動してください。'
  }

  if (normalized.includes('rate limit')) {
    return 'リクエスト制限に達しました。しばらく待ってから再度お試しください。'
  }

  return message
}
