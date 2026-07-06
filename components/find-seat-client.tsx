'use client';

import { useState, useMemo } from 'react';
import { Search, X, Heart } from 'lucide-react';
import { GuestWithTable } from '@/types/seating';
import { GuestAvatar } from '@/components/guest-avatar';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { GuestResultModal } from '@/components/guest-result-modal';

interface FindSeatClientProps {
  guests: GuestWithTable[];
}

export function FindSeatClient({ guests }: FindSeatClientProps) {
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
             <div className="h-px w-8 bg-[hsl(var(--gold))] opacity-60" />
             <Heart className="w-3 h-3 text-[hsl(var(--primary))] fill-current" />
             <div className="h-px w-8 bg-[hsl(var(--gold))] opacity-60" />
          </div>
          <h1 className="font-serif text-4xl font-light text-[hsl(var(--dark))] mb-2">Gjeni vendin tuaj</h1>
          <p className="font-sans text-xs tracking-widest uppercase text-muted-foreground">
            Dasma e Sara & Drilon
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[hsl(var(--gold))]" />
          <input
            type="text"
            placeholder="Kërkoni emrin tuaj..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input-wedding pl-12 py-5 shadow-md border-[hsl(var(--gold))/30 focus:border-[hsl(var(--gold))] transition-all text-lg"
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

        {/* Results */}
        <div className="space-y-4">
          {results.map((guest) => (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              key={guest.id}
              onClick={() => setSelectedGuest(guest)}
              className="group bg-card border border-[hsl(var(--gold))/20 hover:border-[hsl(var(--gold))] p-5 flex items-center gap-5 cursor-pointer rounded-2xl transition-all hover:shadow-lg active:scale-[0.98]"
            >
              <GuestAvatar initials={guest.initials} size="lg" className="group-hover:scale-105 transition-transform border-2 border-[hsl(var(--accent))]" />
              <div className="flex-1">
                <h3 className="font-serif text-xl text-[hsl(var(--dark))] group-hover:text-[hsl(var(--primary))] transition-colors">
                  {guest.first_name} {guest.last_name}
                </h3>
                <p className="font-sans text-xs uppercase tracking-widest text-muted-foreground mt-1">
                  {guest.tables ? (
                    <span className="flex items-center gap-1.5">
                      <Armchair className="w-3 h-3 text-[hsl(var(--gold))]" />
                      Tavolina {guest.tables.number}
                    </span>
                  ) : 'Ende pa tavolinë'}
                </p>
              </div>
              {guest.tables && (
                <div className="w-12 h-12 rounded-full border-2 border-[hsl(var(--gold))] flex items-center justify-center bg-[hsl(var(--accent))] shadow-sm">
                  <span className="font-serif text-xl text-[hsl(var(--primary))]">{guest.tables.number}</span>
                </div>
              )}
              <div className="w-8 h-8 rounded-full bg-[hsl(var(--accent))] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Heart className="w-4 h-4 text-[hsl(var(--primary))] fill-current" />
              </div>
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
      />
    </div>
  );
}

import { Armchair } from 'lucide-react';
