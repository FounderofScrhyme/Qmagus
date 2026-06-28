import { type FormEvent, useState } from 'react'
import { Loader2, Mic, MicOff, Send } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useVoiceTranscription } from '@/hooks/useVoiceTranscription'

interface MessageComposerProps {
  sessionId: string
  onSend: (content: string) => Promise<void>
  disabled?: boolean
  onBeforeListen?: () => void
}

export function MessageComposer({
  sessionId,
  onSend,
  disabled,
  onBeforeListen,
}: MessageComposerProps) {
  const [content, setContent] = useState('')
  const [isSending, setIsSending] = useState(false)
  const {
    isSupported,
    isRecording,
    isTranscribing,
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
        <p className="text-xs text-muted-foreground">
          録音中… 話し終わったらマイクボタンを押して文字起こしします。
        </p>
      )}
      {isTranscribing && (
        <p className="text-xs text-muted-foreground">文字起こし中…</p>
      )}
      <div className="flex gap-2">
        <Textarea
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          placeholder="英語で入力するか、マイクで話してください..."
          rows={2}
          disabled={disabled || isSending || isTranscribing}
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
