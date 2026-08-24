'use client'

import {
    CalendarDays,
    Heart,
    LayoutDashboard,
    LogOut,
    Menu,
    Settings,
    X,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import {
    useState,
} from 'react'

import {
    signOutAction,
} from '@/actions/admin'
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
    const t =
        useTranslations(
            'adminNav'
        )

    const tc =
        useTranslations(
            'common'
        )

    const pathname =
        usePathname()

    const [
        mobileOpen,
        setMobileOpen,
    ] =
        useState(false)

    const navItems = [
        {
            href:
                '/admin/dashboard',
            label:
                t('dashboard'),
            icon:
            LayoutDashboard,
            active:
                pathname ===
                '/admin/dashboard',
        },
        {
            href:
                '/admin/weddings',
            label:
                t('weddings'),
            icon:
            CalendarDays,
            active:
                pathname ===
                '/admin/weddings' ||
                pathname.startsWith(
                    '/admin/weddings/'
                ),
        },
        {
            href:
                '/admin/settings',
            label:
                t('settings'),
            icon:
            Settings,
            active:
                pathname ===
                '/admin/settings' ||
                pathname.startsWith(
                    '/admin/settings/'
                ),
        },
    ] as const

    return (
        <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur-xl">
            <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
                {/* =====================================
                    BRAND
                ===================================== */}
                <Link
                    href="/admin/dashboard"
                    className="flex shrink-0 items-center gap-2.5"
                    onClick={() =>
                        setMobileOpen(
                            false
                        )
                    }
                >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-white shadow-sm">
                        <Heart
                            className="h-3.5 w-3.5"
                            fill="currentColor"
                        />
                    </div>

                    <span className="font-serif text-xl tracking-tight text-foreground">
                        Wedora
                    </span>

                    <span className="hidden rounded-full border border-border/70 bg-card px-2 py-1 text-[8px] font-medium uppercase tracking-[0.15em] text-muted-foreground sm:inline-flex">
                        Admin
                    </span>
                </Link>

                {/* =====================================
                    DESKTOP NAVIGATION
                ===================================== */}
                <nav
                    aria-label={t(
                        'navigation'
                    )}
                    className="ml-5 hidden items-center gap-1 md:flex"
                >
                    {navItems.map(
                        ({
                             href,
                             label,
                             icon: Icon,
                             active,
                         }) => (
                            <Link
                                key={
                                    href
                                }
                                href={
                                    href
                                }
                                aria-current={
                                    active
                                        ? 'page'
                                        : undefined
                                }
                                className={cn(
                                    'inline-flex h-9 items-center gap-2 rounded-xl px-3.5',
                                    'text-xs font-medium transition-colors',
                                    active
                                        ? 'bg-foreground text-background'
                                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                                )}
                            >
                                <Icon
                                    className="h-3.5 w-3.5"
                                    strokeWidth={
                                        1.6
                                    }
                                />

                                {
                                    label
                                }
                            </Link>
                        )
                    )}
                </nav>

                {/* =====================================
                    RIGHT SIDE
                ===================================== */}
                <div className="ml-auto flex items-center gap-1.5">
                    <div className="hidden max-w-[210px] lg:block">
                        <p className="truncate text-[10px] text-muted-foreground">
                            {
                                adminEmail
                            }
                        </p>
                    </div>

                    <ThemeToggle />

                    <button
                        type="button"
                        onClick={() =>
                            void signOutAction()
                        }
                        aria-label={tc(
                            'logout'
                        )}
                        title={tc(
                            'logout'
                        )}
                        className="hidden h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:flex"
                    >
                        <LogOut
                            className="h-4 w-4"
                            strokeWidth={
                                1.6
                            }
                        />
                    </button>

                    {/* Mobile menu */}
                    <button
                        type="button"
                        aria-expanded={
                            mobileOpen
                        }
                        aria-label={
                            mobileOpen
                                ? t(
                                    'closeMenu'
                                )
                                : t(
                                    'openMenu'
                                )
                        }
                        onClick={() =>
                            setMobileOpen(
                                (
                                    current
                                ) =>
                                    !current
                            )
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:hidden"
                    >
                        {mobileOpen ? (
                            <X
                                className="h-4 w-4"
                                strokeWidth={
                                    1.6
                                }
                            />
                        ) : (
                            <Menu
                                className="h-4 w-4"
                                strokeWidth={
                                    1.6
                                }
                            />
                        )}
                    </button>
                </div>
            </div>

            {/* =====================================
                MOBILE NAVIGATION
            ===================================== */}
            {mobileOpen && (
                <div className="border-t border-border/60 bg-background/95 px-4 py-3 backdrop-blur-xl md:hidden">
                    <nav
                        aria-label={t(
                            'navigation'
                        )}
                        className="mx-auto max-w-7xl space-y-1"
                    >
                        {navItems.map(
                            ({
                                 href,
                                 label,
                                 icon: Icon,
                                 active,
                             }) => (
                                <Link
                                    key={
                                        href
                                    }
                                    href={
                                        href
                                    }
                                    aria-current={
                                        active
                                            ? 'page'
                                            : undefined
                                    }
                                    onClick={() =>
                                        setMobileOpen(
                                            false
                                        )
                                    }
                                    className={cn(
                                        'flex min-h-11 items-center gap-3 rounded-xl px-3.5',
                                        'text-xs font-medium transition-colors',
                                        active
                                            ? 'bg-foreground text-background'
                                            : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                                    )}
                                >
                                    <Icon
                                        className="h-4 w-4"
                                        strokeWidth={
                                            1.6
                                        }
                                    />

                                    {
                                        label
                                    }
                                </Link>
                            )
                        )}

                        <div className="my-2 h-px bg-border/60" />

                        <div className="px-3.5 py-2">
                            <p className="text-[9px] font-medium uppercase tracking-[0.15em] text-muted-foreground/70">
                                {t(
                                    'signedInAs'
                                )}
                            </p>

                            <p className="mt-1 truncate text-xs text-foreground">
                                {
                                    adminEmail
                                }
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                void signOutAction()
                            }
                            className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3.5 text-left text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                        >
                            <LogOut
                                className="h-4 w-4"
                                strokeWidth={
                                    1.6
                                }
                            />

                            {tc(
                                'logout'
                            )}
                        </button>
                    </nav>
                </div>
            )}
        </header>
    )
}