"use client";

import { memo } from "react";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { useTranslations } from "next-intl";

import { DraggableGuest } from "./draggable-guest";
import { cn } from "@/lib/utils";
import type { Guest, Table, TableSeat, TableWithSeats } from "@/types/seating";

interface DraggableTableProps {
    table: Table;
    guests: Array<
        Guest & {
        seat_id: string | null;
    }
    >;
    seats: TableSeat[];
    showGuests: boolean;
    /*
     * All tables plus per-table occupancy, and the assign/
     * unassign callbacks -- passed through to each seated
     * guest's AssignGuestMenu so a keyboard/screen-reader
     * admin can move or unseat them without a mouse.
     */
    allTables: TableWithSeats[];
    tableOccupancy: Map<string, number>;
    onAssignGuest: (guest: { id: string }, table: TableWithSeats) => void;
    onUnassignGuest: (guest: { id: string }) => void;
}

const SHAPE_CLASSES = {
    round: "rounded-full",
    square: "rounded-2xl",
    rectangle: "rounded-2xl",
} as const;

export const DraggableTable = memo(function DraggableTable({
                                                               table,
                                                               guests,
                                                               seats,
                                                               showGuests,
                                                               allTables,
                                                               tableOccupancy,
                                                               onAssignGuest,
                                                               onUnassignGuest,
                                                           }: DraggableTableProps) {
    const t = useTranslations("seating");

    const {
        attributes,
        listeners,
        setNodeRef: setDraggableRef,
        transform,
        isDragging,
    } = useDraggable({
        id: `table-${table.id}`,

        data: {
            type: "table",
            table,
        },
    });

    const { setNodeRef: setDroppableRef, isOver } = useDroppable({
        id: `table-drop-${table.id}`,

        data: {
            type: "table",
            table,
        },
    });

    const setRefs = (node: HTMLElement | null) => {
        setDraggableRef(node);

        setDroppableRef(node);
    };

    const isFull = guests.length >= table.seats;

    const shapeClass =
        SHAPE_CLASSES[table.shape as keyof typeof SHAPE_CLASSES] ??
        SHAPE_CLASSES.rectangle;

    const style = {
        position: "absolute" as const,

        left: table.pos_x,

        top: table.pos_y,

        width: table.width,

        height: table.height,

        transform: transform
            ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
            : undefined,

        touchAction: "none" as const,
    };

    const tableLabel = t("tableNumber", {
        number: table.number,
    });

    /*
     * Newer tables should have real seat
     * coordinates regardless of shape.
     *
     * Older round tables may not have
     * TableSeat records yet, so we keep
     * a legacy visual fallback for them.
     */
    const hasSeatPositions = seats.length > 0;

    return (
        <div
            ref={setRefs}
            style={style}
            aria-label={tableLabel}
            className={cn(
                "group absolute flex select-none flex-col items-center justify-center border bg-card/95 text-center shadow-sm backdrop-blur-sm",
                "transition-[border-color,background-color,box-shadow,opacity,transform] duration-200",
                shapeClass,

                /*
                 * Normal
                 */
                !isDragging &&
                !isOver &&
                "cursor-grab border-border/80 hover:border-foreground/15 hover:shadow-md active:cursor-grabbing",

                /*
                 * Dragging table
                 */
                isDragging &&
                "z-50 cursor-grabbing border-foreground/20 opacity-80 shadow-xl ring-2 ring-foreground/10",

                /*
                 * Valid table drop
                 */
                isOver &&
                !isFull &&
                "z-30 border-[hsl(var(--primary))] bg-[hsl(var(--accent))]/70 shadow-lg ring-4 ring-[hsl(var(--primary))]/10",

                /*
                 * Table full
                 */
                isOver &&
                isFull &&
                "z-30 border-destructive/50 bg-destructive/[0.06] shadow-lg ring-4 ring-destructive/10",
            )}
            {...listeners}
            {...attributes}
        >
            {/* =====================================
                    TABLE CONTENT
                ===================================== */}
            <div className="pointer-events-none relative z-10 max-w-full px-3">
        <span className="block text-[8px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {t("table")}
        </span>

                <span
                    className={cn(
                        "mt-0.5 block font-sans font-medium leading-none tabular-nums tracking-[-0.04em]",
                        isOver && !isFull
                            ? "text-[hsl(var(--primary))]"
                            : "text-foreground",

                        table.width < 80 || table.height < 80 ? "text-xl" : "text-2xl",
                    )}
                >
          {table.number}
        </span>

                {table.label && (
                    <span className="mt-1 block max-w-[110px] truncate px-1 text-[9px] font-medium text-muted-foreground">
            {table.label}
          </span>
                )}

                <span
                    className={cn(
                        "mt-1 block text-[9px] font-medium tabular-nums",
                        isFull ? "text-foreground" : "text-muted-foreground",
                    )}
                >
          {guests.length}
                    {" / "}
                    {table.seats}
        </span>
            </div>

            {/* =====================================
                    SEATS / GUESTS
                ===================================== */}
            {showGuests &&
                (hasSeatPositions
                    ? /*
             * Correct path:
             * use actual seat coordinates
             * for ALL table shapes.
             */
                    seats.map((seat) => {
                        const guest = guests.find((item) => item.seat_id === seat.id);

                        return (
                            <SeatSlot
                                key={seat.id}
                                seat={seat}
                                guest={guest}
                                currentTableId={table.id}
                                allTables={allTables}
                                tableOccupancy={tableOccupancy}
                                onAssignGuest={onAssignGuest}
                                onUnassignGuest={onUnassignGuest}
                            />
                        );
                    })
                    : table.shape === "round"
                        ? /*
               * Legacy fallback for old
               * round tables without
               * TableSeat records.
               */
                        guests.map((guest, index) => {
                            const divisor = Math.max(table.seats, 1);

                            const angle = (index / divisor) * 2 * Math.PI - Math.PI / 2;

                            const radius = Math.max(
                                38,
                                Math.min(table.width, table.height) / 2,
                            );

                            const x = Math.cos(angle) * radius;

                            const y = Math.sin(angle) * radius;

                            return (
                                <div
                                    key={guest.id}
                                    className="absolute left-1/2 top-1/2 z-20"
                                    style={{
                                        transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
                                    }}
                                >
                                    <DraggableGuest
                                        guest={guest}
                                        seatAssignment={{
                                            tables: allTables,
                                            tableOccupancy,
                                            currentTableId: table.id,
                                            onAssign: (target) => onAssignGuest(guest, target),
                                            onUnassign: () => onUnassignGuest(guest),
                                        }}
                                    />
                                </div>
                            );
                        })
                        : null)}
        </div>
    );
});

DraggableTable.displayName = "DraggableTable";

interface SeatSlotProps {
    seat: TableSeat;
    guest?: Guest & {
        seat_id: string | null;
    };
    currentTableId: string;
    allTables: TableWithSeats[];
    tableOccupancy: Map<string, number>;
    onAssignGuest: (guest: { id: string }, table: TableWithSeats) => void;
    onUnassignGuest: (guest: { id: string }) => void;
}

function SeatSlot({
                      seat,
                      guest,
                      currentTableId,
                      allTables,
                      tableOccupancy,
                      onAssignGuest,
                      onUnassignGuest,
                  }: SeatSlotProps) {
    const { setNodeRef, isOver } = useDroppable({
        id: `seat-${seat.id}`,

        data: {
            type: "seat",
            seat,
        },
    });

    return (
        <div
            ref={setNodeRef}
            className="absolute left-0 top-0 z-20 flex h-12 w-12 items-center justify-center"
            style={{
                transform: `translate(${seat.relative_x}px, ${seat.relative_y}px) translate(-50%, -50%)`,
            }}
        >
            {guest ? (
                <DraggableGuest
                    guest={guest}
                    seatAssignment={{
                        tables: allTables,
                        tableOccupancy,
                        currentTableId,
                        onAssign: (target) => onAssignGuest(guest, target),
                        onUnassign: () => onUnassignGuest(guest),
                    }}
                />
            ) : (
                <div
                    className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full border bg-card text-[9px] font-medium tabular-nums text-muted-foreground shadow-sm",
                        "transition-[border-color,background-color,color,box-shadow,transform] duration-150",

                        isOver
                            ? "scale-110 border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-white shadow-md ring-4 ring-[hsl(var(--primary))]/10"
                            : "border-border/90",
                    )}
                >
                    {seat.seat_index + 1}
                </div>
            )}
        </div>
    );
}
