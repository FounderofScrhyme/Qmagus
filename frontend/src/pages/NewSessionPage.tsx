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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { getErrorMessage } from '@/lib/errors'
import { createSession } from '@/lib/sessions'
import type { TtsVoiceGender } from '@/types/sessions'

const VOICE_OPTIONS: { value: TtsVoiceGender; label: string }[] = [
  { value: 'male', label: '男性' },
  { value: 'female', label: '女性' },
]

export function NewSessionPage() {
  const navigate = useNavigate()
  const [setting, setSetting] = useState('')
  const [userRole, setUserRole] = useState('')
  const [aiRole, setAiRole] = useState('')
  const [goal, setGoal] = useState('')
  const [ttsVoice, setTtsVoice] = useState<TtsVoiceGender>('male')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const canSubmit =
    setting.trim() && userRole.trim() && aiRole.trim() && goal.trim()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    setError(null)
    setIsSubmitting(true)
    try {
      const session = await createSession({
        setting: setting.trim(),
        user_role: userRole.trim(),
        ai_role: aiRole.trim(),
        goal: goal.trim(),
        tts_voice: ttsVoice,
      })
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
          場面・役割・目的を設定すると、AI がシチュエーションに沿った会話をします
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>シチュエーションを設定</CardTitle>
          <CardDescription>
            各項目を具体的に書くほど、会話の精度が上がります
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="setting" className="text-sm font-medium">
                場面
              </label>
              <Textarea
                id="setting"
                required
                rows={2}
                placeholder="例: 成田空港の入国審査カウンター。長距離便を降りた直後"
                value={setting}
                onChange={(e) => setSetting(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="user-role" className="text-sm font-medium">
                あなたの役
              </label>
              <Input
                id="user-role"
                required
                placeholder="例: 2週間の観光で来日した旅行者"
                value={userRole}
                onChange={(e) => setUserRole(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="ai-role" className="text-sm font-medium">
                AIの役
              </label>
              <Input
                id="ai-role"
                required
                placeholder="例: 入国審査官（事務的だが礼儀正しい）"
                value={aiRole}
                onChange={(e) => setAiRole(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="goal" className="text-sm font-medium">
                会話の目的
              </label>
              <Textarea
                id="goal"
                required
                rows={2}
                placeholder="例: 滞在目的・期間・宿泊先を伝え、審査を無事に通過する"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <span className="text-sm font-medium">AIの声</span>
              <div className="flex gap-2">
                {VOICE_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={ttsVoice === option.value ? 'default' : 'outline'}
                    className={cn('flex-1')}
                    onClick={() => setTtsVoice(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
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
              <Button type="submit" disabled={isSubmitting || !canSubmit}>
                {isSubmitting ? '作成中...' : '会話を始める'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
