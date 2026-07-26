'use client';

import {VenueElement} from '@/types/seating';
import {Bath, DoorOpen, Heart, Music, Waves, Wine} from 'lucide-react';
import {cn} from '@/lib/utils';

const ICONS = {pool: Waves, couple_table: Heart, music: Music, bar: Wine, toilet: Bath, entrance: DoorOpen};
const COLORS = {
    pool: 'border-blue-200 bg-blue-50/30 text-blue-600',
    couple_table: 'border-rose-200 bg-rose-50/30 text-rose-600',
    music: 'border-purple-200 bg-purple-50/30 text-purple-600',
    bar: 'border-amber-200 bg-amber-50/30 text-amber-600',
    toilet: 'border-slate-200 bg-slate-50/30 text-slate-600',
    entrance: 'border-emerald-200 bg-emerald-50/30 text-emerald-600',
};

export function StaticVenueElement({element}: { element: VenueElement }) {
    const Icon = ICONS[element.type];
    return (
        <div
            className={cn('absolute rounded-2xl border-2 border-dashed flex flex-col items-center justify-center transition-colors', COLORS[element.type])}
            style={{left: element.pos_x, top: element.pos_y, width: element.width, height: element.height}}
        >
            <Icon className="w-6 h-6 mb-1 opacity-80"/>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-center px-2">{element.label}</span>
        </div>
    );
}