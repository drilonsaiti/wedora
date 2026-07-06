'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Heart } from 'lucide-react';
import { GuestAvatar } from '@/components/guest-avatar';
import { GuestWithTable } from '@/types/seating';

interface GuestResultModalProps {
  guest: GuestWithTable | null;
  onClose: () => void;
}

export function GuestResultModal({ guest, onClose }: GuestResultModalProps) {
  return (
    <AnimatePresence>
      {guest && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-[hsl(var(--dark))]/40 backdrop-blur-sm flex flex-col items-center justify-center p-6"
          onClick={onClose}
        >
          <motion.div
             initial={{ y: 50, opacity: 0 }}
             animate={{ y: 0, opacity: 1 }}
             exit={{ y: 50, opacity: 0 }}
             className="w-full max-w-sm bg-card rounded-[2.5rem] p-10 text-center shadow-2xl border border-[hsl(var(--gold))/30"
             onClick={e => e.stopPropagation()}
          >
            <div className="mb-8 relative inline-block">
              <GuestAvatar initials={guest.initials} size="xl" className="mx-auto shadow-2xl ring-8 ring-[hsl(var(--accent))]" />
              <div className="absolute -bottom-2 -right-2 bg-[hsl(var(--gold))] w-10 h-10 rounded-full flex items-center justify-center shadow-lg border-4 border-card">
                <Heart className="w-4 h-4 text-white fill-current" />
              </div>
            </div>

            <h2 className="font-serif text-3xl text-[hsl(var(--dark))] mb-1 flex items-center justify-center gap-3">
              <span className="opacity-20 text-sm font-sans tracking-[0.2em]">{guest.initials}</span>
              {guest.first_name} {guest.last_name}
            </h2>
            
            <p className="font-sans text-xs uppercase tracking-[0.3em] text-muted-foreground mb-8">
              Mirësevini në dasmën tonë
            </p>
            
            <div className="h-px w-full bg-gradient-to-r from-transparent via-[hsl(var(--gold))/30] to-transparent mb-8" />

            <div className="bg-[hsl(var(--accent))] rounded-[3rem] p-10 mb-8 border border-[hsl(var(--gold))/10] shadow-inner">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground block mb-4">Tavolina Juaj</span>
              {guest.tables ? (
                <div className="flex flex-col items-center">
                  <div className="w-40 h-40 rounded-full border-4 border-[hsl(var(--gold))] flex flex-col items-center justify-center bg-white shadow-2xl mb-2 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-tr from-[hsl(var(--gold))/5 to-transparent pointer-events-none" />
                    <span className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Tavolina</span>
                    <span className="text-8xl font-serif text-[hsl(var(--primary))] font-medium leading-none">
                      {guest.tables.number}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center py-4">
                  <div className="w-20 h-20 rounded-full border-2 border-dashed border-[hsl(var(--gold))/40] flex items-center justify-center mb-4">
                    <span className="text-4xl">✨</span>
                  </div>
                  <span className="text-lg font-serif text-[hsl(var(--dark))] italic">
                    Ende pa tavolinë
                  </span>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-2 px-4">
                    Vendi juaj do të caktohet së shpejti
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="btn-primary w-full py-5 rounded-2xl shadow-lg hover:shadow-xl transition-all"
            >
              Shumë faleminderit!
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
