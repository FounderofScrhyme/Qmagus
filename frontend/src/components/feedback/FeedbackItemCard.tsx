import { FEEDBACK_TYPE_LABEL } from '@/lib/labels'
import { cn } from '@/lib/utils'
import type { FeedbackItem } from '@/types/feedback'

interface FeedbackItemCardProps {
  item: FeedbackItem
  selected: boolean
  onToggle: () => void
}

export function FeedbackItemCard({ item, selected, onToggle }: FeedbackItemCardProps) {
  return (
    <label
      className={cn(
        'flex cursor-pointer gap-3 rounded-lg border p-4 transition-colors',
        selected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50',
      )}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        className="mt-1 size-4 shrink-0 accent-primary"
      />
      <div className="min-w-0 space-y-2">
        <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
          {FEEDBACK_TYPE_LABEL[item.type]}
        </span>
        <p className="text-sm">
          <span className="text-muted-foreground line-through">{item.original}</span>
        </p>
        <p className="text-sm font-medium">{item.corrected}</p>
        <p className="text-sm text-muted-foreground">{item.explanation}</p>
      </div>
    </label>
  )
}
