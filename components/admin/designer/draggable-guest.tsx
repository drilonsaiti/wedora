"use client";

import { memo } from "react";

import { useDraggable } from "@dnd-kit/core";

import { GuestAvatar } from "@/components/guest-avatar";
import { cn } from "@/lib/utils";
import { AssignGuestMenu, type SeatAssignment } from "./assign-guest-menu";

interface DraggableGuestProps {
    guest: {
        id: string;
        initials: string;
        first_name: string;
        last_name: string;
    };
    /*
     * Optional keyboard/screen-reader accessible alternative
     * to dragging this guest onto a table. Omitted only where
     * there's genuinely nothing to assign (there currently
     * isn't such a case, but the prop stays optional so this
     * component doesn't hard-require it).
     */
    seatAssignment?: SeatAssignment;
}

export const DraggableGuest = memo(function DraggableGuest({
                                                               guest,
                                                               seatAssignment,
                                                           }: DraggableGuestProps) {
    const { attributes, listeners, setNodeRef, transform, isDragging } =
        useDraggable({
            id: `guest-${guest.id}`,
            data: {
                type: "guest",
                guest,
            },
        });

    const fullName = `${guest.first_name} ${guest.last_name}`.trim();

    const style = {
        transform: transform
            ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
            : undefined,

        /*
         * Important for reliable drag behaviour
         * on touch devices.
         */
        touchAction: "none" as const,
    };

    return (
        <div className="group relative inline-block select-none">
            <div
                ref={setNodeRef}
                style={style}
                {...listeners}
                {...attributes}
                aria-label={fullName}
                title={fullName}
                className={cn(
                    "relative select-none",
                    "cursor-grab active:cursor-grabbing",
                    "outline-none",
                    "transition-[transform,opacity] duration-150",
                    "focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:ring-offset-2 focus-visible:ring-offset-background",

                    isDragging && "z-50 scale-110 cursor-grabbing opacity-80",
                )}
            >
                <GuestAvatar
                    initials={guest.initials}
                    size="md"
                    className={cn(
                        "transition-[box-shadow,transform] duration-150",
                        !isDragging && "group-hover:shadow-md",
                        isDragging && "shadow-lg ring-4 ring-foreground/10",
                    )}
                />

                {/* =====================================
                    TOOLTIP
                ===================================== */}
                {!isDragging && (
                    <div
                        aria-hidden
                        className={cn(
                            "pointer-events-none absolute bottom-full left-1/2 z-[100]",
                            "mb-2 -translate-x-1/2 translate-y-1",
                            "whitespace-nowrap",
                            "rounded-lg border border-border/70 bg-foreground px-2.5 py-1.5",
                            "text-[9px] font-medium text-background shadow-lg",
                            "opacity-0 transition-[opacity,transform] duration-150",
                            "group-hover:translate-y-0 group-hover:opacity-100",
                            "group-focus-within:translate-y-0 group-focus-within:opacity-100",
                        )}
                    >
                        {fullName}

                        {/* Tooltip arrow */}
                        <span
                            aria-hidden
                            className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-foreground"
                        />
                    </div>
                )}
            </div>


            {seatAssignment && !isDragging && (
                <div className="absolute -right-1 -top-1 z-20">
                    <AssignGuestMenu guestName={fullName} assignment={seatAssignment} />
                </div>
            )}
        </div>
    );
});
