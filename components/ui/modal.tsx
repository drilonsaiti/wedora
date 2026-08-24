'use client'

import {
    type ReactNode,
    useEffect,
} from 'react'

import { X } from 'lucide-react'

import { cn } from '@/lib/utils'

interface ModalProps {
    open: boolean
    onClose: () => void
    children: ReactNode
    maxWidth?: string
}

export function Modal({
                          open,
                          onClose,
                          children,
                          maxWidth = 'max-w-lg',
                      }: ModalProps) {
    useEffect(() => {
        if (!open) return

        const previousOverflow =
            document.body.style
                .overflow

        document.body.style.overflow =
            'hidden'

        const handleKeyDown = (
            event: KeyboardEvent
        ) => {
            if (
                event.key ===
                'Escape'
            ) {
                onClose()
            }
        }

        window.addEventListener(
            'keydown',
            handleKeyDown
        )

        return () => {
            document.body.style.overflow =
                previousOverflow

            window.removeEventListener(
                'keydown',
                handleKeyDown
            )
        }
    }, [open, onClose])

    if (!open) {
        return null
    }

    return (
        <div
            className="fixed inset-0 z-50 overflow-y-auto bg-black/45 backdrop-blur-md"
            onClick={onClose}
        >
            <div className="flex min-h-full items-end justify-center sm:items-center sm:p-6">
                <div
                    role="dialog"
                    aria-modal="true"
                    className={cn(
                        'relative w-full overflow-hidden rounded-t-[2rem] border border-border/70 bg-card shadow-2xl sm:rounded-[2rem]',
                        maxWidth
                    )}
                    onClick={(
                        event
                    ) =>
                        event.stopPropagation()
                    }
                >
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="absolute right-5 top-5 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-card/80 text-muted-foreground backdrop-blur transition-colors hover:bg-secondary hover:text-foreground"
                    >
                        <X className="h-4 w-4" />
                    </button>

                    <div className="max-h-[90vh] overflow-y-auto p-6 sm:p-8">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    )
}