import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { SavedItemCard } from '@/components/review/SavedItemCard'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { getErrorMessage } from '@/lib/errors'
import { FEEDBACK_TYPES, FEEDBACK_TYPE_LABEL } from '@/lib/labels'
import { deleteSavedItem, listSavedItems } from '@/lib/savedItems'
import { cn } from '@/lib/utils'
import type { FeedbackType } from '@/types/feedback'
import type { SavedItemRead } from '@/types/savedItems'

type FilterType = FeedbackType | 'all'

export function ReviewPage() {
  const [items, setItems] = useState<SavedItemRead[]>([])
  const [filter, setFilter] = useState<FilterType>('all')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadItems = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await listSavedItems()
      setItems(data)
    } catch (err) {
      setError(getErrorMessage(err, '保存一覧の取得に失敗しました'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadItems()
  }, [])

  const filteredItems = useMemo(() => {
    if (filter === 'all') return items
    return items.filter((item) => item.type === filter)
  }, [items, filter])

  const handleDelete = async (itemId: string) => {
    setDeletingId(itemId)
    setError(null)
    try {
      await deleteSavedItem(itemId)
      setItems((prev) => prev.filter((item) => item.id !== itemId))
    } catch (err) {
      setError(getErrorMessage(err, '削除に失敗しました'))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">復習一覧</h1>
          <p className="text-sm text-muted-foreground">
            保存した表現や誤りを復習できます
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/dashboard">ダッシュボード</Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
        >
          すべて
        </Button>
        {FEEDBACK_TYPES.map((type) => (
          <Button
            key={type}
            size="sm"
            variant={filter === type ? 'default' : 'outline'}
            onClick={() => setFilter(type)}
          >
            {FEEDBACK_TYPE_LABEL[type]}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>保存項目</CardTitle>
          <CardDescription>
            {filter === 'all'
              ? `全 ${items.length} 件`
              : `${FEEDBACK_TYPE_LABEL[filter]} ${filteredItems.length} 件`}
          </CardDescription>
        </CardHeader>
        <CardContent className={cn(isLoading && 'text-sm text-muted-foreground')}>
          {isLoading && '読み込み中...'}

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          {!isLoading && !error && filteredItems.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {items.length === 0
                ? '保存した項目はまだありません。会話後のフィードバックから項目を保存してください。'
                : 'このカテゴリの項目はありません。'}
            </p>
          )}

          {!isLoading && filteredItems.length > 0 && (
            <div className="space-y-3">
              {filteredItems.map((item) => (
                <SavedItemCard
                  key={item.id}
                  item={item}
                  onDelete={() => void handleDelete(item.id)}
                  isDeleting={deletingId === item.id}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
