import { useCallback, useEffect, useRef, useState } from 'react'

import { fetchSpeechAudio } from '@/lib/tts'

const PREFERRED_MALE_VOICE_NAMES = [
  'onyx',
  'Google US English Male',
  'Google UK English Male',
  'Microsoft David',
  'Microsoft Guy',
  'Daniel',
  'Alex',
  'Fred',
  'David',
  'Mark',
  'Aaron',
  'Tom',
]

const FEMALE_VOICE_HINTS = [
  'female',
  'samantha',
  'karen',
  'victoria',
  'susan',
  'kate',
  'fiona',
  'moira',
  'tessa',
  'zira',
  'hazel',
  'serena',
  'allison',
  'ava',
  'sara',
  'joanna',
  'ivy',
  'emma',
]

function sliceTextByProgress(text: string, progress: number): string {
  const clamped = Math.min(1, Math.max(0, progress))
  if (clamped >= 1) return text
  return text.slice(0, Math.max(0, Math.ceil(text.length * clamped)))
}

function isLikelyFemaleVoice(voice: SpeechSynthesisVoice): boolean {
  const name = voice.name.toLowerCase()
  return FEMALE_VOICE_HINTS.some((hint) => name.includes(hint))
}

function pickBrowserMaleVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices().filter((voice) =>
    voice.lang.toLowerCase().startsWith('en'),
  )
  if (voices.length === 0) return null

  for (const preferred of PREFERRED_MALE_VOICE_NAMES) {
    const match = voices.find((voice) =>
      voice.name.toLowerCase().includes(preferred.toLowerCase()),
    )
    if (match && !isLikelyFemaleVoice(match)) return match
  }

  const nonFemale = voices.filter((voice) => !isLikelyFemaleVoice(voice))
  return (
    nonFemale.find((voice) => !voice.localService) ??
    nonFemale[0] ??
    voices[0] ??
    null
  )
}

export function useSpeechSynthesis() {
  const [isSupported] = useState(true)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const progressFrameRef = useRef<number | null>(null)

  const cleanupAudio = useCallback(() => {
    if (progressFrameRef.current !== null) {
      cancelAnimationFrame(progressFrameRef.current)
      progressFrameRef.current = null
    }
    audioRef.current?.pause()
    audioRef.current = null
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
  }, [])

  const stop = useCallback(() => {
    cleanupAudio()
    window.speechSynthesis?.cancel()
    utteranceRef.current = null
    setIsSpeaking(false)
  }, [cleanupAudio])

  const speakWithBrowser = useCallback(
  (text: string, onProgress?: (visibleText: string) => void) =>
    new Promise<void>((resolve) => {
      if (!window.speechSynthesis) {
        onProgress?.(text)
        resolve()
        return
      }

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'en-US'
      utterance.rate = 0.92
      utterance.pitch = 0.9

      const assignVoiceAndSpeak = () => {
        const voice = pickBrowserMaleVoice()
        if (voice) utterance.voice = voice
        utteranceRef.current = utterance
        window.speechSynthesis.speak(utterance)
      }

      utterance.onstart = () => {
        setIsSpeaking(true)
        onProgress?.('')
      }
      utterance.onboundary = (event) => {
        if (event.charIndex === undefined) return
        const end = event.charIndex + (event.charLength ?? 0)
        onProgress?.(text.slice(0, end))
      }
      utterance.onend = () => {
        utteranceRef.current = null
        setIsSpeaking(false)
        onProgress?.(text)
        resolve()
      }
      utterance.onerror = () => {
        utteranceRef.current = null
        setIsSpeaking(false)
        onProgress?.(text)
        resolve()
      }

      if (window.speechSynthesis.getVoices().length === 0) {
        const handleVoicesChanged = () => {
          window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged)
          assignVoiceAndSpeak()
        }
        window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged)
        return
      }

      assignVoiceAndSpeak()
    }),
    [],
  )

  const speakWithOpenAI = useCallback(
    async (text: string, onProgress?: (visibleText: string) => void) => {
      const blob = await fetchSpeechAudio(text)
      const url = URL.createObjectURL(blob)
      objectUrlRef.current = url

      const audio = new Audio(url)
      audioRef.current = audio

      await new Promise<void>((resolve, reject) => {
        const updateProgress = () => {
          if (!audio.duration || !Number.isFinite(audio.duration)) return
          onProgress?.(sliceTextByProgress(text, audio.currentTime / audio.duration))
        }

        const tick = () => {
          updateProgress()
          progressFrameRef.current = requestAnimationFrame(tick)
        }

        audio.onloadedmetadata = () => onProgress?.('')
        audio.onplay = () => {
          setIsSpeaking(true)
          tick()
        }
        audio.onended = () => {
          if (progressFrameRef.current !== null) {
            cancelAnimationFrame(progressFrameRef.current)
            progressFrameRef.current = null
          }
          onProgress?.(text)
          cleanupAudio()
          setIsSpeaking(false)
          resolve()
        }
        audio.onerror = () => {
          cleanupAudio()
          setIsSpeaking(false)
          reject(new Error('Audio playback failed'))
        }
        void audio.play().catch(reject)
      })
    },
    [cleanupAudio],
  )

  const speakSynced = useCallback(
    async (text: string, onProgress: (visibleText: string) => void) => {
      const trimmed = text.trim()
      if (!trimmed) return

      stop()
      onProgress('')

      try {
        await speakWithOpenAI(trimmed, onProgress)
      } catch {
        await speakWithBrowser(trimmed, onProgress)
      }
    },
    [stop, speakWithOpenAI, speakWithBrowser],
  )

  const speak = useCallback(
    (text: string) => {
      void speakSynced(text, () => {})
    },
    [speakSynced],
  )

  useEffect(() => {
    return () => {
      stop()
    }
  }, [stop])

  return { isSupported, isSpeaking, speak, speakSynced, stop }
}
