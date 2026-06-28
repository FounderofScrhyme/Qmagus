import { API_BASE_URL } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

interface TranscribeResponse {
  text: string
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

export async function transcribeAudio(
  sessionId: string,
  audio: Blob,
  filename: string,
  signal?: AbortSignal,
): Promise<string> {
  const token = useAuthStore.getState().token
  const formData = new FormData()
  formData.append('audio', audio, filename)

  const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/transcribe`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
    signal,
  })

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response))
  }

  const data = (await response.json()) as TranscribeResponse
  return data.text.trim()
}

export function pickRecorderMimeType(): string {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? 'audio/webm'
}

export function filenameForMimeType(mimeType: string): string {
  if (mimeType.includes('mp4')) return 'recording.m4a'
  if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return 'recording.mp3'
  if (mimeType.includes('wav')) return 'recording.wav'
  return 'recording.webm'
}
