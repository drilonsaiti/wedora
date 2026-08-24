'use client'

import {
    type KeyboardEvent,
    type ReactNode,
    useEffect,
    useId,
    useRef,
    useState,
} from 'react'

import {
    AlertTriangle,
    Loader2,
} from 'lucide-react'
import {
    AnimatePresence,
    motion,
    useReducedMotion,
} from 'framer-motion'
import { createPortal } from 'react-dom'

import { cn } from '@/lib/utils'

type ConfirmationVariant =
    | 'default'
    | 'destructive'

interface ConfirmationModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void

    title: string
    description?: string

    confirmLabel: string
    cancelLabel: string

    onConfirm: () => void | Promise<void>

    variant?: ConfirmationVariant
    loading?: boolean

    icon?: ReactNode

    children?: ReactNode
}

export function ConfirmationModal({
                                      open,
                                      onOpenChange,
                                      title,
                                      description,
                                      confirmLabel,
                                      cancelLabel,
                                      onConfirm,
                                      variant = 'default',
                                      loading: controlledLoading,
                                      icon,
                                      children,
                                  }: ConfirmationModalProps) {
    const shouldReduceMotion =
        useReducedMotion()

    const titleId =
        useId()

    const descriptionId =
        useId()

    const dialogRef =
        useRef<HTMLDivElement>(
            null
        )

    const cancelButtonRef =
        useRef<HTMLButtonElement>(
            null
        )

    const confirmButtonRef =
        useRef<HTMLButtonElement>(
            null
        )

    const previousActiveElement =
        useRef<HTMLElement | null>(
            null
        )

    const [
        mounted,
        setMounted,
    ] =
        useState(false)

    const [
        internalLoading,
        setInternalLoading,
    ] =
        useState(false)

    const loading =
        controlledLoading ??
        internalLoading

    const isDestructive =
        variant ===
        'destructive'

    /*
     * ============================================
     * PORTAL
     * ============================================
     */
    useEffect(() => {
        setMounted(true)

        return () => {
            setMounted(false)
        }
    }, [])

    /*
     * ============================================
     * OPEN / CLOSE BEHAVIOUR
     * ============================================
     */
    useEffect(() => {
        if (
            !open ||
            !mounted
        ) {
            return
        }

        previousActiveElement.current =
            document.activeElement instanceof
            HTMLElement
                ? document.activeElement
                : null

        const previousOverflow =
            document.body.style
                .overflow

        document.body.style.overflow =
            'hidden'

        const timer =
            window.setTimeout(
                () => {
                    /*
                     * For destructive actions we
                     * intentionally focus Cancel
                     * first to reduce accidental
                     * deletion.
                     */
                    if (
                        isDestructive
                    ) {
                        cancelButtonRef.current?.focus()
                    } else {
                        confirmButtonRef.current?.focus()
                    }
                },
                0
            )

        return () => {
            window.clearTimeout(
                timer
            )

            document.body.style.overflow =
                previousOverflow

            previousActiveElement.current?.focus()
        }
    }, [
        open,
        mounted,
        isDestructive,
    ])

    const close =
        () => {
            if (
                loading
            ) {
                return
            }

            onOpenChange(
                false
            )
        }

    /*
     * ============================================
     * CONFIRM
     * ============================================
     */
    const handleConfirm =
        async () => {
            if (
                loading
            ) {
                return
            }

            /*
             * If loading is controlled by the
             * parent, let the parent own it.
             *
             * Otherwise the modal handles its
             * own async state automatically.
             */
            if (
                controlledLoading ===
                undefined
            ) {
                setInternalLoading(
                    true
                )
            }

            try {
                await onConfirm()

                onOpenChange(
                    false
                )
            } finally {
                if (
                    controlledLoading ===
                    undefined
                ) {
                    setInternalLoading(
                        false
                    )
                }
            }
        }

    /*
     * ============================================
     * KEYBOARD / FOCUS TRAP
     * ============================================
     */
    const handleKeyDown =
        (
            event: KeyboardEvent<HTMLDivElement>
        ) => {
            if (
                event.key ===
                'Escape'
            ) {
                event.preventDefault()

                close()

                return
            }

            if (
                event.key !==
                'Tab'
            ) {
                return
            }

            const dialog =
                dialogRef.current

            if (!dialog) {
                return
            }

            const focusableElements =
                Array.from(
                    dialog.querySelectorAll<HTMLElement>(
                        [
                            'button:not([disabled])',
                            '[href]',
                            'input:not([disabled])',
                            'select:not([disabled])',
                            'textarea:not([disabled])',
                            '[tabindex]:not([tabindex="-1"])',
                        ].join(',')
                    )
                ).filter(
                    (element) =>
                        !element.hasAttribute(
                            'aria-hidden'
                        )
                )

            if (
                focusableElements.length ===
                0
            ) {
                event.preventDefault()

                dialog.focus()

                return
            }

            const first =
                focusableElements[0]

            const last =
                focusableElements[
                focusableElements.length -
                1
                    ]

            if (
                event.shiftKey &&
                document.activeElement ===
                first
            ) {
                event.preventDefault()

                last.focus()

                return
            }

            if (
                !event.shiftKey &&
                document.activeElement ===
                last
            ) {
                event.preventDefault()

                first.focus()
            }
        }

    if (!mounted) {
        return null
    }

    return createPortal(
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-[99999] flex items-end justify-center sm:items-center sm:p-6"
                    initial={
                        shouldReduceMotion
                            ? false
                            : {
                                opacity: 0,
                            }
                    }
                    animate={{
                        opacity: 1,
                    }}
                    exit={
                        shouldReduceMotion
                            ? undefined
                            : {
                                opacity: 0,
                            }
                    }
                >
                    {/* =================================
                        BACKDROP
                    ================================= */}
                    <motion.button
                        type="button"
                        aria-label={cancelLabel}
                        disabled={
                            loading
                        }
                        onClick={
                            close
                        }
                        className="absolute inset-0 cursor-default bg-black/45 backdrop-blur-[2px] disabled:pointer-events-none"
                        initial={
                            shouldReduceMotion
                                ? false
                                : {
                                    opacity: 0,
                                }
                        }
                        animate={{
                            opacity: 1,
                        }}
                        exit={
                            shouldReduceMotion
                                ? undefined
                                : {
                                    opacity: 0,
                                }
                        }
                    />

                    {/* =================================
                        DIALOG
                    ================================= */}
                    <motion.div
                        ref={
                            dialogRef
                        }
                        role={
                            isDestructive
                                ? 'alertdialog'
                                : 'dialog'
                        }
                        aria-modal="true"
                        aria-labelledby={
                            titleId
                        }
                        aria-describedby={
                            description
                                ? descriptionId
                                : undefined
                        }
                        tabIndex={-1}
                        onKeyDown={
                            handleKeyDown
                        }
                        initial={
                            shouldReduceMotion
                                ? false
                                : {
                                    opacity: 0,
                                    y: 24,
                                    scale:
                                        0.985,
                                }
                        }
                        animate={{
                            opacity: 1,
                            y: 0,
                            scale: 1,
                        }}
                        exit={
                            shouldReduceMotion
                                ? undefined
                                : {
                                    opacity: 0,
                                    y: 16,
                                    scale:
                                        0.99,
                                }
                        }
                        transition={{
                            duration: 0.18,
                            ease: [
                                0.22,
                                1,
                                0.36,
                                1,
                            ],
                        }}
                        className={cn(
                            'relative z-10 w-full bg-card shadow-2xl outline-none',
                            'border border-border/70',
                            /*
                             * Mobile = bottom sheet.
                             * Desktop = compact modal.
                             */
                            'rounded-t-[2rem] px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-6',
                            'sm:max-w-md sm:rounded-[2rem] sm:p-6'
                        )}
                    >
                        {/* =================================
                            ICON
                        ================================= */}
                        <div
                            className={cn(
                                'flex h-11 w-11 items-center justify-center rounded-2xl border',

                                isDestructive
                                    ? 'border-destructive/15 bg-destructive/[0.06] text-destructive'
                                    : 'border-border/70 bg-secondary/60 text-foreground'
                            )}
                        >
                            {icon ?? (
                                <AlertTriangle
                                    className="h-5 w-5"
                                    strokeWidth={
                                        1.6
                                    }
                                />
                            )}
                        </div>

                        {/* =================================
                            CONTENT
                        ================================= */}
                        <div className="mt-5">
                            <h2
                                id={
                                    titleId
                                }
                                className="font-serif text-2xl font-light tracking-[-0.02em] text-foreground"
                            >
                                {
                                    title
                                }
                            </h2>

                            {description && (
                                <p
                                    id={
                                        descriptionId
                                    }
                                    className="mt-2 text-sm leading-6 text-muted-foreground"
                                >
                                    {
                                        description
                                    }
                                </p>
                            )}

                            {children && (
                                <div className="mt-4">
                                    {
                                        children
                                    }
                                </div>
                            )}
                        </div>

                        {/* =================================
                            ACTIONS
                        ================================= */}
                        <div className="mt-7 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
                            <button
                                ref={
                                    cancelButtonRef
                                }
                                type="button"
                                disabled={
                                    loading
                                }
                                onClick={
                                    close
                                }
                                className="btn-secondary justify-center sm:min-w-[110px] disabled:pointer-events-none disabled:opacity-50"
                            >
                                {
                                    cancelLabel
                                }
                            </button>

                            <button
                                ref={
                                    confirmButtonRef
                                }
                                type="button"
                                disabled={
                                    loading
                                }
                                onClick={
                                    handleConfirm
                                }
                                className={cn(
                                    'inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6',
                                    'text-xs font-medium tracking-[0.06em] transition-all duration-200',
                                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                                    'disabled:pointer-events-none disabled:opacity-50',

                                    isDestructive
                                        ? 'bg-destructive text-destructive-foreground shadow-sm hover:-translate-y-0.5 hover:shadow-md'
                                        : 'bg-[hsl(var(--primary))] text-white shadow-sm hover:-translate-y-0.5 hover:shadow-md hover:opacity-95'
                                )}
                            >
                                {loading && (
                                    <Loader2
                                        aria-hidden
                                        className="h-4 w-4 animate-spin"
                                    />
                                )}

                                {
                                    confirmLabel
                                }
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    )
}