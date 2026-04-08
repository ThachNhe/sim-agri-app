import { Link, Outlet, useNavigate } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { Leaf, LogOut, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/useAuthStore'

export interface LayoutNavItem {
    to: string
    label: string
    icon: ReactNode
}

interface LayoutShellProps {
    roleLabel: string
    title: string
    subtitle: string
    navItems: LayoutNavItem[]
}

export function LayoutShell({
    roleLabel,
    title,
    subtitle,
    navItems,
}: LayoutShellProps) {
    const user = useAuthStore(s => s.user)
    const logout = useAuthStore(s => s.logout)
    const navigate = useNavigate()
    const { theme, setTheme } = useTheme()

    const handleLogout = () => {
        logout()
        navigate({ to: '/login' })
    }

    return (
        <div className="flex h-screen overflow-hidden bg-background text-foreground">
            <aside className="z-20 flex w-64 flex-col border-r border-border/50 bg-card/60 backdrop-blur-xl transition-all">
                <div className="p-6">
                    <div className="flex items-center gap-3 text-primary">
                        <Leaf className="h-8 w-8" />
                        <div>
                            <h1 className="text-xl font-bold tracking-tight">AgriSmart</h1>
                            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                                {roleLabel}
                            </p>
                        </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-border/50 bg-background/60 p-4">
                        <p className="text-sm font-semibold text-foreground">{title}</p>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                            {subtitle}
                        </p>
                    </div>
                </div>

                <nav className="mt-2 flex-1 space-y-2 overflow-y-auto px-4">
                    {navItems.map(item => (
                        <NavLink key={item.to} to={item.to} icon={item.icon} label={item.label} />
                    ))}
                </nav>

                <div className="flex flex-col gap-3 border-t border-border/50 p-4 pb-6">
                    <div className="mb-1 flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 font-bold text-primary">
                                {user?.name?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <div className="flex min-w-0 flex-col">
                                <span className="max-w-[120px] truncate leading-tight">
                                    {user?.name || 'Unknown'}
                                </span>
                                <span className="truncate text-xs capitalize leading-tight text-muted-foreground">
                                    {roleLabel}
                                </span>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                            className="rounded-full"
                        >
                            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                        </Button>
                    </div>

                    <Button
                        variant="destructive"
                        className="w-full justify-start gap-2 rounded-xl shadow-sm"
                        onClick={handleLogout}
                    >
                        <LogOut size={18} />
                        Đăng xuất
                    </Button>
                </div>
            </aside>

            <main className="relative flex h-full flex-1 flex-col overflow-hidden bg-background">
                <div className="pointer-events-none absolute right-0 top-0 h-[500px] w-[500px] -translate-y-1/2 translate-x-1/3 rounded-full bg-primary/5 blur-3xl" />

                <div className="z-10 flex-1 overflow-auto p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    )
}

function NavLink({
    to,
    icon,
    label,
}: {
    to: string
    icon: ReactNode
    label: string
}) {
    return (
        <Link
            to={to}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-muted-foreground transition-all duration-200 hover:bg-primary/10 hover:text-primary active:scale-95 [&.active]:bg-primary [&.active]:font-medium [&.active]:text-primary-foreground [&.active]:shadow-md [&.active]:shadow-primary/20"
            activeProps={{ className: 'active' }}
        >
            {icon}
            <span>{label}</span>
        </Link>
    )
}