import { API_BASE_URL, api } from '@/lib/api'
import { parseSseChunk } from '@/lib/sse'
import { useAuthStore } from '@/stores/authStore'
import type { MessageCreate } from '@/types/messages'
import type { SessionRead } from '@/types/sessions'

interface StreamHandlers {
  onChunk: (content: string) => void
  onDone: (messageId: string) => void
  onError: (message: string) => void
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as {
      error?: { message?: string }
      detail?: string
    }
    return body.error?.message ?? body.detail ?? `Request failed (${response.status})`
  } catch {
    return `Request failed (${response.status})`
  }
}

export async function streamMessage(
  sessionId: string,
  body: MessageCreate,
  handlers: StreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const token = useAuthStore.getState().token

  const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    signal,
  })

  if (!response.ok) {
    handlers.onError(await parseErrorMessage(response))
    return
  }

  const reader = response.body?.getReader()
  if (!reader) {
    handlers.onError('ストリームを開始できませんでした')
    return
  }

  const decoder = new TextDecoder()
  let buffer = ''
  let assistantText = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const { events, remaining } = parseSseChunk(buffer)
    buffer = remaining

    for (const { event, data } of events) {
      if (event === 'chunk') {
        const parsed = JSON.parse(data) as { content: string }
        assistantText += parsed.content
        handlers.onChunk(parsed.content)
      } else if (event === 'done') {
        const parsed = JSON.parse(data) as { message_id: string }
        handlers.onDone(parsed.message_id)
        return
      } else if (event === 'error') {
        const parsed = JSON.parse(data) as { message: string }
        handlers.onError(parsed.message)
        return
      }
    }
  }

  if (assistantText) {
    handlers.onError('応答が途中で終了しました')
  } else {
    handlers.onError('応答を受信できませんでした')
  }
}

export async function completeSession(sessionId: string): Promise<SessionRead> {
  const { data } = await api.post<SessionRead>(`/api/sessions/${sessionId}/complete`)
  return data
}
