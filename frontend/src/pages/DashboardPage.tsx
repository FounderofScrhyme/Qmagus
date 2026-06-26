import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { SessionCard } from '@/components/sessions/SessionCard'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { getErrorMessage } from '@/lib/errors'
import { listSessions } from '@/lib/sessions'
import type { SessionRead } from '@/types/sessions'

export function DashboardPage() {
  const [sessions, setSessions] = useState<SessionRead[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    setError(null)
    listSessions()
      .then(setSessions)
      .catch((err) => setError(getErrorMessage(err, 'セッション一覧の取得に失敗しました')))
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">ダッシュボード</h1>
          <p className="text-sm text-muted-foreground">
            過去の会話セッションを確認し、新しい練習を始められます
          </p>
        </div>
        <Button asChild>
          <Link to="/sessions/new">新しい会話を始める</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>セッション一覧</CardTitle>
          <CardDescription>直近の会話セッション（最大 20 件）</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <p className="text-sm text-muted-foreground">読み込み中...</p>
          )}

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          {!isLoading && !error && sessions.length === 0 && (
            <div className="space-y-3 text-center py-6">
              <p className="text-sm text-muted-foreground">
                まだセッションがありません。最初の会話を始めてみましょう。
              </p>
              <Button asChild variant="outline">
                <Link to="/sessions/new">シナリオを設定する</Link>
              </Button>
            </div>
          )}

          {!isLoading && !error && sessions.length > 0 && (
            <div className="space-y-3">
              {sessions.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
