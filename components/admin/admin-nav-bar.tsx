'use client'

import {
    Heart,
    LayoutDashboard,
    LogOut,
} from 'lucide-react'
import { useTranslations } from 'next-intl'

import { signOutAction } from '@/actions/admin'
import { LanguageSwitcher } from '@/components/language-switcher'
import { ThemeToggle } from '@/components/theme-toggle'
import {
    Link,
    usePathname,
} from '@/lib/navigation'
import { cn } from '@/lib/utils'

interface AdminNavBarProps {
    adminEmail: string
}

export function AdminNavBar({
                                adminEmail,
                            }: AdminNavBarProps) {
    const pathname = usePathname()
    const t = useTranslations('nav')

    const NAV_ITEMS = [
        {
            href: '/admin/dashboard',
            label: t('dashboard'),
            icon: LayoutDashboard,
        },
        {
            href: '/admin/weddings',
            label: t('weddings'),
            icon: Heart,
        },
    ] as const

    return (
        <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur-xl">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
                {/* Left */}
                <div className="flex min-w-0 items-center gap-5 lg:gap-8">
                    {/* Brand */}
                    <Link
                        href="/admin/dashboard"
                        className="flex shrink-0 items-center gap-2.5"
                        aria-label="Wedora admin"
                    >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-white shadow-sm">
                            <Heart
                                className="h-3.5 w-3.5"
                                fill="currentColor"
                            />
                        </div>

                        <span className="hidden font-serif text-xl tracking-tight text-foreground sm:inline">
                            Wedora
                        </span>
                    </Link>

                    {/* Navigation */}
                    <nav className="flex items-center gap-1">
                        {NAV_ITEMS.map(
                            ({
                                 href,
                                 label,
                                 icon: Icon,
                             }) => {
                                const isActive =
                                    pathname ===
                                    href ||
                                    pathname.startsWith(
                                        `${href}/`
                                    )

                                return (
                                    <Link
                                        key={
                                            href
                                        }
                                        href={
                                            href
                                        }
                                        className={cn(
                                            'flex h-9 items-center gap-2 rounded-full px-3 text-xs font-medium transition-all sm:px-4',
                                            isActive
                                                ? 'bg-foreground text-background shadow-sm'
                                                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                                        )}
                                    >
                                        <Icon
                                            className="h-3.5 w-3.5"
                                            strokeWidth={
                                                1.6
                                            }
                                        />

                                        <span className="hidden sm:inline">
                                            {
                                                label
                                            }
                                        </span>
                                    </Link>
                                )
                            }
                        )}
                    </nav>
                </div>

                {/* Right */}
                <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                    {/* Email */}
                    <div className="mr-1 hidden max-w-[190px] lg:block">
                        <p className="truncate text-[11px] text-muted-foreground">
                            {adminEmail}
                        </p>
                    </div>

                    <LanguageSwitcher />

                    <ThemeToggle />

                    <button
                        type="button"
                        onClick={() =>
                            void signOutAction()
                        }
                        aria-label={t(
                            'logout'
                        )}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-card text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:w-auto sm:px-3"
                    >
                        <LogOut
                            className="h-3.5 w-3.5"
                            strokeWidth={
                                1.6
                            }
                        />

                        <span className="ml-2 hidden xl:inline">
                            {t('logout')}
                        </span>
                    </button>
                </div>
            </div>
        </header>
    )
}