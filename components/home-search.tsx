'use client';

import {useMemo, useState} from 'react';
import {Heart, Search, X} from 'lucide-react';
import {GuestWithTable, Table, VenueElement} from '@/types/seating';
import {GuestAvatar} from '@/components/guest-avatar';
import {AnimatePresence, motion} from 'framer-motion';
import {GuestResultModal} from '@/components/guest-result-modal';

interface HomeSearchProps {
    guests: GuestWithTable[];
    tables: Table[];
    venueElements: VenueElement[];
}

export function HomeSearch({guests, tables, venueElements}: HomeSearchProps) {
    const [query, setQuery] = useState('');
    const [selectedGuest, setSelectedGuest] = useState<GuestWithTable | null>(null);

    const results = useMemo(() => {
        if (query.length < 2) return [];
        const q = query.toLowerCase();
        return guests.filter(g =>
            `${g.first_name} ${g.last_name}`.toLowerCase().includes(q)
        ).slice(0, 5);
    }, [guests, query]);

    return (
        <div className="relative mb-10">
            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[hsl(var(--gold))]"/>
                <input
                    type="text"
                    placeholder="Kerko vendin tuaj permes emrit tuaj"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="input-wedding pl-12 py-5 shadow-md border-[hsl(var(--gold))]/30 focus:border-[hsl(var(--gold))] transition-all text-lg w-full"
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

            {/* Dropdown Results */}
            <AnimatePresence>
                {query.length >= 2 && (
                    <motion.div
                        initial={{opacity: 0, y: -10}}
                        animate={{opacity: 1, y: 0}}
                        exit={{opacity: 0, y: -10}}
                        className="absolute z-50 left-0 right-0 mt-2 bg-card border border-[hsl(var(--gold))]/20 rounded-2xl shadow-xl overflow-hidden"
                    >
                        {results.length > 0 ? (
                            <div className="divide-y divide-border">
                                {results.map((guest) => (
                                    <div
                                        key={guest.id}
                                        className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 hover:bg-[hsl(var(--accent))] transition-colors"
                                    >
                                        <div className="flex items-center gap-4 min-w-0">
                                            <GuestAvatar initials={guest.initials} size="sm"
                                                         className="shrink-0 self-start"/>
                                            <div className="min-w-0">
                                                <p className="font-serif text-[hsl(var(--dark))] truncate">
                                                    {guest.first_name} {guest.last_name}
                                                </p>
                                                <p className="text-xs text-muted-foreground uppercase tracking-widest mt-0.5">
                                                    {guest.tables
                                                        ? guest.tables.shape === 'round'
                                                            ? `Tavolina ${guest.tables.number}`
                                                            : `Tavolina ${guest.tables.number} · Vendi ${(guest.table_seats?.seat_index ?? 0) + 1}`
                                                        : 'Ende pa tavolinë'}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setSelectedGuest(guest);
                                                setQuery('');
                                            }}
                                            className="btn-primary w-full sm:w-auto sm:ml-auto shrink-0 py-2 px-4 text-xs rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                                        >
                                            Shiko vendin
                                            <Heart className="w-3.5 h-3.5 fill-current"/>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-6 text-center text-sm text-muted-foreground italic">
                                Nuk u gjet asnjë rezultat.
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

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
