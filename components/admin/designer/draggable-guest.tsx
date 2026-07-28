'use client';

import {memo} from 'react';
import {useDraggable} from '@dnd-kit/core';
import {cn} from '@/lib/utils';
import {GuestAvatar} from '@/components/guest-avatar';

interface DraggableGuestProps {
    guest: {
        id: string;
        initials: string;
        first_name: string;
        last_name: string;
    };
}

export const DraggableGuest = memo(({guest}: DraggableGuestProps) => {
    const {attributes, listeners, setNodeRef, transform, isDragging} = useDraggable({
        id: `guest-${guest.id}`,
        data: {
            type: 'guest',
            guest,
        },
    });

    const style = transform
        ? {
            transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        }
        : undefined;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={cn(
                'relative group cursor-grab active:cursor-grabbing transition-transform',
                isDragging && 'z-50 scale-110 opacity-70'
            )}
            title={`${guest.first_name} ${guest.last_name}`}
        >
            <GuestAvatar initials={guest.initials} size="md"/>

            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                <div
                    className="bg-[#1a1a1a] text-white text-[10px] px-2 py-1 rounded whitespace-nowrap shadow-lg border border-white/10">
                    {guest.first_name} {guest.last_name}
                </div>
            </div>
        </div>
    );
});
