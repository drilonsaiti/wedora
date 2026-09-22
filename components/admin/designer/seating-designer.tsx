"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import {
    Image as ImageIcon,
    Maximize2,
    Minimize2,
    Plus,
    Search,
} from "lucide-react";
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
} from "@dnd-kit/core";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import {
    Guest,
    GuestWithTable,
    Table,
    TableWithSeats,
    VenueElement,
    VenueElementShape,
} from "@/types/seating";
import { DraggableTable } from "./draggable-table";
import { DraggableGuest } from "./draggable-guest";
import { GuestAvatar } from "@/components/guest-avatar";
import {
    assignGuestToSeat,
    assignGuestToTable,
    createVenueElement,
    deleteVenueElement,
    updateTablePosition,
    updateVenueElementPosition,
} from "@/actions/seating";
import { cn } from "@/lib/utils";
import { DraggableVenueElement } from "@/components/admin/designer/draggable-venue-element";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { VenueElementModal } from "@/components/ui/venue-element-modal";
import { VenueColorKey, VenueIconKey } from "@/lib/venue-icons";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

interface SeatingDesignerProps {
    guests: GuestWithTable[];
    tables: TableWithSeats[];
    venueElements: VenueElement[];
    weddingId: string;
}

const GRID_SIZE = 30;
const MIN_POS_Y = 60;
const MIN_POS_X = 60;

export function SeatingDesigner({
                                    guests,
                                    tables,
                                    venueElements,
                                    weddingId,
                                }: SeatingDesignerProps) {
    const [localTables, setLocalTables] = useState<TableWithSeats[]>(tables);
    const [localGuests, setLocalGuests] = useState<GuestWithTable[]>(guests);
    const [activeGuest, setActiveGuest] = useState<Guest | null>(null);
    const [activeTable, setActiveTable] = useState<Table | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [guestSearchQuery, setGuestSearchQuery] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);
    const innerContentRef = useRef<HTMLDivElement>(null);
    const [localVenueElements, setLocalVenueElements] =
        useState<VenueElement[]>(venueElements);
    const [showGuests, setShowGuests] = useState(true);
    const [venueModalOpen, setVenueModalOpen] = useState(false);

    const t = useTranslations("seating.designer");

    const canvasSize = useMemo(() => {
        const EDGE_SPACE = 260;
        const MIN_WIDTH = 1400;
        const MIN_HEIGHT = 1100;

        let width = MIN_WIDTH;
        let height = MIN_HEIGHT;

        for (const table of localTables) {
            width = Math.max(width, table.pos_x + table.width + EDGE_SPACE);

            height = Math.max(height, table.pos_y + table.height + EDGE_SPACE);
        }

        for (const element of localVenueElements) {
            width = Math.max(width, element.pos_x + element.width + EDGE_SPACE);

            height = Math.max(height, element.pos_y + element.height + EDGE_SPACE);
        }

        return {
            width,
            height,
        };
    }, [localTables, localVenueElements]);

    useEffect(() => {
        if (!isFullscreen) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setIsFullscreen(false);
            }
        };

        const previousBodyOverflow = document.body.style.overflow;
        const previousHtmlOverflow = document.documentElement.style.overflow;

        document.body.style.overflow = "hidden";
        document.documentElement.style.overflow = "hidden";

        window.addEventListener("keydown", handleKeyDown);

        const frame = requestAnimationFrame(() => {
            containerRef.current?.scrollTo({
                top: 0,
                left: 0,
                behavior: "auto",
            });
        });

        return () => {
            cancelAnimationFrame(frame);

            document.body.style.overflow = previousBodyOverflow;
            document.documentElement.style.overflow = previousHtmlOverflow;

            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [isFullscreen]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
    );

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const { type, guest, table } = active.data.current || {};

        if (type === "guest") {
            setActiveGuest(guest);
        } else if (type === "table") {
            setActiveTable(table);
        }
    };

    /*
     * How many guests currently sit at each table -- used both
     * to grey out "full" options in the keyboard-accessible
     * AssignGuestMenu and to decide whether a keyboard-driven
     * assignment should be allowed to proceed.
     */
    const tableOccupancy = useMemo(() => {
        const map = new Map<string, number>();

        for (const guest of localGuests) {
            if (guest.table_id) {
                map.set(guest.table_id, (map.get(guest.table_id) ?? 0) + 1);
            }
        }

        return map;
    }, [localGuests]);

    const findFreeSeatForTable = (
        table: TableWithSeats,
        guestsAtTable: GuestWithTable[],
    ) => {
        const occupiedSeatIds = new Set(
            guestsAtTable.map((item) => item.seat_id).filter(Boolean),
        );

        return [...table.table_seats]
            .sort((a, b) => a.seat_index - b.seat_index)
            .find((seat) => !occupiedSeatIds.has(seat.id));
    };

    /*
     * Shared by both the drag-and-drop path (handleDragEnd,
     * "guest dropped on a table") and the keyboard-accessible
     * AssignGuestMenu, so the two ways of seating a guest can
     * never drift out of sync with each other.
     */
    const assignGuestToTableAndSeat = useCallback(
        async (guest: { id: string }, table: TableWithSeats) => {
            const guestsAtTable = localGuests.filter(
                (item) => item.table_id === table.id && item.id !== guest.id,
            );

            if (guestsAtTable.length >= table.seats) {
                toast.warning(t("tableFull", { number: table.number }));
                return;
            }

            if (table.shape !== "round") {
                const freeSeat = findFreeSeatForTable(table, guestsAtTable);

                if (!freeSeat) {
                    toast.warning(t("tableFull", { number: table.number }));
                    return;
                }

                try {
                    await assignGuestToSeat(guest.id, freeSeat.id, table.id);

                    setLocalGuests((current) =>
                        current.map((item) =>
                            item.id === guest.id
                                ? {
                                    ...item,
                                    table_id: table.id,
                                    tables: table,
                                    seat_id: freeSeat.id,
                                }
                                : item,
                        ),
                    );
                } catch (error) {
                    console.error("Assign guest error:", error);
                    toast.error(t("assignGuestFailed"));
                }

                return;
            }

            try {
                await assignGuestToTable(guest.id, table.id);

                setLocalGuests((current) =>
                    current.map((item) =>
                        item.id === guest.id
                            ? {
                                ...item,
                                table_id: table.id,
                                tables: table,
                            }
                            : item,
                    ),
                );
            } catch (error) {
                console.error("Assign guest error:", error);
                toast.error(t("assignGuestFailed"));
            }
        },
        [localGuests, t],
    );

    const unassignGuestFromTable = useCallback(
        async (guest: { id: string }) => {
            try {
                await assignGuestToTable(guest.id, null);

                setLocalGuests((prev) =>
                    prev.map((g) =>
                        g.id === guest.id
                            ? {
                                ...g,
                                table_id: null,
                                tables: null,
                                seat_id: null,
                            }
                            : g,
                    ),
                );
            } catch (err) {
                console.error(err);
                toast.error(t("assignGuestFailed"));
            }
        },
        [t],
    );

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveGuest(null);
        setActiveTable(null);

        const activeData = active.data.current;

        // Case 1: Dragging a table
        if (activeData?.type === "table") {
            const table = activeData.table;

            const rawX = table.pos_x + event.delta.x;
            const rawY = table.pos_y + event.delta.y;
            const snappedX = Math.round(rawX / GRID_SIZE) * GRID_SIZE;
            const snappedY = Math.round(rawY / GRID_SIZE) * GRID_SIZE;
            const newPosX = Math.max(MIN_POS_X, snappedX);
            const newPosY = Math.max(MIN_POS_Y, snappedY);

            // Update local state IMMEDIATELY and OPTIMISTICALLY
            setLocalTables((prev) =>
                prev.map((t) =>
                    t.id === table.id ? { ...t, pos_x: newPosX, pos_y: newPosY } : t,
                ),
            );

            try {
                await updateTablePosition(table.id, newPosX, newPosY);
            } catch (err) {
                console.error(err);
                // Revert on error
                setLocalTables((prev) =>
                    prev.map((t) =>
                        t.id === table.id
                            ? {
                                ...t,
                                pos_x: table.pos_x,
                                pos_y: table.pos_y,
                            }
                            : t,
                    ),
                );
            }
            return;
        }

        if (activeData?.type === "venue_element") {
            const element = activeData.element;

            const rawX = element.pos_x + event.delta.x;
            const rawY = element.pos_y + event.delta.y;
            const snappedX = Math.round(rawX / GRID_SIZE) * GRID_SIZE;
            const snappedY = Math.round(rawY / GRID_SIZE) * GRID_SIZE;
            const newPosX = Math.max(MIN_POS_X, snappedX);
            const newPosY = Math.max(MIN_POS_Y, snappedY);

            setLocalVenueElements((prev) =>
                prev.map((el) =>
                    el.id === element.id
                        ? {
                            ...el,
                            pos_x: newPosX,
                            pos_y: newPosY,
                        }
                        : el,
                ),
            );

            try {
                await updateVenueElementPosition(element.id, newPosX, newPosY);
            } catch (err) {
                console.error(err);
                setLocalVenueElements((prev) =>
                    prev.map((el) =>
                        el.id === element.id
                            ? {
                                ...el,
                                pos_x: element.pos_x,
                                pos_y: element.pos_y,
                            }
                            : el,
                    ),
                );
            }
            return;
        }

        if (!over) {
            const { type, guest } = active.data.current || {};
            if (type === "guest") {
                await unassignGuestFromTable(guest);
            }
            return;
        }

        const overData = over.data.current;

        if (activeData?.type === "guest" && overData?.type === "seat") {
            const guest = activeData.guest;

            const seat = overData.seat;

            const seatTaken = localGuests.some((guest) => guest.seat_id === seat.id);

            if (seatTaken) {
                toast.warning(t("seatOccupied"));

                return;
            }

            try {
                await assignGuestToSeat(guest.id, seat.id, seat.table_id);

                setLocalGuests((current) =>
                    current.map((item) =>
                        item.id === guest.id
                            ? {
                                ...item,
                                table_id: seat.table_id,
                                seat_id: seat.id,
                            }
                            : item,
                    ),
                );
            } catch (error) {
                console.error("Assign seat error:", error);

                toast.error(t("assignSeatFailed"));
            }

            return;
        }

        if (activeData?.type === "guest" && overData?.type === "table") {
            const guest: GuestWithTable = activeData.guest;

            const table: TableWithSeats = overData.table;

            await assignGuestToTableAndSeat(guest, table);
        }
    };

    const unassignedGuests = localGuests
        .filter((g) => !g.table_id)
        .filter((g) =>
            `${g.first_name} ${g.last_name}`
                .toLowerCase()
                .includes(guestSearchQuery.toLowerCase()),
        );

    const exportAsImage = useCallback(() => {
        if (innerContentRef.current === null) {
            return;
        }

        const node = innerContentRef.current;

        toPng(node, {
            cacheBust: true,
            backgroundColor: "#ffffff",
            width: node.scrollWidth,
            height: node.scrollHeight + 40,
        })
            .then((dataUrl) => {
                const link = document.createElement("a");
                link.download = "seating-plan.png";
                link.href = dataUrl;
                link.click();
            })
            .catch((err) => {
                console.error("oops, something went wrong!", err);
            });
    }, []);

    const handleAddElement = async (data: {
        type: string;
        label: string;
        icon: VenueIconKey;
        shape: VenueElementShape;
        color: VenueColorKey;
    }) => {
        try {
            const newElement = await createVenueElement({
                weddingId,
                ...data,
            });

            setLocalVenueElements((current) => [...current, newElement]);

            toast.success(t("elementAdded"));
        } catch (error) {
            console.error("Create venue element error:", error);

            toast.error(t("addElementFailed"));

            throw error;
        }
    };

    const handleDeleteElement = async (id: string) => {
        try {
            await deleteVenueElement(id);

            setLocalVenueElements((current) =>
                current.filter((element) => element.id !== id),
            );

            toast.success(t("elementDeleted"));
        } catch (error) {
            console.error("Delete venue element error:", error);

            toast.error(t("deleteElementFailed"));

            throw error;
        }
    };
    const seatPriorityCollisionDetection: CollisionDetection = (args) => {
        // 1. Provo pointerWithin fillimisht (i saktë kur pointer-i është ekzaktësisht brenda)
        const pointerCollisions = pointerWithin(args);
        const seatPointerHit = pointerCollisions.filter((c) =>
            String(c.id).startsWith("seat-"),
        );
        if (seatPointerHit.length > 0) return seatPointerHit;

        // 2. Nëse pointer-i është afër një tavolinë, gjej seat-in më të afërt me pointer-in
        //    (edhe nëse s'është saktësisht brenda 48px-it)
        const tableHit = pointerCollisions.find((c) =>
            String(c.id).startsWith("table-drop-"),
        );
        if (tableHit) {
            const seatContainers = args.droppableContainers.filter((c) =>
                String(c.id).startsWith("seat-"),
            );
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
            <div
                className={cn(
                    "flex flex-col gap-6 print:hidden",
                    isFullscreen
                        ? "fixed inset-0 z-[999] h-[100dvh] min-h-0 overflow-hidden bg-background p-3 sm:p-6"
                        : "h-full min-h-0",
                )}
            >
                {/* Sidebar: Unassigned Guests */}
                <div className="flex shrink-0 flex-col items-start justify-between gap-4 rounded-2xl border border-border bg-card p-4 sm:flex-row">
                    <div className="w-full flex-1">
                        <h3 className="mb-4 font-sans text-sm font-medium">
                            {t("unassignedGuests", {
                                count: unassignedGuests.length,
                            })}
                        </h3>

                        <div className="relative mb-3 w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder={t("searchGuests")}
                                value={guestSearchQuery}
                                onChange={(e) => setGuestSearchQuery(e.target.value)}
                                className="input-wedding w-full py-2 pl-10"
                            />
                        </div>

                        <div className="mb-3 flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => setVenueModalOpen(true)}
                                className="btn-ghost flex items-center gap-1 rounded-lg border border-dashed border-border px-3 py-1.5 text-[10px]"
                            >
                                <Plus className="h-3 w-3" />
                                {t("addElement")}
                            </button>
                        </div>

                        <div className="flex max-h-32 flex-wrap gap-3 overflow-y-auto p-1">
                            {unassignedGuests.map((guest) => (
                                <DraggableGuest
                                    key={guest.id}
                                    guest={guest}
                                    seatAssignment={{
                                        tables: localTables,
                                        tableOccupancy,
                                        currentTableId: null,
                                        onAssign: (table) =>
                                            void assignGuestToTableAndSeat(guest, table),
                                    }}
                                />
                            ))}

                            {unassignedGuests.length === 0 && (
                                <p className="text-xs italic text-muted-foreground">
                                    {guestSearchQuery
                                        ? t("noGuestsFound")
                                        : t("allGuestsAssigned")}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                        <ToggleSwitch
                            checked={showGuests}
                            onChange={setShowGuests}
                            label={t("showGuests")}
                        />

                        <button
                            type="button"
                            onClick={exportAsImage}
                            className="btn-ghost flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs"
                            title={t("downloadImage")}
                        >
                            <ImageIcon className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">{t("downloadImage")}</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setIsFullscreen((prev) => !prev)}
                            className="btn-ghost flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs"
                            title={isFullscreen ? t("exitFullscreen") : t("fullscreen")}
                        >
                            {isFullscreen ? (
                                <Minimize2 className="h-3.5 w-3.5" />
                            ) : (
                                <Maximize2 className="h-3.5 w-3.5" />
                            )}

                            <span className="hidden sm:inline">
                {isFullscreen ? t("exit") : t("fullscreen")}
              </span>
                        </button>
                    </div>
                </div>

                {/* Canvas Area */}
                <div
                    ref={containerRef}
                    className={cn(
                        "relative min-h-0 overflow-auto overscroll-contain rounded-2xl border border-border bg-background shadow-inner",
                        isFullscreen ? "flex-1" : "h-[700px] min-h-[600px]",
                    )}
                    style={{
                        backgroundImage:
                            "radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)",
                        backgroundSize: "30px 30px",
                    }}
                >
                    <div className="p-20">
                        <div
                            ref={innerContentRef}
                            className="relative"
                            style={{
                                width: canvasSize.width,
                                height: canvasSize.height,
                                minWidth: "100%",
                            }}
                        >
                            {localTables.map((table) => (
                                <DraggableTable
                                    key={table.id}
                                    table={table}
                                    guests={localGuests.filter((g) => g.table_id === table.id)}
                                    seats={table.table_seats}
                                    showGuests={showGuests}
                                    allTables={localTables}
                                    tableOccupancy={tableOccupancy}
                                    onAssignGuest={assignGuestToTableAndSeat}
                                    onUnassignGuest={unassignGuestFromTable}
                                />
                            ))}

                            {localVenueElements.map((element) => (
                                <DraggableVenueElement
                                    key={element.id}
                                    element={element}
                                    onDelete={handleDeleteElement}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <DragOverlay
                dropAnimation={{
                    sideEffects: defaultDropAnimationSideEffects({
                        styles: {
                            active: {
                                opacity: "0.5",
                            },
                        },
                    }),
                }}
            >
                {activeGuest && (
                    <GuestAvatar
                        initials={activeGuest.initials}
                        size="md"
                        className="scale-110 shadow-xl"
                    />
                )}
                {activeTable && (
                    <div
                        className={cn(
                            "border-2 border-[hsl(var(--gold))] bg-card flex flex-col items-center justify-center shadow-2xl opacity-80 scale-105",
                            activeTable.shape === "round" ? "rounded-full" : "rounded-2xl",
                        )}
                        style={{ width: activeTable.width, height: activeTable.height }}
                    >
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground block">
              {t("table")}
            </span>
                        <span className="text-2xl font-serif text-[hsl(var(--primary))]">
              {activeTable.number}
            </span>
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
