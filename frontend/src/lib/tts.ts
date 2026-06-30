import { API_BASE_URL } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import type { TtsVoiceGender } from '@/types/sessions'

export async function fetchSpeechAudio(
  text: string,
  voice: TtsVoiceGender = 'male',
): Promise<Blob> {
  const token = useAuthStore.getState().token

  const response = await fetch(`${API_BASE_URL}/api/tts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ text, voice }),
  })

  if (!response.ok) {
    throw new Error(`TTS request failed (${response.status})`)
  }

  return response.blob()
}
