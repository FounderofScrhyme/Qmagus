import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { ConversationPage } from '@/pages/ConversationPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { FeedbackPage } from '@/pages/FeedbackPage'
import { LandingPage } from '@/pages/LandingPage'
import { LoginPage } from '@/pages/LoginPage'
import { NewSessionPage } from '@/pages/NewSessionPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { ReviewPage } from '@/pages/ReviewPage'
import { useAuthStore } from '@/stores/authStore'

function AuthHydrator({ children }: { children: React.ReactNode }) {
  const hydrate = useAuthStore((s) => s.hydrate)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const finish = async () => {
      await hydrate()
      setReady(true)
    }

    if (useAuthStore.persist.hasHydrated()) {
      void finish()
      return
    }

    return useAuthStore.persist.onFinishHydration(() => {
      void finish()
    })
  }, [hydrate])

  if (!ready) {
    return (
      <div className="flex min-h-svh items-center justify-center text-muted-foreground">
        読み込み中...
      </div>
    )
  }

  return children
}

function App() {
  return (
    <BrowserRouter>
      <AuthHydrator>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/sessions/new" element={<NewSessionPage />} />
              <Route path="/sessions/:id" element={<ConversationPage />} />
              <Route path="/sessions/:id/feedback" element={<FeedbackPage />} />
              <Route path="/review" element={<ReviewPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthHydrator>
    </BrowserRouter>
  )
}

export default App
