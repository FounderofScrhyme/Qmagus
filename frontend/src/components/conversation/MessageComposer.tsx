import { type FormEvent, useState } from 'react'
import { Mic, MicOff, Send } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'

interface MessageComposerProps {
  onSend: (content: string) => Promise<void>
  disabled?: boolean
}

export function MessageComposer({ onSend, disabled }: MessageComposerProps) {
  const [content, setContent] = useState('')
  const [isSending, setIsSending] = useState(false)
  const { isSupported, isListening, startListening, stopListening } = useSpeechRecognition()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = content.trim()
    if (!trimmed || disabled || isSending) return

    setIsSending(true)
    try {
      await onSend(trimmed)
      setContent('')
    } finally {
      setIsSending(false)
    }
  }

  const handleMicClick = () => {
    if (isListening) {
      stopListening()
      return
    }

    startListening((transcript) => {
      setContent((prev) => (prev ? `${prev} ${transcript}` : transcript))
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 border-t border-border p-4">
      {!isSupported && (
        <p className="text-xs text-muted-foreground">
          お使いのブラウザは音声入力に対応していません。テキストで入力してください。
        </p>
      )}
      <div className="flex gap-2">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="英語で入力するか、マイクで話してください..."
          rows={2}
          disabled={disabled || isSending}
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
              variant={isListening ? 'destructive' : 'outline'}
              size="icon"
              disabled={disabled || isSending}
              onClick={handleMicClick}
              aria-label={isListening ? '音声入力を停止' : '音声入力を開始'}
            >
              {isListening ? <MicOff /> : <Mic />}
            </Button>
          )}
          <Button
            type="submit"
            size="icon"
            disabled={disabled || isSending || !content.trim()}
            aria-label="送信"
          >
            <Send />
          </Button>
        </div>
      </div>
    </form>
  )
}
