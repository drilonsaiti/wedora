'use client'

import Link from 'next/link'
import {LogOut, Users} from 'lucide-react'
import {GuestWithTable, Table, VenueElement} from '@/types/seating'
import {VenueMap} from '@/components/venue-map'
import {signOutAction} from '@/actions/admin'

interface CoupleSeatingViewProps {
    guests: GuestWithTable[]
    tables: Table[]
    venueElements: VenueElement[]
    weddingId: string
}

export function CoupleSeatingView({guests, tables, venueElements, weddingId}: CoupleSeatingViewProps) {
    const seatedCount = guests.filter((g) => g.table_id).length

    return (
        <div className="min-h-screen bg-background">
            <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <div>
                        <h1 className="font-serif text-xl font-light text-[hsl(var(--dark))]">Sistemimi i
                            Tavolinave</h1>
                        <p className="font-sans text-xs text-muted-foreground">
                            {seatedCount}/{guests.length} të ftuar të vendosur
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href={`/couple/weddings/${weddingId}/photos`} className="btn-ghost text-xs py-2 px-3">
                            Fotot
                        </Link>
                        <button onClick={async () => await signOutAction()} className="btn-ghost text-xs py-2 px-3">
                            <LogOut className="w-3.5 h-3.5"/>
                            <span className="hidden sm:inline">Çkyçu</span>
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                <VenueMap
                    tables={tables}
                    venueElements={venueElements}
                    highlightedTableId={null}
                    maxHeight={700}
                />

                {/* Lista e të ftuarve — read-only */}
                <div className="mt-8">
                    <h2 className="font-sans text-xs uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                        <Users className="w-3.5 h-3.5"/>
                        Të ftuarit ({guests.length})
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {guests.map((guest) => (
                            <div key={guest.id} className="card-wedding p-3 flex items-center justify-between">
                                <p className="text-sm font-sans">{guest.first_name} {guest.last_name}</p>
                                <span className="text-xs text-muted-foreground">
                  {guest.tables ? `Tavolina ${guest.tables.number}` : 'Pa tavolinë'}
                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}