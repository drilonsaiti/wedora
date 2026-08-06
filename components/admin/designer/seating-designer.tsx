'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import {toPng} from 'html-to-image';
import {
    Bath,
    DoorOpen,
    Heart,
    Image as ImageIcon,
    Maximize2,
    Minimize2,
    Music,
    Plus,
    Search,
    Waves,
    Wine
} from 'lucide-react';
import {
    closestCenter,
    CollisionDetection,
    defaultDropAnimationSideEffects,
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    PointerSensor,
    pointerWithin,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {restrictToWindowEdges} from '@dnd-kit/modifiers';
import {
    Guest,
    GuestWithTable,
    Table,
    TableWithSeats,
    VenueElement,
    VenueElementShape,
    VenueElementType
} from '@/types/seating';
import {DraggableTable} from './draggable-table';
import {DraggableGuest} from './draggable-guest';
import {GuestAvatar} from '@/components/guest-avatar';
import {
    assignGuestToSeat,
    assignGuestToTable,
    createVenueElement,
    deleteVenueElement,
    updateTablePosition,
    updateVenueElementPosition
} from '@/actions/seating';
import {cn} from "@/lib/utils";
import {DraggableVenueElement} from "@/components/admin/designer/draggable-venue-element";
import {ToggleSwitch} from '@/components/ui/toggle-switch';
import {VenueElementModal} from '@/components/ui/venue-element-modal'
import {VenueColorKey, VenueIconKey} from '@/lib/venue-icons'

interface SeatingDesignerProps {
    guests: GuestWithTable[];
    tables: TableWithSeats[];
    venueElements: VenueElement[];
    weddingId: string;
}


const GRID_SIZE = 30;
const MIN_POS_Y = 60;
const MIN_POS_X = 60;

const ELEMENT_TYPES: { type: VenueElementType; label: string; Icon: any }[] = [
    {type: 'entrance', label: 'Hyrja', Icon: DoorOpen},
    {type: 'pool', label: 'Pishina', Icon: Waves},
    {type: 'couple_table', label: 'Çifti', Icon: Heart},
    {type: 'music', label: 'Muzika', Icon: Music},
    {type: 'bar', label: 'Bar', Icon: Wine},
    {type: 'toilet', label: 'Tualeti', Icon: Bath},
];

export function SeatingDesigner({guests, tables, venueElements, weddingId}: SeatingDesignerProps) {
    const [localTables, setLocalTables] = useState<Table[]>(tables);
    const [localGuests, setLocalGuests] = useState<GuestWithTable[]>(guests);
    const [activeGuest, setActiveGuest] = useState<Guest | null>(null);
    const [activeTable, setActiveTable] = useState<Table | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [guestSearchQuery, setGuestSearchQuery] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const innerContentRef = useRef<HTMLDivElement>(null);
    const [localVenueElements, setLocalVenueElements] = useState<VenueElement[]>(venueElements);
    const [showGuests, setShowGuests] = useState(true);
    const [venueModalOpen, setVenueModalOpen] = useState(false)

    useEffect(() => {
        if (!isFullscreen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsFullscreen(false);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFullscreen]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        const {active} = event;
        const {type, guest, table} = active.data.current || {};

        if (type === 'guest') {
            setActiveGuest(guest);
        } else if (type === 'table') {
            setActiveTable(table);
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const {active, over} = event;
        setActiveGuest(null);
        setActiveTable(null);

        const activeData = active.data.current;

        // Case 1: Dragging a table
        if (activeData?.type === 'table') {
            const table = activeData.table;

            const rawX = table.pos_x + event.delta.x;
            const rawY = table.pos_y + event.delta.y;
            const snappedX = Math.round(rawX / GRID_SIZE) * GRID_SIZE;
            const snappedY = Math.round(rawY / GRID_SIZE) * GRID_SIZE;
            const newPosX = Math.max(MIN_POS_X, snappedX);
            const newPosY = Math.max(MIN_POS_Y, snappedY);

            // Update local state IMMEDIATELY and OPTIMISTICALLY
            setLocalTables(prev => prev.map(t => t.id === table.id ? {...t, pos_x: newPosX, pos_y: newPosY} : t));

            try {
                await updateTablePosition(table.id, newPosX, newPosY);
            } catch (err) {
                console.error(err);
                // Revert on error
                setLocalTables(prev => prev.map(t => t.id === table.id ? {
                    ...t,
                    pos_x: table.pos_x,
                    pos_y: table.pos_y
                } : t));
            }
            return;
        }

        if (activeData?.type === 'venue_element') {
            const element = activeData.element;

            const rawX = element.pos_x + event.delta.x;
            const rawY = element.pos_y + event.delta.y;
            const snappedX = Math.round(rawX / GRID_SIZE) * GRID_SIZE;
            const snappedY = Math.round(rawY / GRID_SIZE) * GRID_SIZE;
            const newPosX = Math.max(MIN_POS_X, snappedX);
            const newPosY = Math.max(MIN_POS_Y, snappedY);

            setLocalVenueElements(prev => prev.map(el => el.id === element.id ? {
                ...el,
                pos_x: newPosX,
                pos_y: newPosY
            } : el));

            try {
                await updateVenueElementPosition(element.id, newPosX, newPosY);
            } catch (err) {
                console.error(err);
                setLocalVenueElements(prev => prev.map(el => el.id === element.id ? {
                    ...el,
                    pos_x: element.pos_x,
                    pos_y: element.pos_y
                } : el));
            }
            return;
        }

        if (!over) {
            const {type, guest} = active.data.current || {};
            if (type === 'guest') {
                try {
                    await assignGuestToTable(guest.id, null);
                    setLocalGuests(prev => prev.map(g => g.id === guest.id ? {
                        ...g,
                        table_id: null,
                        tables: null,
                        seat_id: null
                    } : g));
                } catch (err) {
                    console.error(err);
                }
            }
            return;
        }

        const overData = over.data.current;

        if (activeData?.type === 'guest' && overData?.type === 'seat') {
            const guest = activeData.guest;
            const seat = overData.seat;

            const seatTaken = localGuests.some((g) => g.seat_id === seat.id);
            if (seatTaken) {
                alert('Ky vend është zënë tashmë!');
                return;
            }

            try {
                await assignGuestToSeat(guest.id, seat.id, seat.table_id);
                setLocalGuests(prev => prev.map(g =>
                    g.id === guest.id ? {...g, table_id: seat.table_id, seat_id: seat.id} : g
                ));
            } catch (err) {
                alert('Dështoi caktimi i vendit');
            }
            return;
        }

        if (activeData?.type === 'guest' && overData?.type === 'table') {
            const guest = activeData.guest;
            const table: Table = overData.table;

            const guestsAtTable = localGuests.filter(g => g.table_id === table.id);

            if (guestsAtTable.length >= table.seats) {
                alert(`Tavolina ${table.number} është plot!`);
                return;
            }

            if (table.shape !== 'round') {
                const occupiedSeatIds = new Set(guestsAtTable.map(g => g.seat_id).filter(Boolean));
                const freeSeat = [...table.table_seats]
                    .sort((a, b) => a.seat_index - b.seat_index)
                    .find(s => !occupiedSeatIds.has(s.id));

                if (!freeSeat) {
                    alert(`Tavolina ${table.number} është plot!`);
                    return;
                }

                try {
                    await assignGuestToSeat(guest.id, freeSeat.id, table.id);
                    setLocalGuests(prev => prev.map(g =>
                        g.id === guest.id ? { ...g, table_id: table.id, tables: table, seat_id: freeSeat.id } : g
                    ));
                } catch (err) {
                    alert('Dështoi caktimi i të ftuarit në tavolinë');
                }
                return;
            }

            try {
                await assignGuestToTable(guest.id, table.id);
                setLocalGuests(prev => prev.map(g => g.id === guest.id ? {
                    ...g,
                    table_id: table.id,
                    tables: table
                } : g));
            } catch (err) {
                alert('Dështoi caktimi i të ftuarit në tavolinë');
            }
        }
    };

    const unassignedGuests = localGuests
        .filter(g => !g.table_id)
        .filter(g =>
            `${g.first_name} ${g.last_name}`.toLowerCase().includes(guestSearchQuery.toLowerCase())
        );

    const exportAsImage = useCallback(() => {
        if (innerContentRef.current === null) {
            return
        }

        const node = innerContentRef.current;

        toPng(node, {
            cacheBust: true,
            backgroundColor: '#ffffff',
            width: node.scrollWidth,
            height: node.scrollHeight + 40,
        })
            .then((dataUrl) => {
                const link = document.createElement('a')
                link.download = 'seating-plan.png'
                link.href = dataUrl
                link.click()
            })
            .catch((err) => {
                console.error('oops, something went wrong!', err)
            })
    }, [])

    const handleAddElement = async (data: {
        type: string
        label: string
        icon: VenueIconKey
        shape: VenueElementShape
        color: VenueColorKey
    }) => {
        try {
            const newElement = await createVenueElement({
                weddingId,
                ...data,
            })
            setLocalVenueElements(prev => [...prev, newElement])
        } catch (err) {
            alert('Dështoi shtimi i elementit')
        }
    }

    const handleDeleteElement = async (id: string) => {
        try {
            await deleteVenueElement(id);
            setLocalVenueElements(prev => prev.filter(e => e.id !== id));
        } catch (err) {
            alert('Dështoi fshirja e elementit');
        }
    };

    const seatPriorityCollisionDetection: CollisionDetection = (args) => {
        // 1. Provo pointerWithin fillimisht (i saktë kur pointer-i është ekzaktësisht brenda)
        const pointerCollisions = pointerWithin(args);
        const seatPointerHit = pointerCollisions.filter(c => String(c.id).startsWith('seat-'));
        if (seatPointerHit.length > 0) return seatPointerHit;

        // 2. Nëse pointer-i është afër një tavolinë, gjej seat-in më të afërt me pointer-in
        //    (edhe nëse s'është saktësisht brenda 48px-it)
        const tableHit = pointerCollisions.find(c => String(c.id).startsWith('table-drop-'));
        if (tableHit) {
            const seatContainers = args.droppableContainers.filter(c => String(c.id).startsWith('seat-'));
            if (seatContainers.length > 0) {
                const closest = closestCenter({
                    ...args,
                    droppableContainers: seatContainers,
                });
                if (closest.length > 0) return closest;
            }
            return [tableHit];
        }

        if (pointerCollisions.length > 0) return pointerCollisions;

        return closestCenter(args);
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={seatPriorityCollisionDetection}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToWindowEdges]}
        >
            <div className={cn(
                "flex flex-col gap-6 print:hidden",
                isFullscreen
                    ? "fixed inset-0 z-50 bg-background p-6"
                    : "h-full"
            )}>
                {/* Sidebar: Unassigned Guests */}
                <div
                    className="bg-card border border-border rounded-2xl p-4 flex flex-col sm:flex-row gap-4 justify-between items-start">
                    <div className="flex-1 w-full">
                        <h3 className="font-sans font-medium text-sm mb-4">Të ftuarit e pa caktuar
                            ({unassignedGuests.length})</h3>
                        <div className="relative w-full sm:w-64 mb-3">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
                            <input
                                type="text"
                                placeholder="Kërko sipas emrit..."
                                value={guestSearchQuery}
                                onChange={(e) => setGuestSearchQuery(e.target.value)}
                                className="input-wedding pl-10 py-2 w-full"
                            />
                        </div>
                        <div className="flex flex-wrap gap-2 mb-3">
                            <button
                                onClick={() => setVenueModalOpen(true)}
                                className="btn-ghost text-[10px] py-1.5 px-3 border border-dashed border-border rounded-lg flex items-center gap-1"
                            >
                                <Plus className="w-3 h-3"/>
                                Shto Element
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-3 max-h-32 overflow-y-auto p-1">
                            {unassignedGuests.map(guest => (
                                <DraggableGuest key={guest.id} guest={guest}/>
                            ))}
                            {unassignedGuests.length === 0 && (
                                <p className="text-xs text-muted-foreground italic">
                                    {guestSearchQuery ? 'Asnjë i ftuar nuk përputhet.' : 'Të gjithë të ftuarit janë caktuar.'}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <ToggleSwitch
                            checked={showGuests}
                            onChange={setShowGuests}
                            label="Shfaq të ftuarit"
                        />
                        <button
                            onClick={exportAsImage}
                            className="btn-ghost text-xs py-2 px-3 border border-border rounded-xl"
                            title="Shkarko si Foto"
                        >
                            <ImageIcon className="w-3.5 h-3.5"/>
                            <span className="hidden sm:inline">Shkarko si Foto</span>
                        </button>
                        <button
                            onClick={() => setIsFullscreen(prev => !prev)}
                            className="btn-ghost text-xs py-2 px-3 border border-border rounded-xl"
                            title={isFullscreen ? "Dil nga ekrani i plotë" : "Ekran i plotë"}
                        >
                            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5"/> : <Maximize2 className="w-3.5 h-3.5"/>}
                            <span className="hidden sm:inline">{isFullscreen ? "Dil" : "Ekran i plotë"}</span>
                        </button>
                    </div>
                </div>
                {/* Canvas Area */}
                {/* Canvas Area */}
                <div
                    ref={containerRef}
                    className="flex-1 bg-background border border-border rounded-2xl relative overflow-auto shadow-inner min-h-[600px] p-20"
                    style={{
                        backgroundImage: 'radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)',
                        backgroundSize: '30px 30px'
                    }}
                >
                    <div
                        ref={innerContentRef}
                        className="relative w-full h-full"
                        style={{minHeight: '870px', minWidth: '1000px'}}
                    >
                        {localTables.map(table => (
                            <DraggableTable
                                key={table.id}
                                table={table}
                                guests={localGuests.filter(g => g.table_id === table.id)}
                                seats={table.table_seats}
                                showGuests={showGuests}
                            />
                        ))}

                        {localVenueElements.map(element => (
                            <DraggableVenueElement key={element.id} element={element} onDelete={handleDeleteElement}/>
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
                {activeGuest &&
                    <GuestAvatar initials={activeGuest.initials} size="md" className="scale-110 shadow-xl"/>}
                {activeTable && (
                    <div
                        className={cn(
                            "border-2 border-[hsl(var(--gold))] bg-card flex flex-col items-center justify-center shadow-2xl opacity-80 scale-105",
                            activeTable.shape === 'round' ? 'rounded-full' : 'rounded-2xl'
                        )}
                        style={{width: activeTable.width, height: activeTable.height}}
                    >
                        <span
                            className="text-[10px] uppercase tracking-widest text-muted-foreground block">Tavolina</span>
                        <span className="text-2xl font-serif text-[hsl(var(--primary))]">{activeTable.number}</span>
                    </div>
                )}
            </DragOverlay>

            <VenueElementModal
                open={venueModalOpen}
                onClose={() => setVenueModalOpen(false)}
                onCreate={handleAddElement}
            />
        </DndContext>
    );
}
