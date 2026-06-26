import { api } from '@/lib/api'
import type { FeedbackResponse } from '@/types/feedback'

export async function generateFeedback(sessionId: string): Promise<FeedbackResponse> {
  const { data } = await api.post<FeedbackResponse>(`/api/sessions/${sessionId}/feedback`)
  return data
}
