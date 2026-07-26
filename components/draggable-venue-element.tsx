'use client';

import {useDraggable} from '@dnd-kit/core';
import {cn} from '@/lib/utils';
import {VenueElement} from '@/types/seating';
import {Bath, DoorOpen, Heart, Music, Waves, Wine} from 'lucide-react';

const ICONS = {
    pool: Waves,
    couple_table: Heart,
    music: Music,
    bar: Wine,
    toilet: Bath,
    entrance: DoorOpen,
};

const COLORS = {
    pool: 'border-blue-400 bg-blue-50',
    couple_table: 'border-rose-400 bg-rose-50',
    music: 'border-purple-400 bg-purple-50',
    bar: 'border-amber-400 bg-amber-50',
    toilet: 'border-gray-400 bg-gray-50',
    entrance: 'border-green-500 bg-green-50',
};

interface DraggableVenueElementProps {
    element: VenueElement;
    onDelete: (id: string) => void;
}

export function DraggableVenueElement({element, onDelete}: DraggableVenueElementProps) {
    const {attributes, listeners, setNodeRef, transform, isDragging} = useDraggable({
        id: `venue-${element.id}`,
        data: {type: 'venue_element', element},
    });

    const Icon = ICONS[element.type];

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
                'group relative rounded-xl border-2 border-dashed flex flex-col items-center justify-center shadow-sm transition-shadow',
                COLORS[element.type],
                isDragging ? 'z-50 shadow-xl opacity-80 cursor-grabbing' : 'cursor-grab'
            )}
            {...listeners}
            {...attributes}
        >
            <Icon className="w-5 h-5 text-muted-foreground mb-1"/>
            <span className="text-[10px] font-medium text-muted-foreground text-center px-1">
        {element.label}
      </span>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete(element.id);
                }}
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            >
                ×
            </button>
        </div>
    );
}