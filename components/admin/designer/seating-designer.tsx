'use client';

import { useState, useCallback, useRef } from 'react';
import { toPng } from 'html-to-image';
import { Download, Image as ImageIcon } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  DragEndEvent,
  DragStartEvent,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import { restrictToFirstScrollableAncestor, restrictToWindowEdges } from '@dnd-kit/modifiers';
import { Table, Guest, GuestWithTable } from '@/types/seating';
import { DraggableTable } from './draggable-table';
import { DraggableGuest } from './draggable-guest';
import { GuestAvatar } from '@/components/guest-avatar';
import { assignGuestToTable, updateTablePosition } from '@/actions/seating';
import { Toaster } from '@/components/ui/sonner';

interface SeatingDesignerProps {
  guests: GuestWithTable[];
  tables: Table[];
}

export function SeatingDesigner({ guests, tables }: SeatingDesignerProps) {
  const [localTables, setLocalTables] = useState<Table[]>(tables);
  const [localGuests, setLocalGuests] = useState<GuestWithTable[]>(guests);
  const [activeGuest, setActiveGuest] = useState<Guest | null>(null);
  const [activeTable, setActiveTable] = useState<Table | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const { type, guest, table } = active.data.current || {};

    if (type === 'guest') {
      setActiveGuest(guest);
    } else if (type === 'table') {
      setActiveTable(table);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveGuest(null);
    setActiveTable(null);

    const activeData = active.data.current;

    // Case 1: Dragging a table
    if (activeData?.type === 'table') {
      const table = activeData.table;
      
      if (!containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      
      // Calculate absolute position relative to the container
      // Use clientX/Y from the original event for precision
      const x = event.activatorEvent instanceof PointerEvent || event.activatorEvent instanceof MouseEvent 
        ? (event.activatorEvent as MouseEvent).clientX + event.delta.x - rect.left - 64 
        : table.pos_x + event.delta.x;
      const y = event.activatorEvent instanceof PointerEvent || event.activatorEvent instanceof MouseEvent
        ? (event.activatorEvent as MouseEvent).clientY + event.delta.y - rect.top - 64
        : table.pos_y + event.delta.y;

      const newPosX = Math.round(x);
      const newPosY = Math.round(y);

      // Update local state IMMEDIATELY and OPTIMISTICALLY
      setLocalTables(prev => prev.map(t => t.id === table.id ? { ...t, pos_x: newPosX, pos_y: newPosY } : t));

      try {
        await updateTablePosition(table.id, newPosX, newPosY);
      } catch (err) {
        console.error(err);
        // Revert on error
        setLocalTables(prev => prev.map(t => t.id === table.id ? { ...t, pos_x: table.pos_x, pos_y: table.pos_y } : t));
      }
      return;
    }

    if (!over) {
        // If dropped outside and it was a guest, unassign them
        const { type, guest } = active.data.current || {};
        if (type === 'guest') {
            try {
                await assignGuestToTable(guest.id, null);
                setLocalGuests(prev => prev.map(g => g.id === guest.id ? { ...g, table_id: null, tables: null } : g));
            } catch (err) {
                console.error(err);
            }
        }
        return;
    }

    const overData = over.data.current;

    // Case 2: Dragging a guest onto a table
    if (activeData?.type === 'guest' && overData?.type === 'table') {
      const guest = activeData.guest;
      const table = overData.table;
      
      const guestsAtTable = localGuests.filter(g => g.table_id === table.id);
      
      if (guestsAtTable.length >= table.seats) {
        alert(`Tavolina ${table.number} është plot!`);
        return;
      }

      try {
        await assignGuestToTable(guest.id, table.id);
        setLocalGuests(prev => prev.map(g => g.id === guest.id ? { ...g, table_id: table.id, tables: table } : g));
      } catch (err) {
        alert('Dështoi caktimi i të ftuarit në tavolinë');
      }
    }
  };

  const unassignedGuests = localGuests.filter(g => !g.table_id);

  const exportAsImage = useCallback(() => {
    if (containerRef.current === null) {
      return
    }

    toPng(containerRef.current, { cacheBust: true, backgroundColor: '#ffffff' })
      .then((dataUrl) => {
        const link = document.createElement('a')
        link.download = 'seating-plan.png'
        link.href = dataUrl
        link.click()
      })
      .catch((err) => {
        console.error('oops, something went wrong!', err)
      })
  }, [containerRef])

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToWindowEdges]}
    >
      <div className="flex flex-col h-full gap-6">
        {/* Sidebar: Unassigned Guests */}
        <div className="bg-card border border-border rounded-2xl p-4 flex flex-col sm:flex-row gap-4 justify-between items-start">
          <div className="flex-1">
            <h3 className="font-sans font-medium text-sm mb-4">Të ftuarit e pa caktuar ({unassignedGuests.length})</h3>
            <div className="flex flex-wrap gap-3 max-h-32 overflow-y-auto p-1">
              {unassignedGuests.map(guest => (
                <DraggableGuest key={guest.id} guest={guest} />
              ))}
              {unassignedGuests.length === 0 && (
                <p className="text-xs text-muted-foreground italic">Të gjithë të ftuarit janë caktuar.</p>
              )}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
             <button 
                onClick={exportAsImage}
                className="btn-ghost text-xs py-2 px-3 border border-border rounded-xl"
                title="Shkarko si Foto"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Shkarko si Foto</span>
              </button>
          </div>
        </div>

        {/* Canvas Area */}
        <div 
          ref={containerRef}
          className="flex-1 bg-white border border-border rounded-2xl relative overflow-auto shadow-inner min-h-[600px] p-20"
          style={{ 
            backgroundImage: 'radial-gradient(circle, #f0f0f0 1px, transparent 1px)',
            backgroundSize: '30px 30px'
          }}
        >
          <div className="relative w-full h-full" style={{ minHeight: '800px', minWidth: '1000px' }}>
            {localTables.map(table => (
              <DraggableTable 
                key={table.id} 
                table={table} 
                guests={localGuests.filter(g => g.table_id === table.id)} 
              />
            ))}
          </div>
        </div>
      </div>

      <DragOverlay dropAnimation={{
        sideEffects: defaultDropAnimationSideEffects({
          styles: {
            active: {
              opacity: '0.5',
            },
          },
        }),
      }}>
        {activeGuest && <GuestAvatar initials={activeGuest.initials} size="md" className="scale-110 shadow-xl" />}
        {activeTable && (
          <div className="w-32 h-32 rounded-full border-2 border-[hsl(var(--gold))] bg-card flex flex-col items-center justify-center shadow-2xl opacity-80 scale-105">
             <span className="text-[10px] uppercase tracking-widest text-muted-foreground block">Tavolina</span>
             <span className="text-2xl font-serif text-[hsl(var(--primary))]">{activeTable.number}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
