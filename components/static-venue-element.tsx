'use client';

import {VenueElement} from '@/types/seating';
import {VENUE_COLORS, VENUE_ICONS, VenueColorKey, VenueIconKey} from '@/lib/venue-icons';
import {cn} from '@/lib/utils';

const SHAPE_CLASSES = {
    circle: 'rounded-full',
    square: 'rounded-xl',
    rectangle: 'rounded-xl',
};

export function StaticVenueElement({element}: { element: VenueElement }) {
    const Icon = VENUE_ICONS[element.icon as VenueIconKey] ?? VENUE_ICONS.MapPin;
    const colorClass = VENUE_COLORS[element.color as VenueColorKey] ?? VENUE_COLORS.gray;

    return (
        <div
            className={cn('absolute border-2 border-dashed flex flex-col items-center justify-center', SHAPE_CLASSES[element.shape], colorClass)}
            style={{left: element.pos_x, top: element.pos_y, width: element.width, height: element.height}}
        >
            <Icon className="w-5 h-5 mb-1"/>
            <span className="text-[10px] font-medium text-center px-1 truncate max-w-full">{element.label}</span>
        </div>
    );
}