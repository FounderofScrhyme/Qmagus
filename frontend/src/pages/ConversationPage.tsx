import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { MessageComposer } from '@/components/conversation/MessageComposer'
import { MessageList } from '@/components/conversation/MessageList'
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { getErrorMessage, getStreamErrorMessage } from '@/lib/errors'
import { completeSession, streamMessage, streamOpeningMessage } from '@/lib/messages'
import { getSession } from '@/lib/sessions'
import { useSessionStore } from '@/stores/sessionStore'
import type { SessionDetailRead } from '@/types/sessions'

export function ConversationPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const abortRef = useRef<AbortController | null>(null)
  const openingRequestedRef = useRef(false)

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
  const setStreamingContent = useSessionStore((s) => s.setStreamingContent)
  const finishStreaming = useSessionStore((s) => s.finishStreaming)
  const resetStreaming = useSessionStore((s) => s.resetStreaming)
  const removeLastUserMessage = useSessionStore((s) => s.removeLastUserMessage)
  const clear = useSessionStore((s) => s.clear)

  const { isSupported: isSpeechSupported, isSpeaking, speak, speakSynced, stop: stopSpeaking } =
    useSpeechSynthesis()

  const loadSession = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!id) return
      if (!options?.silent) {
        setIsLoading(true)
      }
      setError(null)
      try {
        const data = await getSession(id)
        setSession(data)
        setMessages(data.messages ?? [])
      } catch (err) {
        setError(getErrorMessage(err, 'セッションの取得に失敗しました'))
      } finally {
        if (!options?.silent) {
          setIsLoading(false)
        }
      }
    },
    [id, setMessages],
  )

  useEffect(() => {
    openingRequestedRef.current = false
  }, [id])

  useEffect(() => {
    void loadSession()
    return () => {
      abortRef.current?.abort()
      stopSpeaking()
      clear()
    }
  }, [loadSession, clear, stopSpeaking])

  const runAssistantStream = useCallback(
    async (
      request: (
        sessionId: string,
        handlers: Parameters<typeof streamMessage>[2],
        signal: AbortSignal,
      ) => Promise<boolean>,
      options?: { optimisticUserMessage?: boolean },
    ) => {
      if (!id) return false

      startStreaming()

      let fullContent = ''
      abortRef.current?.abort()
      abortRef.current = new AbortController()

      const succeeded = await request(
        id,
        {
          onChunk: (chunk) => {
            fullContent += chunk
          },
          onDone: async (messageId) => {
            if (fullContent.trim()) {
              await speakSynced(fullContent, setStreamingContent)
            }
            finishStreaming(messageId, fullContent)
          },
          onError: async (message, { userMessagePersisted }) => {
            resetStreaming()
            if (userMessagePersisted) {
              await loadSession({ silent: true })
            } else if (options?.optimisticUserMessage) {
              removeLastUserMessage()
            }
            setError(getStreamErrorMessage(message))
          },
        },
        abortRef.current.signal,
      )

      if (!succeeded) {
        resetStreaming()
      }

      return succeeded
    },
    [
      id,
      startStreaming,
      setStreamingContent,
      finishStreaming,
      speakSynced,
      resetStreaming,
      loadSession,
      removeLastUserMessage,
    ],
  )

  useEffect(() => {
    if (isLoading || !session || session.status !== 'active') return
    if (messages.length > 0 || openingRequestedRef.current || isStreaming) return

    openingRequestedRef.current = true

    void runAssistantStream((sessionId, handlers, signal) =>
      streamOpeningMessage(sessionId, handlers, signal),
    ).then((succeeded) => {
      if (!succeeded) {
        openingRequestedRef.current = false
      }
    })
  }, [isLoading, session, messages.length, isStreaming, runAssistantStream])

  const handleSend = async (content: string) => {
    if (!id) return

    stopSpeaking()
    addUserMessage(content)

    try {
      const succeeded = await runAssistantStream(
        (sessionId, handlers, signal) =>
          streamMessage(sessionId, { content }, handlers, signal),
        { optimisticUserMessage: true },
      )
      if (!succeeded) {
        throw new Error('message send failed')
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'message send failed') {
        return
      }
      resetStreaming()
      removeLastUserMessage()
      setError('メッセージの送信に失敗しました。ネットワーク接続を確認してください。')
    }
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
            {isSpeechSupported && isSpeaking && ' · 読み上げ中...'}
          </CardDescription>
        </CardHeader>
        <div className="min-h-0 flex-1">
          <MessageList
            messages={messages}
            streamingContent={streamingContent}
            isStreaming={isStreaming}
            canSpeak={isSpeechSupported}
            onSpeak={speak}
          />
        </div>
        <MessageComposer
          sessionId={session.id}
          onSend={handleSend}
          disabled={isStreaming || isCompleting || (messages.length === 0 && !error)}
          onBeforeListen={stopSpeaking}
        />
      </Card>
    </div>
  )
}
