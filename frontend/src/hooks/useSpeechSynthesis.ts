import { useCallback, useEffect, useRef, useState } from 'react'

import { fetchSpeechAudio } from '@/lib/tts'
import type { TtsVoiceGender } from '@/types/sessions'

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
  'nova',
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

function pickBrowserVoice(ttsVoice: TtsVoiceGender): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices().filter((voice) =>
    voice.lang.toLowerCase().startsWith('en'),
  )
  if (voices.length === 0) return null

  if (ttsVoice === 'female') {
    const female = voices.find((voice) => isLikelyFemaleVoice(voice))
    if (female) return female
  }

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

export function useSpeechSynthesis(ttsVoice: TtsVoiceGender = 'male') {
  const [isSupported] = useState(true)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const progressFrameRef = useRef<number | null>(null)
  const ttsVoiceRef = useRef(ttsVoice)
  const playbackIdRef = useRef(0)
  const replayLockRef = useRef(false)

  useEffect(() => {
    ttsVoiceRef.current = ttsVoice
  }, [ttsVoice])

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
    playbackIdRef.current += 1
    cleanupAudio()
    window.speechSynthesis?.cancel()
    utteranceRef.current = null
    setIsSpeaking(false)
  }, [cleanupAudio])

  const speakWithBrowser = useCallback(
    (text: string, playbackId: number, onProgress?: (visibleText: string) => void) =>
      new Promise<void>((resolve) => {
        if (!window.speechSynthesis) {
          onProgress?.(text)
          resolve()
          return
        }

        if (playbackId !== playbackIdRef.current) {
          resolve()
          return
        }

        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = 'en-US'
        utterance.rate = 0.92
        utterance.pitch = ttsVoiceRef.current === 'female' ? 1.05 : 0.9

        const assignVoiceAndSpeak = () => {
          if (playbackId !== playbackIdRef.current) {
            resolve()
            return
          }
          const voice = pickBrowserVoice(ttsVoiceRef.current)
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
          if (playbackId !== playbackIdRef.current) {
            resolve()
            return
          }
          utteranceRef.current = null
          setIsSpeaking(false)
          onProgress?.(text)
          resolve()
        }
        utterance.onerror = () => {
          if (playbackId !== playbackIdRef.current) {
            resolve()
            return
          }
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
    async (
      text: string,
      playbackId: number,
      onProgress?: (visibleText: string) => void,
    ) => {
      const blob = await fetchSpeechAudio(text, ttsVoiceRef.current)
      if (playbackId !== playbackIdRef.current) return

      const url = URL.createObjectURL(blob)
      objectUrlRef.current = url

      const audio = new Audio(url)
      audioRef.current = audio

      await new Promise<void>((resolve, reject) => {
        const isStale = () => playbackId !== playbackIdRef.current

        const updateProgress = () => {
          if (!audio.duration || !Number.isFinite(audio.duration)) return
          onProgress?.(sliceTextByProgress(text, audio.currentTime / audio.duration))
        }

        const tick = () => {
          if (isStale()) return
          updateProgress()
          progressFrameRef.current = requestAnimationFrame(tick)
        }

        audio.onloadedmetadata = () => {
          if (!isStale()) onProgress?.('')
        }
        audio.onplay = () => {
          if (isStale()) {
            cleanupAudio()
            resolve()
            return
          }
          setIsSpeaking(true)
          tick()
        }
        audio.onended = () => {
          if (isStale()) {
            resolve()
            return
          }
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
          if (isStale()) {
            resolve()
            return
          }
          cleanupAudio()
          setIsSpeaking(false)
          reject(new Error('Audio playback failed'))
        }
        void audio.play().catch((err) => {
          if (isStale()) {
            resolve()
            return
          }
          reject(err)
        })
      })
    },
    [cleanupAudio],
  )

  const speakSynced = useCallback(
    async (text: string, onProgress: (visibleText: string) => void) => {
      const trimmed = text.trim()
      if (!trimmed) return

      stop()
      const playbackId = playbackIdRef.current
      onProgress('')

      try {
        await speakWithOpenAI(trimmed, playbackId, onProgress)
      } catch {
        if (playbackId !== playbackIdRef.current) return
        await speakWithBrowser(trimmed, playbackId, onProgress)
      }
    },
    [stop, speakWithOpenAI, speakWithBrowser],
  )

  const speak = useCallback(
    (text: string) => {
      if (replayLockRef.current) return

      const trimmed = text.trim()
      if (!trimmed) return

      replayLockRef.current = true
      void speakSynced(trimmed, () => {}).finally(() => {
        replayLockRef.current = false
      })
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
