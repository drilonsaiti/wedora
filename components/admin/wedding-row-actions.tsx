'use client'

import {
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from 'react'

import { createPortal } from 'react-dom'

import {
    Armchair,
    Images,
    KeyRound,
    MoreHorizontal,
    Settings2,
} from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Link } from '@/lib/navigation'
import { cn } from '@/lib/utils'

interface WeddingRowActionsProps {
    weddingId: string

    /*
     * Settings are opened by the parent,
     * because the parent already owns
     * selectedWedding + EditWeddingForm modal.
     */
    onEdit?: () => void

    className?: string
}

const MENU_WIDTH = 208 // w-52

export function WeddingRowActions({
                                      weddingId,
                                      onEdit,
                                      className,
                                  }: WeddingRowActionsProps) {
    const t =
        useTranslations(
            'weddings'
        )

    const [
        open,
        setOpen,
    ] = useState(false)

    const [
        position,
        setPosition,
    ] = useState<{ top: number; left: number } | null>(null)

    const containerRef =
        useRef<HTMLDivElement>(
            null
        )

    const menuRef =
        useRef<HTMLDivElement>(
            null
        )

    /*
     * Compute the menu's fixed position
     * from the trigger's bounding box,
     * flipping above the trigger if there
     * isn't enough room below.
     */
    const updatePosition =
        () => {
            const trigger =
                containerRef.current

            if (!trigger) {
                return
            }

            const rect =
                trigger.getBoundingClientRect()

            const menuHeight =
                menuRef.current
                    ?.offsetHeight ??
                160

            const spaceBelow =
                window.innerHeight -
                rect.bottom

            const shouldFlip =
                spaceBelow <
                menuHeight + 12

            setPosition({
                top: shouldFlip
                    ? rect.top -
                    menuHeight -
                    8
                    : rect.bottom +
                    8,
                left:
                    rect.right -
                    MENU_WIDTH,
            })
        }

    /*
     * Recompute position on open, and
     * keep it pinned while scrolling
     * or resizing.
     */
    useLayoutEffect(() => {
        if (!open) {
            return
        }

        updatePosition()

        window.addEventListener(
            'scroll',
            updatePosition,
            true
        )

        window.addEventListener(
            'resize',
            updatePosition
        )

        return () => {
            window.removeEventListener(
                'scroll',
                updatePosition,
                true
            )

            window.removeEventListener(
                'resize',
                updatePosition
            )
        }
    }, [open])

    /*
     * Close when clicking outside
     * or pressing Escape. Outside-check
     * now needs to consider the portaled
     * menu too, since it's no longer a
     * DOM descendant of containerRef.
     */
    useEffect(() => {
        if (!open) {
            return
        }

        const handlePointerDown = (
            event: MouseEvent
        ) => {
            const target =
                event.target as Node

            const clickedTrigger =
                containerRef.current?.contains(
                    target
                )

            const clickedMenu =
                menuRef.current?.contains(
                    target
                )

            if (
                !clickedTrigger &&
                !clickedMenu
            ) {
                setOpen(false)
            }
        }

        const handleKeyDown = (
            event: KeyboardEvent
        ) => {
            if (
                event.key ===
                'Escape'
            ) {
                setOpen(false)
            }
        }

        document.addEventListener(
            'mousedown',
            handlePointerDown
        )

        window.addEventListener(
            'keydown',
            handleKeyDown
        )

        return () => {
            document.removeEventListener(
                'mousedown',
                handlePointerDown
            )

            window.removeEventListener(
                'keydown',
                handleKeyDown
            )
        }
    }, [open])

    const closeMenu =
        () => {
            setOpen(false)
        }

    return (
        <div
            ref={containerRef}
            className={cn(
                'relative',
                className
            )}
        >
            {/* Trigger */}
            <button
                type="button"
                onClick={() =>
                    setOpen(
                        (current) =>
                            !current
                    )
                }
                aria-label={t(
                    'moreActions'
                )}
                aria-expanded={
                    open
                }
                aria-haspopup="menu"
                className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full transition-colors',
                    open
                        ? 'bg-secondary text-foreground'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                )}
            >
                <MoreHorizontal
                    className="h-4 w-4"
                    strokeWidth={1.7}
                />
            </button>

            {/* Menu, portaled so it escapes any
                overflow-hidden ancestor (e.g. the
                rounded list card) */}
            {open &&
                createPortal(
                    <div
                        ref={menuRef}
                        role="menu"
                        style={{
                            position:
                                'fixed',
                            top:
                                position?.top ??
                                -9999,
                            left:
                                position?.left ??
                                -9999,
                            width: MENU_WIDTH,
                            visibility:
                                position
                                    ? 'visible'
                                    : 'hidden',
                        }}
                        className="z-50 overflow-hidden rounded-2xl border border-border/70 bg-card p-1.5 shadow-xl"
                    >
                        {/* Seating */}
                        <Link
                            href={`/admin/weddings/${weddingId}`}
                            role="menuitem"
                            onClick={
                                closeMenu
                            }
                            className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-secondary"
                        >
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground transition-colors group-hover:bg-background group-hover:text-foreground">
                                <Armchair
                                    className="h-3.5 w-3.5"
                                    strokeWidth={1.6}
                                />
                            </div>

                            <span>
                                {t(
                                    'manageSeating'
                                )}
                            </span>
                        </Link>

                        {/* Photos */}
                        <Link
                            href={`/admin/weddings/${weddingId}/photos`}
                            role="menuitem"
                            onClick={
                                closeMenu
                            }
                            className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-secondary"
                        >
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground transition-colors group-hover:bg-background group-hover:text-foreground">
                                <Images
                                    className="h-3.5 w-3.5"
                                    strokeWidth={1.6}
                                />
                            </div>

                            <span>
                                {t(
                                    'managePhotos'
                                )}
                            </span>
                        </Link>

                        {/* Divider */}
                        <div className="my-1 h-px bg-border/60" />

                        {/* RSVP API key → full settings page.
                            This is the only place the RSVP API key
                            manager lives (see settings/page.tsx) -- the
                            quick-edit modal below doesn't include it, so
                            this link is what actually makes it reachable
                            from the wedding list. */}
                        <Link
                            href={`/admin/weddings/${weddingId}/settings`}
                            role="menuitem"
                            onClick={
                                closeMenu
                            }
                            className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-secondary"
                        >
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground transition-colors group-hover:bg-background group-hover:text-foreground">
                                <KeyRound
                                    className="h-3.5 w-3.5"
                                    strokeWidth={1.6}
                                />
                            </div>

                            <span>
                                {t(
                                    'rsvpApiKey'
                                )}
                            </span>
                        </Link>

                        {/* Settings → modal (quick edit) */}
                        {onEdit && (
                            <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                    closeMenu()
                                    onEdit()
                                }}
                                className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-secondary"
                            >
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground transition-colors group-hover:bg-background group-hover:text-foreground">
                                    <Settings2
                                        className="h-3.5 w-3.5"
                                        strokeWidth={1.6}
                                    />
                                </div>

                                <span>
                                    {t(
                                        'quickEdit'
                                    )}
                                </span>
                            </button>
                        )}
                    </div>,
                    document.body
                )}
        </div>
    )
}