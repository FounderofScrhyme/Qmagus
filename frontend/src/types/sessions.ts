export type TtsVoiceGender = 'male' | 'female'

export type SessionStatus = 'active' | 'completed'

export interface SessionRead {
  id: string
  scenario_text: string
  setting: string | null
  user_role: string | null
  ai_role: string | null
  goal: string | null
  tts_voice: TtsVoiceGender
  status: SessionStatus
  created_at: string
  completed_at: string | null
}

export interface MessageRead {
  id: string
  role: string
  content: string
  created_at: string
}

export interface SessionDetailRead extends SessionRead {
  messages: MessageRead[]
}

export interface SessionCreate {
  setting: string
  user_role: string
  ai_role: string
  goal: string
  tts_voice: TtsVoiceGender
}

export function sessionTitle(session: SessionRead): string {
  return session.setting ?? session.scenario_text
}

export function sessionSubtitle(session: SessionRead): string {
  if (session.setting && session.ai_role) {
    return `AIの役: ${session.ai_role}`
  }
  return session.scenario_text
}
