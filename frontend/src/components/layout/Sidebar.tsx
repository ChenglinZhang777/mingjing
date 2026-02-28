import { NavLink } from 'react-router-dom'
import { BookOpen, Layers, MessageSquare, LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/feynman', label: '费曼检验', icon: BookOpen },
  { to: '/layers', label: '四层剖析', icon: Layers },
  { to: '/rehearsal', label: '排练室', icon: MessageSquare },
] as const

export function Sidebar() {
  const { user, logout } = useAuth()

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-card">
      <div className="flex h-14 items-center border-b px-6">
        <h1 className="text-lg font-semibold tracking-tight">明镜</h1>
        <span className="ml-2 text-xs text-muted-foreground">AI 职业表达教练</span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t p-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user?.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            title="退出登录"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
