import { Link } from 'react-router-dom'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { formatDateTime, truncate } from '@/lib/format'
import { sessionSubtitle, sessionTitle, type SessionRead } from '@/types/sessions'

const STATUS_LABEL: Record<SessionRead['status'], string> = {
  active: '進行中',
  completed: '完了',
}

interface SessionCardProps {
  session: SessionRead
}

export function SessionCard({ session }: SessionCardProps) {
  const href =
    session.status === 'completed'
      ? `/sessions/${session.id}/feedback`
      : `/sessions/${session.id}`

  return (
    <Link to={href} className="block transition-opacity hover:opacity-80">
      <Card>
        <CardHeader className="gap-2">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-base leading-snug">
              {truncate(sessionTitle(session), 80)}
            </CardTitle>
            <span
              className={
                session.status === 'active'
                  ? 'shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary'
                  : 'shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground'
              }
            >
              {STATUS_LABEL[session.status]}
            </span>
          </div>
          <CardDescription>{formatDateTime(session.created_at)}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {truncate(sessionSubtitle(session), 160)}
          </p>
        </CardContent>
      </Card>
    </Link>
  )
}
