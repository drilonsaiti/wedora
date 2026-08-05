'use client'

import {useState} from 'react'
import Link from 'next/link'
import {Armchair, Images, MoreVertical, Settings} from 'lucide-react'

export function WeddingRowActions({weddingId}: { weddingId: string }) {
    const [open, setOpen] = useState(false)

    return (
        <div className="relative">
            <button
                onClick={() => setOpen((o) => !o)}
                onBlur={() => setTimeout(() => setOpen(false), 150)}
                className="p-2 hover:bg-muted rounded-full transition-colors"
            >
                <MoreVertical className="w-4 h-4"/>
            </button>
            {open && (
                <div
                    className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-10">
                    <Link
                        href={`/admin/weddings/${weddingId}`}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                    >
                        <Armchair className="w-3.5 h-3.5 text-muted-foreground"/>
                        Sistemimi
                    </Link>
                    <Link
                        href={`/admin/weddings/${weddingId}/photos`}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                    >
                        <Images className="w-3.5 h-3.5 text-muted-foreground"/>
                        Fotot e Dasmës
                    </Link>
                    <Link href={`/admin/weddings/${weddingId}/settings`}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted transition-colors">
                        <Settings className="w-3.5 h-3.5 text-muted-foreground"/>
                        Cilësimet
                    </Link>
                </div>
            )}
        </div>
    )
}