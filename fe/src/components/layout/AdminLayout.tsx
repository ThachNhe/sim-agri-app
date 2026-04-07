import { Link, Outlet, useNavigate } from '@tanstack/react-router'
import {
  LayoutDashboard,
  Cpu,
  BellRing,
  Users,
  LogOut,
  Sun,
  Moon,
  Leaf
} from 'lucide-react'
import { useAuthStore } from '@/stores/useAuthStore'
import { Button } from '@/components/ui/button'
import { useTheme } from 'next-themes'

export function AdminLayout() {
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()

  const handleLogout = () => {
    logout()
    navigate({ to: '/login' })
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar - Glassmorphism style */}
      <aside className="w-64 border-r border-border/50 bg-card/60 backdrop-blur-xl flex flex-col transition-all z-20">
        <div className="p-6">
          <div className="flex items-center gap-3 text-primary">
            <Leaf className="w-8 h-8" />
            <h1 className="text-xl font-bold tracking-tight">AgriSmart</h1>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
          <NavLink to="/" icon={<LayoutDashboard size={20} />} label="Dashboard" />
          <NavLink to="/devices" icon={<Cpu size={20} />} label="Thiết bị" />
          <NavLink to="/alerts" icon={<BellRing size={20} />} label="Cảnh báo" />
          {user?.role === 'admin' && (
            <NavLink to="/users" icon={<Users size={20} />} label="Người dùng" />
          )}
        </nav>

        <div className="p-4 border-t border-border/50 flex flex-col gap-3 pb-6">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 text-sm font-medium">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex flex-col">
                <span className="truncate max-w-[120px] leading-tight">{user?.name}</span>
                <span className="text-xs text-muted-foreground capitalize leading-tight">{user?.role}</span>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="rounded-full">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </Button>
          </div>
          <Button variant="destructive" className="w-full justify-start gap-2 shadow-sm rounded-xl" onClick={handleLogout}>
            <LogOut size={18} />
            Đăng xuất
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full bg-background relative overflow-hidden">
        {/* Decorative background blur */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/3" />
        
        <div className="flex-1 overflow-auto p-8 z-10">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

function NavLink({ to, icon, label }: { to: string, icon: React.ReactNode, label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground transition-all duration-200 hover:bg-primary/10 hover:text-primary active:scale-95 [&.active]:bg-primary [&.active]:text-primary-foreground [&.active]:font-medium [&.active]:shadow-md [&.active]:shadow-primary/20"
      activeProps={{ className: 'active' }}
    >
      {icon}
      <span>{label}</span>
    </Link>
  )
}
