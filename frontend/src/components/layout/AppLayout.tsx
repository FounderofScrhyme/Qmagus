import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'

const NAV_LINKS = [
  { to: '/dashboard', label: 'ダッシュボード' },
  { to: '/review', label: '復習' },
] as const

export function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="text-sm font-semibold tracking-tight">
              Kumagusu
            </Link>
            <nav className="hidden items-center gap-1 sm:flex">
              {NAV_LINKS.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    'rounded-md px-2.5 py-1.5 text-sm transition-colors',
                    location.pathname.startsWith(to)
                      ? 'bg-muted font-medium text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
          <nav className="flex items-center gap-3">
            {user && (
              <span className="hidden text-sm text-muted-foreground md:inline">
                {user.email}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={handleLogout}>
              ログアウト
            </Button>
          </nav>
        </div>
      </header>
      <main className="pt-14">
        <div className="container mx-auto p-4 md:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
