'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Heart, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { signOutAction } from '@/actions/admin'

interface AdminNavBarProps {
    adminEmail: string
}

const NAV_ITEMS = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/weddings', label: 'Dasmat', icon: Heart },
]

export function AdminNavBar({ adminEmail }: AdminNavBarProps) {
    const pathname = usePathname()

    return (
        <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-sm">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                <div className="flex items-center gap-8">
                    <span className="font-serif text-lg text-[hsl(var(--dark))]">Wedora</span>
                    <nav className="flex items-center gap-1">
                        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                            const isActive = pathname === href || pathname.startsWith(href + '/')
                            return (
                                <Link
                                    key={href}
                                    href={href}
                                    className={cn(
                                        'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-sans font-medium transition-colors',
                                        isActive
                                            ? 'bg-[hsl(var(--accent))] text-[hsl(var(--primary))]'
                                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                    )}
                                >
                                    <Icon className="w-4 h-4" />
                                    {label}
                                </Link>
                            )
                        })}
                    </nav>
                </div>

                <div className="flex items-center gap-3">
                    <span className="font-sans text-xs text-muted-foreground hidden sm:block">{adminEmail}</span>
                    <button
                        onClick={async () => await signOutAction()}
                        className="btn-ghost text-xs py-2 px-3"
                    >
                        <LogOut className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Çkyçu</span>
                    </button>
                </div>
            </div>
        </header>
    )
}