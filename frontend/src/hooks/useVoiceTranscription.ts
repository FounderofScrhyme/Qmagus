import { useCallback, useEffect, useRef, useState } from 'react'

import { filenameForMimeType, pickRecorderMimeType, transcribeAudio } from '@/lib/transcribe'

const MAX_RECORDING_MS = 60_000

interface UseVoiceTranscriptionOptions {
  sessionId: string
  onTranscript?: (text: string) => void
}

export function useVoiceTranscription({ sessionId, onTranscript }: UseVoiceTranscriptionOptions) {
  const [isSupported, setIsSupported] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mediaStreamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const mimeTypeRef = useRef('audio/webm')
  const abortRef = useRef<AbortController | null>(null)
  const maxDurationTimerRef = useRef<number | null>(null)
  const onTranscriptRef = useRef(onTranscript)

  useEffect(() => {
    onTranscriptRef.current = onTranscript
  }, [onTranscript])

  const releaseMicrophone = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop())
    mediaStreamRef.current = null
  }, [])

  const clearMaxDurationTimer = useCallback(() => {
    if (maxDurationTimerRef.current !== null) {
      window.clearTimeout(maxDurationTimerRef.current)
      maxDurationTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    const supported =
      typeof window !== 'undefined' &&
      Boolean(navigator.mediaDevices?.getUserMedia) &&
      typeof MediaRecorder !== 'undefined'
    setIsSupported(supported)

    return () => {
      clearMaxDurationTimer()
      abortRef.current?.abort()
      mediaRecorderRef.current?.stop()
      releaseMicrophone()
    }
  }, [clearMaxDurationTimer, releaseMicrophone])

  const transcribeRecording = useCallback(
    async (audio: Blob) => {
      if (!audio.size) {
        setError('音声が短すぎます。もう少し長く話してから停止してください。')
        return null
      }

      setIsTranscribing(true)
      setError(null)
      abortRef.current?.abort()
      abortRef.current = new AbortController()

      try {
        const text = await transcribeAudio(
          sessionId,
          audio,
          filenameForMimeType(mimeTypeRef.current),
          abortRef.current.signal,
        )
        if (text) {
          onTranscriptRef.current?.(text)
        }
        return text
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return null
        }
        const message = err instanceof Error ? err.message : '文字起こしに失敗しました'
        setError(message)
        return null
      } finally {
        setIsTranscribing(false)
      }
    },
    [sessionId],
  )

  const stopRecording = useCallback(async (): Promise<string | null> => {
    clearMaxDurationTimer()

    const recorder = mediaRecorderRef.current
    if (!recorder || recorder.state === 'inactive') {
      setIsRecording(false)
      releaseMicrophone()
      return null
    }

    const audio = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current })
        chunksRef.current = []
        resolve(blob)
      }
      recorder.stop()
    })

    mediaRecorderRef.current = null
    setIsRecording(false)
    releaseMicrophone()

    return transcribeRecording(audio)
  }, [clearMaxDurationTimer, releaseMicrophone, transcribeRecording])

  const startRecording = useCallback(async () => {
    if (!sessionId) return

    setError(null)
    abortRef.current?.abort()

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      mediaStreamRef.current = stream

      const mimeType = pickRecorderMimeType()
      mimeTypeRef.current = mimeType
      const recorder = new MediaRecorder(stream, { mimeType })
      chunksRef.current = []

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      recorder.start()
      mediaRecorderRef.current = recorder
      setIsRecording(true)

      clearMaxDurationTimer()
      maxDurationTimerRef.current = window.setTimeout(() => {
        void stopRecording()
      }, MAX_RECORDING_MS)
    } catch {
      releaseMicrophone()
      setError('マイクへのアクセスが拒否されました。ブラウザの設定を確認してください。')
    }
  }, [sessionId, clearMaxDurationTimer, releaseMicrophone, stopRecording])

  const cancel = useCallback(() => {
    clearMaxDurationTimer()
    abortRef.current?.abort()
    chunksRef.current = []
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = null
      mediaRecorderRef.current.stop()
    }
    mediaRecorderRef.current = null
    setIsRecording(false)
    setIsTranscribing(false)
    releaseMicrophone()
  }, [clearMaxDurationTimer, releaseMicrophone])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    isSupported,
    isRecording,
    isTranscribing,
    isListening: isRecording || isTranscribing,
    error,
    startRecording,
    stopRecording,
    cancel,
    clearError,
  }
}
