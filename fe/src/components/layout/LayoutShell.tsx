import { Link, Outlet, useNavigate } from '@tanstack/react-router'
import { useState, type ReactNode } from 'react'
import { Leaf, LogOut, Menu, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
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
    const [mobileNavOpen, setMobileNavOpen] = useState(false)

    const handleLogout = () => {
        logout()
        navigate({ to: '/login' })
    }

    return (
        <div className="flex h-dvh min-h-0 overflow-hidden bg-background text-foreground">
            <aside className="z-20 hidden h-dvh w-72 shrink-0 flex-col border-r border-border/50 bg-card/60 backdrop-blur-xl transition-all lg:flex">
                <div className="shrink-0 p-6">
                    <div className="flex items-center gap-3 text-primary">
                        <Leaf className="h-8 w-8" />
                        <div className="min-w-0">
                            <h1 className="text-xl font-bold tracking-tight">AgriSmart</h1>
                            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                                {roleLabel}
                            </p>
                        </div>
                    </div>

                    <div className="mt-5 rounded-lg border border-border/50 bg-background/60 p-4">
                        <p className="text-sm font-semibold text-foreground">{title}</p>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                            {subtitle}
                        </p>
                    </div>
                </div>

                <nav className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 pb-4">
                    {navItems.map(item => (
                        <NavLink key={item.to} to={item.to} icon={item.icon} label={item.label} />
                    ))}
                </nav>

                <div className="shrink-0 border-t border-border/50 p-4">
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
                        className="mt-3 w-full justify-start gap-2 rounded-lg shadow-sm"
                        onClick={handleLogout}
                    >
                        <LogOut size={18} />
                        Đăng xuất
                    </Button>
                </div>
            </aside>

            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                <header className="z-30 shrink-0 border-b border-border/50 bg-background/90 backdrop-blur lg:hidden">
                    <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
                        <div className="flex min-w-0 items-center gap-3">
                            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                                <SheetTrigger asChild>
                                    <Button variant="outline" size="icon-sm" className="rounded-lg">
                                        <Menu size={18} />
                                    </Button>
                                </SheetTrigger>
                                <SheetContent side="left" className="w-[min(88vw,22rem)] p-0">
                                    <div className="flex h-full min-h-0 flex-col">
                                        <SheetHeader className="border-b border-border/50 p-6 text-left">
                                            <div className="flex items-center gap-3 text-primary">
                                                <Leaf className="h-8 w-8" />
                                                <div className="min-w-0">
                                                    <p className="text-xl font-bold tracking-tight">AgriSmart</p>
                                                    <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                                                        {roleLabel}
                                                    </p>
                                                </div>
                                            </div>
                                            <SheetTitle className="sr-only">Điều hướng {title}</SheetTitle>
                                            <SheetDescription className="mt-3 text-sm leading-relaxed text-muted-foreground">
                                                {subtitle}
                                            </SheetDescription>
                                        </SheetHeader>

                                        <nav className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
                                            {navItems.map(item => (
                                                <NavLink
                                                    key={item.to}
                                                    to={item.to}
                                                    icon={item.icon}
                                                    label={item.label}
                                                    mobile
                                                    closeOnNavigate
                                                />
                                            ))}
                                        </nav>

                                        <SheetFooter className="border-t border-border/50 p-4">
                                            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 font-bold text-primary">
                                                    {user?.name?.[0]?.toUpperCase() || 'U'}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="truncate">{user?.name || 'Unknown'}</p>
                                                    <p className="truncate text-xs text-muted-foreground">{roleLabel}</p>
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    className="flex-1 gap-2 rounded-lg"
                                                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                                                >
                                                    {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                                                    {theme === 'dark' ? 'Sáng' : 'Tối'}
                                                </Button>

                                                <SheetClose asChild>
                                                    <Button
                                                        variant="destructive"
                                                        className="flex-1 gap-2 rounded-lg shadow-sm"
                                                        onClick={handleLogout}
                                                    >
                                                        <LogOut size={16} />
                                                        Đăng xuất
                                                    </Button>
                                                </SheetClose>
                                            </div>
                                        </SheetFooter>
                                    </div>
                                </SheetContent>
                            </Sheet>

                            <div className="min-w-0">
                                <p className="truncate text-xs uppercase tracking-[0.22em] text-muted-foreground">
                                    {roleLabel}
                                </p>
                                <h1 className="truncate text-sm font-semibold sm:text-base">{title}</h1>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                                className="rounded-full"
                            >
                                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                            </Button>

                            <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={handleLogout}
                                className="rounded-full"
                            >
                                <LogOut size={18} />
                            </Button>
                        </div>
                    </div>
                </header>

                <main className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
                    <div className="pointer-events-none absolute right-0 top-0 hidden h-[500px] w-[500px] -translate-y-1/2 translate-x-1/3 rounded-full bg-primary/5 blur-3xl lg:block" />

                    <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    )
}

function NavLink({
    to,
    icon,
    label,
    mobile = false,
    closeOnNavigate = false,
}: {
    to: string
    icon: ReactNode
    label: string
    mobile?: boolean
    closeOnNavigate?: boolean
}) {
    const link = (
        <Link
            to={to}
            className={cn(
                'flex min-w-0 items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground transition-all duration-200 hover:bg-primary/10 hover:text-primary active:scale-95 [&.active]:bg-primary [&.active]:font-medium [&.active]:text-primary-foreground [&.active]:shadow-md [&.active]:shadow-primary/20',
                mobile && 'px-4 py-3 text-base',
            )}
            activeProps={{ className: 'active' }}
        >
            {icon}
            <span className="truncate">{label}</span>
        </Link>
    )

    if (!closeOnNavigate) {
        return link
    }

    return <SheetClose asChild>{link}</SheetClose>
}
