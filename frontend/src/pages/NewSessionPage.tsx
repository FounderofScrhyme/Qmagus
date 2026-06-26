import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { getErrorMessage } from '@/lib/errors'
import { createSession } from '@/lib/sessions'

export function NewSessionPage() {
  const navigate = useNavigate()
  const [scenarioText, setScenarioText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      const session = await createSession({ scenario_text: scenarioText.trim() })
      navigate(`/sessions/${session.id}`)
    } catch (err) {
      setError(getErrorMessage(err, 'セッションの作成に失敗しました'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">新しい会話</h1>
        <p className="text-sm text-muted-foreground">
          どんな状況で英会話をしたいか、日本語または英語で自由に書いてください
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>状況（シナリオ）を設定</CardTitle>
          <CardDescription>
            例: 空港の入国審査で、観光目的で2週間滞在すると伝えたい
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="scenario" className="text-sm font-medium">
                シナリオ
              </label>
              <Textarea
                id="scenario"
                required
                minLength={1}
                rows={5}
                placeholder="会話の状況を入力..."
                value={scenarioText}
                onChange={(e) => setScenarioText(e.target.value)}
              />
            </div>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" asChild>
                <Link to="/dashboard">キャンセル</Link>
              </Button>
              <Button type="submit" disabled={isSubmitting || !scenarioText.trim()}>
                {isSubmitting ? '作成中...' : '会話を始める'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
