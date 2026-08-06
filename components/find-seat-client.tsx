'use client';

import {useMemo, useState} from 'react';
import {Armchair, Heart, Search, X} from 'lucide-react';
import {GuestWithTable, Table, VenueElement} from '@/types/seating';
import {GuestAvatar} from '@/components/guest-avatar';
import {motion} from 'framer-motion';
import {GuestResultModal} from '@/components/guest-result-modal';

interface FindSeatClientProps {
    guests: GuestWithTable[];
    tables: Table[];
    venueElements: VenueElement[];
    groomName: string;
    brideName: string;
}

export function FindSeatClient({guests, tables, venueElements, groomName, brideName}: FindSeatClientProps) {
    const [query, setQuery] = useState('');
    const [selectedGuest, setSelectedGuest] = useState<GuestWithTable | null>(null);

    const results = useMemo(() => {
        if (query.length < 2) return [];
        const q = query.toLowerCase();
        return guests.filter(g =>
            `${g.first_name} ${g.last_name}`.toLowerCase().includes(q)
        ).slice(0, 10);
    }, [guests, query]);

    return (
        <div className="min-h-screen bg-background pb-32">
            <main className="max-w-md mx-auto px-6 pt-16">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <div className="h-px w-8 bg-[hsl(var(--gold))] opacity-60"/>
                        <Heart className="w-3 h-3 text-[hsl(var(--primary))] fill-current"/>
                        <div className="h-px w-8 bg-[hsl(var(--gold))] opacity-60"/>
                    </div>
                    <h1 className="font-serif text-4xl font-light text-foreground mb-2">Gjeni vendin tuaj</h1>
                    <p className="font-sans text-xs tracking-widest uppercase text-muted-foreground">
                        Dasma e {brideName} & {groomName}
                    </p>

                    <p className="font-sans text-xs text-muted-foreground italic mt-3">
                        Kërkoni emrin tuaj dhe shihni vendin tuaj në hartë 🗺️
                    </p>
                </div>

                {/* Search */}
                <div className="relative mb-8">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[hsl(var(--gold))]"/>
                    <input
                        type="text"
                        placeholder="Kërkoni emrin tuaj..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="input-wedding pl-12 py-5 shadow-md border-[hsl(var(--gold))]/30 focus:border-[hsl(var(--gold))] transition-all text-lg"
                    />
                    {query && (
                        <button
                            onClick={() => setQuery('')}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-full transition-colors"
                        >
                            <X className="w-4 h-4 text-muted-foreground"/>
                        </button>
                    )}
                </div>

                {/* Results */}
                <div className="space-y-4">
                    {results.map((guest) => (
                        <motion.div
                            initial={{opacity: 0, x: -10}}
                            animate={{opacity: 1, x: 0}}
                            key={guest.id}
                            className="group bg-card border border-[hsl(var(--gold))]/20 hover:border-[hsl(var(--gold))] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 rounded-2xl transition-all hover:shadow-lg"
                        >
                            <div className="flex items-center gap-4 min-w-0">
                                <GuestAvatar
                                    initials={guest.initials}
                                    size="lg"
                                    className="border-2 border-[hsl(var(--accent))] shrink-0 self-start"
                                />
                                <div className="min-w-0">
                                    <h3 className="font-serif text-xl text-foreground truncate">
                                        {guest.first_name} {guest.last_name}
                                    </h3>
                                    <p className="font-sans text-xs uppercase tracking-widest text-muted-foreground mt-1">
                                        {guest.tables ? (
                                            <span className="flex items-center gap-1.5">
            <Armchair className="w-3 h-3 text-[hsl(var(--gold))]"/>
                                                {guest.tables.shape === 'round'
                                                    ? `Tavolina ${guest.tables.number}`
                                                    : `Tavolina ${guest.tables.number} · Vendi ${(guest.table_seats?.seat_index ?? 0) + 1}`}
        </span>
                                        ) : 'Ende pa tavolinë'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedGuest(guest)}
                                className="btn-primary w-full sm:w-auto shrink-0 py-2.5 px-4 text-xs rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                            >
                                Shiko vendin
                                <Heart className="w-3.5 h-3.5 fill-current"/>
                            </button>
                        </motion.div>
                    ))}
                    {query.length >= 2 && results.length === 0 && (
                        <div className="text-center py-12 bg-muted/30 rounded-3xl border border-dashed border-muted">
                            <p className="text-sm text-muted-foreground font-sans">
                                Nuk mundëm të gjenim &ldquo;{query}&rdquo; në listën tonë të të ftuarve.
                            </p>
                        </div>
                    )}
                    {query.length > 0 && query.length < 2 && (
                        <p className="text-center py-4 text-xs text-muted-foreground font-sans italic opacity-70">
                            Vazhdoni të shkruani për të gjetur vendin tuaj...
                        </p>
                    )}
                </div>
            </main>

            {/* Seat Result Modal (Reused Component) */}
            <GuestResultModal
                guest={selectedGuest}
                onClose={() => setSelectedGuest(null)}
                tables={tables}
                venueElements={venueElements}
            />
        </div>
    );
}

