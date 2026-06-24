import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

function App() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <main className="container mx-auto flex min-h-svh flex-col items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>English Conversation Practice</CardTitle>
            <CardDescription>
              AI と英会話を練習し、間違いを復習できるアプリ
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full">はじめる</Button>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export default App
