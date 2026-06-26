import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export function LandingPage() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <main className="container mx-auto flex min-h-svh flex-col items-center justify-center p-6">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">English Conversation Practice</CardTitle>
            <CardDescription className="text-base">
              AI と英会話を練習し、会話後のフィードバックで間違いを復習できるアプリです。
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button asChild className="w-full" size="lg">
              <Link to="/register">無料で始める</Link>
            </Button>
            <Button asChild variant="outline" className="w-full" size="lg">
              <Link to="/login">ログイン</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
