'use client'

import { MoreVertical } from 'lucide-react'
import { useTranslations } from 'next-intl'

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { TableWithSeats } from '@/types/seating'

export interface SeatAssignment {
    tables: TableWithSeats[]
    tableOccupancy: Map<string, number>
    currentTableId: string | null
    onAssign: (table: TableWithSeats) => void
    onUnassign?: () => void
}

interface AssignGuestMenuProps {
    guestName: string
    assignment: SeatAssignment
    className?: string
}

/*
 * The seating designer's canvas is drag-only, which meant a
 * keyboard-only or screen-reader admin had no way at all to
 * seat a guest -- dnd-kit's pointer sensor has no keyboard
 * equivalent wired up, and free-form pixel dragging wouldn't
 * be usable by keyboard even if it were. This menu is a
 * fully keyboard/screen-reader operable alternative that
 * calls the exact same assignment logic as a drag-and-drop
 * would, so both paths stay in sync.
 */
export function AssignGuestMenu({
                                    guestName,
                                    assignment,
                                    className,
                                }: AssignGuestMenuProps) {
    const t = useTranslations('seating')

    const {
        tables,
        tableOccupancy,
        currentTableId,
        onAssign,
        onUnassign,
    } = assignment

    const otherTables = tables.filter(
        (table) => table.id !== currentTableId
    )

    const currentTable = currentTableId
        ? tables.find((table) => table.id === currentTableId)
        : null

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    aria-label={t('designer.assignMenu.triggerLabel', {
                        name: guestName,
                    })}
                    onClick={(event) => event.stopPropagation()}
                    className={cn(
                        'flex h-5 w-5 items-center justify-center rounded-full border border-border/70 bg-card text-muted-foreground shadow-sm',
                        'opacity-0 transition-opacity duration-150',
                        'group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100',
                        'hover:bg-secondary hover:text-foreground',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25',
                        className
                    )}
                >
                    <MoreVertical className="h-3 w-3" />
                </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="start">
                {currentTable && (
                    <>
                        <div className="px-3 py-1.5 text-[11px] text-muted-foreground">
                            {t('designer.assignMenu.currentTable', {
                                number: currentTable.number,
                            })}
                        </div>

                        {onUnassign && (
                            <DropdownMenuItem
                                variant="destructive"
                                onSelect={() => onUnassign()}
                            >
                                {t('designer.assignMenu.unassign')}
                            </DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator />
                    </>
                )}

                {otherTables.map((table) => {
                    const occupied =
                        tableOccupancy.get(table.id) ?? 0
                    const isFull = occupied >= table.seats

                    return (
                        <DropdownMenuItem
                            key={table.id}
                            disabled={isFull}
                            onSelect={() => onAssign(table)}
                        >
                            {t('tableOption', {
                                number: table.number,
                                seats: table.seats,
                            })}
                            {isFull
                                ? ` · ${t('designer.assignMenu.full')}`
                                : ''}
                        </DropdownMenuItem>
                    )
                })}

                {otherTables.length === 0 && (
                    <div className="px-3 py-1.5 text-[11px] text-muted-foreground">
                        {t('designer.assignMenu.noOtherTables')}
                    </div>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}