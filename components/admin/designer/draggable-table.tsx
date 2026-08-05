'use client';

import { memo } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { Table, Guest, TableSeat } from '@/types/seating';
import { DraggableGuest } from './draggable-guest';

interface DraggableTableProps {
    table: Table;
    guests: (Guest & { seat_id: string | null })[];
    seats: TableSeat[];
    showGuests: boolean;
}

const SHAPE_CLASSES = {
    round: 'rounded-full',
    square: 'rounded-2xl',
    rectangle: 'rounded-2xl',
};

export const DraggableTable = memo(({ table, guests, seats, showGuests }: DraggableTableProps) => {
    const { attributes, listeners, setNodeRef: setDraggableRef, transform, isDragging } = useDraggable({
        id: `table-${table.id}`,
        data: { type: 'table', table },
    });

    const { setNodeRef: setDroppableRef, isOver } = useDroppable({
        id: `table-drop-${table.id}`,
        data: { type: 'table', table },
    });

    const style = {
        position: 'absolute' as const,
        left: table.pos_x,
        top: table.pos_y,
        width: table.width,
        height: table.height,
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    };

    const isFull = guests.length >= table.seats;

    const setRefs = (node: HTMLElement | null) => {
        setDraggableRef(node);
        setDroppableRef(node);
    };

    return (
        <div
            ref={setRefs}
            style={style}
            className={cn(
                'group relative border-2 bg-card flex flex-col items-center justify-center shadow-md transition-shadow',
                SHAPE_CLASSES[table.shape],
                isDragging ? 'z-50 shadow-xl opacity-80 cursor-grabbing' : 'cursor-grab',
                isOver && !isFull && 'border-[hsl(var(--primary))] bg-[hsl(var(--accent))] scale-105',
                isOver && isFull && 'border-destructive bg-destructive/10',
                !isOver && 'border-[hsl(var(--gold))]'
            )}
            {...listeners}
            {...attributes}
        >
            <div className="text-center">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground block">Tavolina</span>
                <span className="text-2xl font-serif text-[hsl(var(--primary))]">{table.number}</span>
                {table.label && (
                    <span className="text-[10px] font-medium text-[hsl(var(--gold))] block truncate max-w-[100px] px-1">
            {table.label}
          </span>
                )}
                <span className="text-[10px] text-muted-foreground block mt-0.5">
          {guests.length} / {table.seats}
        </span>
            </div>

            {showGuests && (
                table.shape === 'round' ? (
                    guests.map((guest, index) => {
                        const angle = (index / table.seats) * 2 * Math.PI - Math.PI / 2;
                        const radius = 64;
                        const x = Math.cos(angle) * radius;
                        const y = Math.sin(angle) * radius;
                        return (
                            <div key={guest.id} className="absolute z-10" style={{ transform: `translate(${x}px, ${y}px)` }}>
                                <DraggableGuest guest={guest} />
                            </div>
                        );
                    })
                ) : (
                    seats.map((seat) => (
                        <SeatSlot key={seat.id} seat={seat} guest={guests.find((g) => g.seat_id === seat.id)}
                        />
                    ))
                )
            )}
        </div>
    );
});

DraggableTable.displayName = 'DraggableTable';

function SeatSlot({ seat, guest }: { seat: TableSeat; guest?: Guest & { seat_id: string | null } }) {
    const { setNodeRef, isOver } = useDroppable({
        id: `seat-${seat.id}`,
        data: { type: 'seat', seat },
    });

    return (
        <div
            ref={setNodeRef}
            className="absolute top-0 left-0 z-10 w-12 h-12 flex items-center justify-center"
            style={{
                transform: `translate(${seat.relative_x}px, ${seat.relative_y}px) translate(-50%, -50%)`,
            }}
        >
            {guest ? (
                <DraggableGuest guest={guest} />
            ) : (
                <div
                    className={cn(
                        'w-8 h-8 rounded-full border-2 border-dashed flex items-center justify-center text-[9px] text-muted-foreground transition-colors',
                        isOver ? 'border-[hsl(var(--primary))] bg-[hsl(var(--accent))] scale-110' : 'border-border'
                    )}
                >
                    {seat.seat_index + 1}
                </div>
            )}
        </div>
    );
}