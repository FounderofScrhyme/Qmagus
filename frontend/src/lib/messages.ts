import { API_BASE_URL, api } from '@/lib/api'
import { parseSseChunk } from '@/lib/sse'
import { useAuthStore } from '@/stores/authStore'
import type { MessageCreate } from '@/types/messages'
import type { SessionRead } from '@/types/sessions'

interface StreamErrorOptions {
  /** True when the backend already persisted the user message before the stream failed. */
  userMessagePersisted: boolean
}

interface StreamHandlers {
  onChunk: (content: string) => void
  onDone: (messageId: string) => void | Promise<void>
  onError: (message: string, options: StreamErrorOptions) => void
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

async function readAssistantSseStream(
  response: Response,
  handlers: StreamHandlers,
  userMessagePersisted: boolean,
): Promise<boolean> {
  const reader = response.body?.getReader()
  if (!reader) {
    handlers.onError('ストリームを開始できませんでした', { userMessagePersisted })
    return false
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
        await handlers.onDone(parsed.message_id)
        return true
      } else if (event === 'error') {
        const parsed = JSON.parse(data) as { message: string }
        handlers.onError(parsed.message, { userMessagePersisted })
        return false
      }
    }
  }

  if (assistantText) {
    handlers.onError('応答が途中で終了しました', { userMessagePersisted })
  } else {
    handlers.onError('応答を受信できませんでした', { userMessagePersisted })
  }
  return false
}

async function postSseStream(
  url: string,
  handlers: StreamHandlers,
  userMessagePersisted: boolean,
  signal?: AbortSignal,
  body?: MessageCreate,
): Promise<boolean> {
  const token = useAuthStore.getState().token

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal,
  })

  if (!response.ok) {
    handlers.onError(await parseErrorMessage(response), { userMessagePersisted: false })
    return false
  }

  return readAssistantSseStream(response, handlers, userMessagePersisted)
}

export async function streamOpeningMessage(
  sessionId: string,
  handlers: StreamHandlers,
  signal?: AbortSignal,
): Promise<boolean> {
  return postSseStream(
    `${API_BASE_URL}/api/sessions/${sessionId}/opening`,
    handlers,
    false,
    signal,
  )
}

export async function streamMessage(
  sessionId: string,
  body: MessageCreate,
  handlers: StreamHandlers,
  signal?: AbortSignal,
): Promise<boolean> {
  return postSseStream(
    `${API_BASE_URL}/api/sessions/${sessionId}/messages`,
    handlers,
    true,
    signal,
    body,
  )
}

export async function completeSession(sessionId: string): Promise<SessionRead> {
  const { data } = await api.post<SessionRead>(`/api/sessions/${sessionId}/complete`)
  return data
}
