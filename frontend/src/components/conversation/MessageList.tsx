import { useEffect, useRef } from 'react'
import { Loader2, Mic, Volume2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { MessageRead } from '@/types/messages'

interface MessageBubbleProps {
  message: MessageRead
  canSpeak?: boolean
  onSpeak?: (text: string) => void
  showRedo?: boolean
  onRedo?: () => void
  isRedoing?: boolean
}

export function MessageBubble({
  message,
  canSpeak,
  onSpeak,
  showRedo,
  onRedo,
  isRedoing,
}: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div className={cn('flex flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
      <div className={cn('flex items-end gap-1', isUser ? 'justify-end' : 'justify-start')}>
        {!isUser && canSpeak && onSpeak && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            onClick={() => onSpeak(message.content)}
            aria-label="読み上げる"
          >
            <Volume2 className="size-4" />
          </Button>
        )}
        <div
          className={cn(
            'max-w-[85%] rounded-2xl px-4 py-2 text-sm leading-relaxed',
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-foreground',
          )}
        >
          {message.content}
        </div>
      </div>
      {isUser && showRedo && onRedo && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2 text-xs text-muted-foreground"
          onClick={onRedo}
          disabled={isRedoing}
        >
          {isRedoing ? <Loader2 className="size-3.5 animate-spin" /> : <Mic className="size-3.5" />}
          発話し直す
        </Button>
      )}
    </div>
  )
}

interface MessageListProps {
  messages: MessageRead[]
  streamingContent?: string
  isStreaming?: boolean
  canSpeak?: boolean
  onSpeak?: (text: string) => void
  lastUserMessageId?: string | null
  canRedoUserMessage?: boolean
  onRedoUserMessage?: () => void
  isRedoing?: boolean
}

export function MessageList({
  messages,
  streamingContent,
  isStreaming,
  canSpeak,
  onSpeak,
  lastUserMessageId,
  canRedoUserMessage,
  onRedoUserMessage,
  isRedoing,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent, isStreaming])

  if (messages.length === 0 && !isStreaming) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
        メッセージを送信して会話を始めましょう
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-3 p-4">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            canSpeak={canSpeak && message.role === 'assistant'}
            onSpeak={onSpeak}
            showRedo={
              Boolean(
                canRedoUserMessage &&
                  onRedoUserMessage &&
                  message.role === 'user' &&
                  message.id === lastUserMessageId,
              )
            }
            onRedo={onRedoUserMessage}
            isRedoing={isRedoing}
          />
        ))}
        {isStreaming && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl bg-muted px-4 py-2 text-sm leading-relaxed text-foreground">
              {streamingContent ? (
                <>
                  {streamingContent}
                  <span className="ml-1 inline-block animate-pulse">▍</span>
                </>
              ) : (
                <span className="inline-flex gap-1 text-muted-foreground">
                  <span className="animate-pulse">●</span>
                  <span className="animate-pulse [animation-delay:150ms]">●</span>
                  <span className="animate-pulse [animation-delay:300ms]">●</span>
                </span>
              )}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  )
}
