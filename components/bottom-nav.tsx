'use client'

import {
    Armchair,
    Camera,
    Home,
} from 'lucide-react'
import { useTranslations } from 'next-intl'

import { ThemeToggle } from '@/components/theme-toggle'
import {
    Link,
    usePathname,
} from '@/lib/navigation'
import { cn } from '@/lib/utils'

interface BottomNavProps {
    slug: string
    enableFindSeat?: boolean
    enablePhotoUpload?: boolean
}

export function BottomNav({
                              slug,
                              enableFindSeat = true,
                              enablePhotoUpload = true,
                          }: BottomNavProps) {
    const pathname =
        usePathname()

    const t =
        useTranslations(
            'wedding'
        )

    const navItems = [
        {
            label: t(
                'nav.home'
            ),
            href: `/${slug}`,
            icon: Home,
            show: true,
        },
        {
            label: t(
                'nav.findSeat'
            ),
            href: `/${slug}/find-seat`,
            icon: Armchair,
            show:
            enableFindSeat,
        },
        {
            label: t(
                'nav.upload'
            ),
            href: `/${slug}/upload`,
            icon: Camera,
            show:
            enablePhotoUpload,
        },
    ].filter(
        (
            item
        ) => item.show
    )

    const isRouteActive = (
        href: string
    ) => {
        /*
         * Home should only be active on
         * the exact wedding homepage.
         */
        if (
            href ===
            `/${slug}`
        ) {
            return pathname ===
                href
        }

        /*
         * Other sections may have
         * nested routes in the future.
         */
        return (
            pathname === href ||
            pathname.startsWith(
                `${href}/`
            )
        )
    }

    return (
        <nav
            aria-label={t(
                'nav.navigation'
            )}
            className="
                fixed inset-x-0 bottom-0 z-50
                border-t border-border/70
                bg-card/90
                pb-[calc(env(safe-area-inset-bottom)+0.5rem)]
                pt-2
                shadow-[0_-8px_30px_-20px_rgba(0,0,0,0.25)]
                backdrop-blur-xl

                sm:bottom-4
                sm:left-1/2
                sm:right-auto
                sm:w-[min(calc(100%-2rem),620px)]
                sm:-translate-x-1/2
                sm:rounded-[1.5rem]
                sm:border
                sm:pb-2
            "
        >
            <div className="mx-auto flex w-full items-center px-2 sm:px-2.5">
                {/* Navigation */}
                <div className="flex min-w-0 flex-1 items-center">
                    {navItems.map(
                        (
                            item
                        ) => {
                            const isActive =
                                isRouteActive(
                                    item.href
                                )

                            const Icon =
                                item.icon

                            return (
                                <Link
                                    key={
                                        item.href
                                    }
                                    href={
                                        item.href
                                    }
                                    aria-current={
                                        isActive
                                            ? 'page'
                                            : undefined
                                    }
                                    className={cn(
                                        'group relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 transition-colors',

                                        isActive
                                            ? 'text-[hsl(var(--primary))]'
                                            : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                                    )}
                                >
                                    {/* Active indicator */}
                                    <span
                                        aria-hidden
                                        className={cn(
                                            'absolute -top-2 h-0.5 w-5 rounded-full bg-[hsl(var(--primary))] transition-all sm:-top-2.5',

                                            isActive
                                                ? 'opacity-100'
                                                : 'opacity-0'
                                        )}
                                    />

                                    <div
                                        className={cn(
                                            'flex h-7 w-7 items-center justify-center rounded-lg transition-colors',

                                            isActive &&
                                            'bg-[hsl(var(--accent))]'
                                        )}
                                    >
                                        <Icon
                                            className="h-[18px] w-[18px]"
                                            strokeWidth={
                                                isActive
                                                    ? 1.9
                                                    : 1.6
                                            }
                                        />
                                    </div>

                                    <span className="max-w-full truncate text-[8px] font-medium uppercase tracking-[0.12em] sm:text-[9px]">
                                        {
                                            item.label
                                        }
                                    </span>
                                </Link>
                            )
                        }
                    )}
                </div>

                {/* Theme */}
                <div className="ml-1 flex shrink-0 items-center border-l border-border/60 pl-2">
                    <ThemeToggle className="h-8 w-8 border-0 bg-transparent shadow-none hover:bg-secondary" />
                </div>
            </div>
        </nav>
    )
}