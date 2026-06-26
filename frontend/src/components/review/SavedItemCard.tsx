import { FEEDBACK_TYPE_LABEL } from '@/lib/labels'
import { formatDateTime } from '@/lib/format'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { SavedItemRead } from '@/types/savedItems'

interface SavedItemCardProps {
  item: SavedItemRead
  onDelete: () => void
  isDeleting: boolean
}

export function SavedItemCard({ item, onDelete, isDeleting }: SavedItemCardProps) {
  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex items-start justify-between gap-3">
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
            {FEEDBACK_TYPE_LABEL[item.type]}
          </span>
          <CardDescription className="shrink-0 text-xs">
            {formatDateTime(item.created_at)}
          </CardDescription>
        </div>
        <CardTitle className="text-sm font-normal leading-snug text-muted-foreground line-through">
          {item.original}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm font-medium">{item.corrected}</p>
        <p className="text-sm text-muted-foreground">{item.explanation}</p>
        <Button
          variant="destructive"
          size="sm"
          onClick={onDelete}
          disabled={isDeleting}
        >
          {isDeleting ? '削除中...' : '削除'}
        </Button>
      </CardContent>
    </Card>
  )
}
