'use client';

import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { VenueElement } from '@/types/seating';
import { VENUE_ICONS, VENUE_COLORS, VenueIconKey, VenueColorKey } from '@/lib/venue-icons';

interface DraggableVenueElementProps {
    element: VenueElement;
    onDelete: (id: string) => void;
}

const SHAPE_CLASSES = {
    circle: 'rounded-full',
    square: 'rounded-xl',
    rectangle: 'rounded-xl',
};

export function DraggableVenueElement({ element, onDelete }: DraggableVenueElementProps) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `venue-${element.id}`,
        data: { type: 'venue_element', element },
    });

    const Icon = VENUE_ICONS[element.icon as VenueIconKey] ?? VENUE_ICONS.MapPin;
    const colorClass = VENUE_COLORS[element.color as VenueColorKey] ?? VENUE_COLORS.gray;

    const style = {
        position: 'absolute' as const,
        left: element.pos_x,
        top: element.pos_y,
        width: element.width,
        height: element.height,
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                'group relative border-2 border-dashed flex flex-col items-center justify-center shadow-sm transition-shadow',
                SHAPE_CLASSES[element.shape],
                colorClass,
                isDragging ? 'z-50 shadow-xl opacity-80 cursor-grabbing' : 'cursor-grab'
            )}
            {...listeners}
            {...attributes}
        >
            <Icon className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-medium text-center px-1 truncate max-w-full">
        {element.label}
      </span>
            <button
                onClick={(e) => { e.stopPropagation(); onDelete(element.id); }}
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            >
                ×
            </button>
        </div>
    );
}