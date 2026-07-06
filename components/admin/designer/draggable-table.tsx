'use client';

import { useDraggable, useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { Table, Guest } from '@/types/seating';
import { GuestAvatar } from '@/components/guest-avatar';
import { DraggableGuest } from './draggable-guest';

interface DraggableTableProps {
  table: Table;
  guests: Guest[];
}

export function DraggableTable({ table, guests }: DraggableTableProps) {
  const { 
    attributes, 
    listeners, 
    setNodeRef: setDraggableRef, 
    transform, 
    isDragging 
  } = useDraggable({
    id: `table-${table.id}`,
    data: {
      type: 'table',
      table,
    },
  });

  const { 
    setNodeRef: setDroppableRef, 
    isOver 
  } = useDroppable({
    id: `table-drop-${table.id}`,
    data: {
      type: 'table',
      table,
    },
  });

  const style = {
    position: 'absolute' as const,
    left: table.pos_x,
    top: table.pos_y,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
  };

  const isFull = guests.length >= table.seats;

  // Combine refs
  const setRefs = (node: HTMLElement | null) => {
    setDraggableRef(node);
    setDroppableRef(node);
  };

  return (
    <div
      ref={setRefs}
      style={style}
      className={cn(
        'group relative w-32 h-32 rounded-full border-2 bg-card flex flex-col items-center justify-center shadow-md transition-shadow',
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

      {/* Guests around the table */}
      {guests.map((guest, index) => {
        const angle = (index / table.seats) * 2 * Math.PI - Math.PI / 2;
        const radius = 64; // Distance from center
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        return (
          <div
            key={guest.id}
            className="absolute z-10"
            style={{
              transform: `translate(${x}px, ${y}px)`,
            }}
          >
            <DraggableGuest guest={guest} />
          </div>
        );
      })}
    </div>
  );
}
