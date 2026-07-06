'use client';

import { useState, useMemo } from 'react';
import { Search, X, Heart, Armchair } from 'lucide-react';
import { GuestWithTable } from '@/types/seating';
import { GuestAvatar } from '@/components/guest-avatar';
import { motion, AnimatePresence } from 'framer-motion';
import { GuestResultModal } from '@/components/guest-result-modal';

interface HomeSearchProps {
  guests: GuestWithTable[];
}

export function HomeSearch({ guests }: HomeSearchProps) {
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
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[hsl(var(--gold))]" />
        <input
          type="text"
          placeholder="Kerko vendin tuaj permes emrit tuaj"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="input-wedding pl-12 py-5 shadow-md border-[hsl(var(--gold))/30 focus:border-[hsl(var(--gold))] transition-all text-lg w-full"
        />
        {query && (
          <button 
              onClick={() => setQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-full transition-colors"
          >
              <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Dropdown Results */}
      <AnimatePresence>
        {query.length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 left-0 right-0 mt-2 bg-card border border-[hsl(var(--gold))/20 rounded-2xl shadow-xl overflow-hidden"
          >
            {results.length > 0 ? (
              <div className="divide-y divide-border">
                {results.map((guest) => (
                  <div
                    key={guest.id}
                    onClick={() => {
                      setSelectedGuest(guest);
                      setQuery('');
                    }}
                    className="p-4 flex items-center gap-4 cursor-pointer hover:bg-[hsl(var(--accent))] transition-colors text-left"
                  >
                    <GuestAvatar initials={guest.initials} size="sm" />
                    <div className="flex-1">
                      <p className="font-serif text-[hsl(var(--dark))]">{guest.first_name} {guest.last_name}</p>
                    </div>

                      {guest.tables && (
                          <>
                              <div className="flex-1">
                                  <p className="font-bold">
                                      Tavolina {guest.tables.number}
                                  </p>
                              </div>

                              <div className="w-8 h-8 rounded-full border border-[hsl(var(--gold))] flex items-center justify-center bg-white shadow-sm">
      <span className="text-sm text-[hsl(var(--primary))]">
        {guest.tables.number}
      </span>
                              </div>
                          </>
                      )}
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
      />
    </div>
  );
}
