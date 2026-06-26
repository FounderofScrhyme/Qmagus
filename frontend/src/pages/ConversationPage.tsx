import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { MessageComposer } from '@/components/conversation/MessageComposer'
import { MessageList } from '@/components/conversation/MessageList'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { getErrorMessage } from '@/lib/errors'
import { completeSession, streamMessage } from '@/lib/messages'
import { getSession } from '@/lib/sessions'
import { useSessionStore } from '@/stores/sessionStore'
import type { SessionDetailRead } from '@/types/sessions'

export function ConversationPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const abortRef = useRef<AbortController | null>(null)

  const [session, setSession] = useState<SessionDetailRead | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCompleting, setIsCompleting] = useState(false)

  const messages = useSessionStore((s) => s.messages)
  const streamingContent = useSessionStore((s) => s.streamingContent)
  const isStreaming = useSessionStore((s) => s.isStreaming)
  const setMessages = useSessionStore((s) => s.setMessages)
  const addUserMessage = useSessionStore((s) => s.addUserMessage)
  const startStreaming = useSessionStore((s) => s.startStreaming)
  const appendStreamChunk = useSessionStore((s) => s.appendStreamChunk)
  const finishStreaming = useSessionStore((s) => s.finishStreaming)
  const resetStreaming = useSessionStore((s) => s.resetStreaming)
  const clear = useSessionStore((s) => s.clear)

  const loadSession = useCallback(async () => {
    if (!id) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await getSession(id)
      setSession(data)
      setMessages(data.messages ?? [])
    } catch (err) {
      setError(getErrorMessage(err, 'セッションの取得に失敗しました'))
    } finally {
      setIsLoading(false)
    }
  }, [id, setMessages])

  useEffect(() => {
    void loadSession()
    return () => {
      abortRef.current?.abort()
      clear()
    }
  }, [loadSession, clear])

  const handleSend = async (content: string) => {
    if (!id) return

    addUserMessage(content)
    startStreaming()

    let fullContent = ''
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    await streamMessage(
      id,
      { content },
      {
        onChunk: (chunk) => {
          fullContent += chunk
          appendStreamChunk(chunk)
        },
        onDone: (messageId) => {
          finishStreaming(messageId, fullContent)
        },
        onError: async (message) => {
          resetStreaming()
          setError(message)
          await loadSession()
        },
      },
      abortRef.current.signal,
    )
  }

  const handleComplete = async () => {
    if (!id) return
    setIsCompleting(true)
    setError(null)
    try {
      await completeSession(id)
      navigate(`/sessions/${id}/feedback`)
    } catch (err) {
      setError(getErrorMessage(err, '会話の終了に失敗しました'))
    } finally {
      setIsCompleting(false)
    }
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">読み込み中...</p>
  }

  if (error && !session) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
        <Button variant="outline" asChild>
          <Link to="/dashboard">ダッシュボードに戻る</Link>
        </Button>
      </div>
    )
  }

  if (!session) return null

  if (session.status === 'completed') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">このセッションはすでに終了しています。</p>
        <Button asChild>
          <Link to={`/sessions/${session.id}/feedback`}>フィードバックを見る</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto flex h-[calc(100svh-7rem)] max-w-3xl flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight">会話</h1>
          <p className="truncate text-sm text-muted-foreground">{session.scenario_text}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void handleComplete()}
          disabled={isStreaming || isCompleting}
        >
          {isCompleting ? '終了中...' : '会話を終了'}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden py-0">
        <CardHeader className="shrink-0 border-b border-border py-3">
          <CardTitle className="text-sm font-medium">メッセージ</CardTitle>
          <CardDescription className="text-xs">
            Enter で送信、Shift+Enter で改行
          </CardDescription>
        </CardHeader>
        <div className="min-h-0 flex-1">
          <MessageList
            messages={messages}
            streamingContent={streamingContent}
            isStreaming={isStreaming}
          />
        </div>
        <MessageComposer onSend={handleSend} disabled={isStreaming || isCompleting} />
      </Card>
    </div>
  )
}
