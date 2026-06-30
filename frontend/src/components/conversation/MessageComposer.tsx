import { type FormEvent, useEffect, useRef, useState } from 'react'
import { Loader2, Mic, MicOff, RotateCcw, Send } from 'lucide-react'

import { RecordingWaveform } from '@/components/conversation/RecordingWaveform'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useVoiceTranscription } from '@/hooks/useVoiceTranscription'

interface MessageComposerProps {
  sessionId: string
  onSend: (content: string) => Promise<void>
  disabled?: boolean
  onBeforeListen?: () => void
  pendingRerecord?: number
}

export function MessageComposer({
  sessionId,
  onSend,
  disabled,
  onBeforeListen,
  pendingRerecord = 0,
}: MessageComposerProps) {
  const [content, setContent] = useState('')
  const [isSending, setIsSending] = useState(false)
  const lastRerecordRef = useRef(0)
  const {
    isSupported,
    isRecording,
    isTranscribing,
    waveformLevels,
    error,
    startRecording,
    stopRecording,
    cancel,
    clearError,
  } = useVoiceTranscription({
    sessionId,
    onTranscript: (transcript) => {
      setContent((prev) => (prev ? `${prev} ${transcript}` : transcript))
    },
  })

  const isBusy = isRecording || isTranscribing
  const canRedoTranscription =
    Boolean(content.trim()) && !isBusy && !isSending && !disabled && isSupported

  useEffect(() => {
    if (pendingRerecord <= 0 || pendingRerecord === lastRerecordRef.current) return
    lastRerecordRef.current = pendingRerecord
    setContent('')
    clearError()
    onBeforeListen?.()
    void startRecording()
  }, [pendingRerecord, startRecording, clearError, onBeforeListen])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (isRecording) {
      await stopRecording()
      return
    }
    if (isTranscribing) return

    const trimmed = content.trim()
    if (!trimmed || disabled || isSending) return

    setIsSending(true)
    try {
      await onSend(trimmed)
      setContent('')
    } catch {
      setContent(trimmed)
    } finally {
      setIsSending(false)
    }
  }

  const handleMicClick = async () => {
    clearError()
    onBeforeListen?.()

    if (isRecording) {
      await stopRecording()
      return
    }

    if (isTranscribing) return

    await startRecording()
  }

  const handleRedoTranscription = () => {
    setContent('')
    clearError()
    onBeforeListen?.()
    void startRecording()
  }

  const handleContentChange = (value: string) => {
    if (isBusy) cancel()
    setContent(value)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 border-t border-border p-4">
      {!isSupported && (
        <p className="text-xs text-muted-foreground">
          お使いのブラウザは音声入力に対応していません。テキストで入力してください。
        </p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
      {isRecording && (
        <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium text-primary">録音中</p>
            <p className="text-xs text-muted-foreground">
              話し終わったらマイクボタンを押してください
            </p>
          </div>
          <RecordingWaveform levels={waveformLevels} />
        </div>
      )}
      {isTranscribing && (
        <p className="text-xs text-muted-foreground">文字起こし中…</p>
      )}
      {canRedoTranscription && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={handleRedoTranscription}
          >
            <RotateCcw className="size-3.5" />
            文字起こしをやり直す
          </Button>
        </div>
      )}
      <div className="flex gap-2">
        <Textarea
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          placeholder="英語で入力するか、マイクで話してください..."
          rows={2}
          disabled={disabled || isSending || isTranscribing || isRecording}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void handleSubmit(e)
            }
          }}
        />
        <div className="flex shrink-0 flex-col gap-2">
          {isSupported && (
            <Button
              type="button"
              variant={isRecording ? 'destructive' : 'outline'}
              size="icon"
              disabled={disabled || isSending || isTranscribing}
              onClick={() => void handleMicClick()}
              aria-label={isRecording ? '録音を停止して文字起こし' : '録音を開始'}
              className={isRecording ? 'animate-pulse' : undefined}
            >
              {isTranscribing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : isRecording ? (
                <MicOff />
              ) : (
                <Mic />
              )}
            </Button>
          )}
          <Button
            type="submit"
            size="icon"
            disabled={disabled || isSending || isTranscribing || !content.trim()}
            aria-label="送信"
          >
            <Send />
          </Button>
        </div>
      </div>
    </form>
  )
}
