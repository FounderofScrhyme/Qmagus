import { useCallback, useEffect, useRef, useState } from 'react'

const MIC_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: false,
  autoGainControl: true,
}

function getSpeechRecognitionErrorMessage(error: string): string {
  switch (error) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'マイクへのアクセスが拒否されました。ブラウザの設定を確認してください。'
    case 'audio-capture':
      return 'マイクが見つかりません。接続を確認してください。'
    case 'network':
      return '音声認識にネットワーク接続が必要です。'
    default:
      return '音声入力に失敗しました。もう一度お試しください。'
  }
}

export function useSpeechRecognition() {
  const [isSupported, setIsSupported] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [interimTranscript, setInterimTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const listeningRef = useRef(false)
  const onResultRef = useRef<((transcript: string) => void) | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)

  const releaseMicrophone = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop())
    mediaStreamRef.current = null
  }, [])

  useEffect(() => {
    const SpeechRecognitionCtor =
      window.SpeechRecognition ?? window.webkitSpeechRecognition
    const hasMediaDevices = Boolean(navigator.mediaDevices?.getUserMedia)
    setIsSupported(Boolean(SpeechRecognitionCtor && hasMediaDevices))

    if (!SpeechRecognitionCtor) return

    const recognition = new SpeechRecognitionCtor()
    recognition.lang = 'en-US'
    recognition.interimResults = true
    recognition.continuous = true
    recognition.maxAlternatives = 3
    recognitionRef.current = recognition

    recognition.onstart = () => {
      setIsListening(true)
      setError(null)
    }

    recognition.onresult = (event) => {
      let interim = ''
      let final = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const transcript = result[0]?.transcript ?? ''
        if (result.isFinal) {
          final += transcript
        } else {
          interim += transcript
        }
      }

      setInterimTranscript(interim.trim())

      const finalized = final.trim()
      if (finalized) {
        onResultRef.current?.(finalized)
        setInterimTranscript('')
      }
    }

    recognition.onerror = (event) => {
      // Silence timeouts are common; keep listening until the user stops.
      if (event.error === 'no-speech' || event.error === 'aborted') {
        return
      }

      listeningRef.current = false
      setIsListening(false)
      setInterimTranscript('')
      releaseMicrophone()
      setError(getSpeechRecognitionErrorMessage(event.error))
    }

    recognition.onend = () => {
      if (listeningRef.current) {
        try {
          recognition.start()
        } catch {
          listeningRef.current = false
          setIsListening(false)
          releaseMicrophone()
        }
        return
      }

      setIsListening(false)
      setInterimTranscript('')
      releaseMicrophone()
    }

    return () => {
      listeningRef.current = false
      recognition.abort()
      releaseMicrophone()
    }
  }, [releaseMicrophone])

  const startListening = useCallback(
    async (onResult: (transcript: string) => void) => {
      const recognition = recognitionRef.current
      if (!recognition) return

      setError(null)
      setInterimTranscript('')
      onResultRef.current = onResult

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: MIC_CONSTRAINTS,
        })
        mediaStreamRef.current?.getTracks().forEach((track) => track.stop())
        mediaStreamRef.current = stream
      } catch {
        setError('マイクへのアクセスが拒否されました。ブラウザの設定を確認してください。')
        return
      }

      listeningRef.current = true

      try {
        recognition.start()
      } catch {
        listeningRef.current = false
        releaseMicrophone()
        setError('音声入力を開始できませんでした。もう一度お試しください。')
      }
    },
    [releaseMicrophone],
  )

  const stopListening = useCallback(() => {
    listeningRef.current = false
    setInterimTranscript('')
    recognitionRef.current?.stop()
    releaseMicrophone()
    setIsListening(false)
  }, [releaseMicrophone])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    isSupported,
    isListening,
    interimTranscript,
    error,
    startListening,
    stopListening,
    clearError,
  }
}
