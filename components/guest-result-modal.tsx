'use client';

import {AnimatePresence, motion} from 'framer-motion';
import {X} from 'lucide-react';
import {GuestWithTable, Table, VenueElement} from '@/types/seating';
import {VenueMap} from "@/components/venue-map";
import {useTranslations} from 'next-intl';

interface GuestResultModalProps {
    guest: GuestWithTable | null;
    onClose: () => void;
    tables: Table[];
    venueElements: VenueElement[];
}

export function GuestResultModal({guest, onClose, tables, venueElements}: GuestResultModalProps) {
    const t = useTranslations('wedding');

    return (
        <AnimatePresence>
            {guest && (
                <motion.div
                    initial={{opacity: 0}}
                    animate={{opacity: 1}}
                    exit={{opacity: 0}}
                    className="fixed inset-0 z-[100] bg-[hsl(var(--dark))]/40 backdrop-blur-sm overflow-y-auto "
                    onClick={onClose}
                >
                    <div className="min-h-full flex items-start sm:items-center justify-center ">
                        <motion.div
                            initial={{y: 50, opacity: 0}}
                            animate={{y: 0, opacity: 1}}
                            exit={{y: 50, opacity: 0}}
                            className="relative w-full max-w-xl bg-card rounded-[2.5rem] p-6 sm:p-10 text-center shadow-2xl border border-[hsl(var(--gold))]/30"
                            onClick={e => e.stopPropagation()}
                        >
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 sm:top-6 sm:right-6 w-9 h-9 rounded-full bg-[hsl(var(--accent))] flex items-center justify-center hover:bg-[hsl(var(--accent))]/70 transition-colors z-20"
                                aria-label={t('close')}
                            >
                                <X className="w-4 h-4 text-foreground"/>
                            </button>

                            <h2 className="font-serif text-3xl text-foreground mb-1 flex items-center justify-center gap-3 pr-8">
                                {guest.first_name} {guest.last_name}
                            </h2>

                            <p className="font-sans text-xs uppercase tracking-[0.3em] text-muted-foreground mb-8">
                                {t('welcome')}
                            </p>

                            <div
                                className="h-px w-full bg-gradient-to-r from-transparent via-[hsl(var(--gold))]/30 to-transparent mb-8"/>

                            <div
                                className="bg-[hsl(var(--accent))]/10 backdrop-blur-sm rounded-[3rem] py-8 px-4 mb-6 border border-[hsl(var(--gold))]/10 shadow-sm relative overflow-hidden">
                                <div
                                    className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[hsl(var(--gold))]/10 to-transparent"/>
                                <span
                                    className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground block mb-4">{t('yourTable')}</span>
                                {guest.tables ? (
                                    <div className="flex flex-col items-center gap-6">
                                        <div className="relative">
                                            <div
                                                className="w-32 h-32 rounded-full border border-[hsl(var(--gold))]/30 flex flex-col items-center justify-center bg-white shadow-xl relative z-10">
                                                <span
                                                    className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{t('number')}</span>
                                                <span
                                                    className="text-6xl font-serif text-[hsl(var(--primary))] font-medium leading-none">
        {guest.tables.number}
    </span>
                                                {guest.tables.shape !== 'round' && (
                                                    <span
                                                        className="text-[10px] uppercase tracking-widest text-[hsl(var(--gold))] mt-1">
                                                        {t('seatIndex', {index: (guest.table_seats?.seat_index ?? 0) + 1})}
                                                    </span>
                                                )}
                                            </div>
                                            <div
                                                className="absolute -inset-2 bg-[hsl(var(--gold))]/5 rounded-full blur-xl -z-0"/>
                                        </div>

                                        <div className="w-full">
                                            <div className="flex items-center justify-center gap-2 mb-3">
                                                <div className="h-px w-8 bg-[hsl(var(--gold))]/20"/>
                                                <span
                                                    className="text-[10px] uppercase tracking-widest text-muted-foreground whitespace-nowrap">
                                                    {t('venueMap')}
                                                  </span>
                                                <div className="h-px w-8 bg-[hsl(var(--gold))]/20"/>
                                            </div>
                                            <VenueMap
                                                tables={tables}
                                                venueElements={venueElements}
                                                highlightedTableId={guest.table_id}
                                                highlightedSeatId={guest.seat_id}
                                                maxHeight={400}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center py-4">
                                        <div
                                            className="w-20 h-20 rounded-full border-2 border-dashed border-[hsl(var(--gold))]/40 flex items-center justify-center mb-4">
                                            <span className="text-4xl">✨</span>
                                        </div>
                                        <span className="text-lg font-serif text-foreground italic">
                                          {t('noTable')}
                                        </span>
                                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-2 px-4">
                                            {t('noTableDescription')}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/*<button
                      onClick={onClose}
                      className="btn-primary w-full py-5 rounded-2xl shadow-lg hover:shadow-xl transition-all"
                  >
                    Shumë faleminderit!
                  </button>*/}
                        </motion.div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}