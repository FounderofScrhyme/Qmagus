import { api } from '@/lib/api'
import type { SessionCreate, SessionDetailRead, SessionRead } from '@/types/sessions'

export async function listSessions(limit = 20, offset = 0): Promise<SessionRead[]> {
  const { data } = await api.get<SessionRead[]>('/api/sessions', {
    params: { limit, offset },
  })
  return data
}

export async function createSession(body: SessionCreate): Promise<SessionRead> {
  const { data } = await api.post<SessionRead>('/api/sessions', body)
  return data
}

export async function getSession(sessionId: string): Promise<SessionDetailRead> {
  const { data } = await api.get<SessionDetailRead>(`/api/sessions/${sessionId}`)
  return data
}
