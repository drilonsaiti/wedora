'use client'

import { X } from 'lucide-react'
import { useEffect } from 'react'

interface ModalProps {
    open: boolean
    onClose: () => void
    children: React.ReactNode
    maxWidth?: string
}

export function Modal({ open, onClose, children, maxWidth = 'max-w-lg' }: ModalProps) {
    useEffect(() => {
        if (!open) return
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', handleKey)
        document.body.style.overflow = 'hidden'
        return () => {
            window.removeEventListener('keydown', handleKey)
            document.body.style.overflow = ''
        }
    }, [open, onClose])

    if (!open) return null

    return (
        <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm overflow-y-auto p-4"
            onClick={onClose}
        >
            <div className="min-h-full flex items-start sm:items-center justify-center py-8">
                <div
                    className={`relative w-full ${maxWidth} bg-card rounded-3xl shadow-2xl p-6 sm:p-8`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/70 transition-colors z-10"
                    >
                        <X className="w-4 h-4" />
                    </button>
                    {children}
                </div>
            </div>
        </div>
    )
}