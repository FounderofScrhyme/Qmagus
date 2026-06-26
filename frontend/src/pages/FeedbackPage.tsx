import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { FeedbackItemCard } from '@/components/feedback/FeedbackItemCard'
import { Button } from '@/components/ui/button'
import { getErrorMessage } from '@/lib/errors'
import { generateFeedback } from '@/lib/feedback'
import { createSavedItemsBatch } from '@/lib/savedItems'
import type { FeedbackItem } from '@/types/feedback'

function itemKey(item: FeedbackItem, index: number): string {
  return `${item.type}-${index}-${item.original}`
}

export function FeedbackPage() {
  const { id } = useParams<{ id: string }>()
  const [items, setItems] = useState<FeedbackItem[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [savedCount, setSavedCount] = useState(0)

  useEffect(() => {
    if (!id) return

    setIsLoading(true)
    setError(null)
    generateFeedback(id)
      .then((response) => setItems(response.items))
      .catch((err) => setError(getErrorMessage(err, 'フィードバックの取得に失敗しました')))
      .finally(() => setIsLoading(false))
  }, [id])

  const toggleItem = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleSave = async () => {
    if (!id || selected.size === 0) return

    setIsSaving(true)
    setError(null)
    try {
      const toSave = items.filter((item, index) => selected.has(itemKey(item, index)))
      await createSavedItemsBatch(
        toSave.map((item) => ({
          session_id: id,
          type: item.type,
          original: item.original,
          corrected: item.corrected,
          explanation: item.explanation,
        })),
      )
      setSavedCount(toSave.length)
      setSelected(new Set())
    } catch (err) {
      setError(getErrorMessage(err, '保存に失敗しました'))
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">フィードバックを生成中...</p>
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">会話後フィードバック</h1>
        <p className="text-sm text-muted-foreground">
          復習したい項目を選んで保存できます
        </p>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {savedCount > 0 && (
        <p className="text-sm text-primary">
          {savedCount} 件を保存しました。{' '}
          <Link to="/review" className="underline underline-offset-4">
            復習一覧を見る
          </Link>
        </p>
      )}

      {items.length === 0 && !error && (
        <p className="text-sm text-muted-foreground">
          指摘事項はありませんでした。よくできました！
        </p>
      )}

      {items.length > 0 && (
        <div className="space-y-3">
          {items.map((item, index) => {
            const key = itemKey(item, index)
            return (
              <FeedbackItemCard
                key={key}
                item={item}
                selected={selected.has(key)}
                onToggle={() => toggleItem(key)}
              />
            )
          })}
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <Button variant="outline" asChild>
          <Link to="/dashboard">ダッシュボードに戻る</Link>
        </Button>
        {items.length > 0 && (
          <Button
            onClick={() => void handleSave()}
            disabled={selected.size === 0 || isSaving}
          >
            {isSaving ? '保存中...' : `選択した ${selected.size} 件を保存`}
          </Button>
        )}
      </div>
    </div>
  )
}
