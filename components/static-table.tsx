'use client';

import {cn} from '@/lib/utils';
import {Table} from '@/types/seating';
import {motion} from 'framer-motion';

interface StaticTableProps {
    table: Table;
    isHighlighted: boolean;
    highlightedSeatId?: string | null;
}

const SHAPE_CLASSES = {
    round: 'rounded-full',
    square: 'rounded-2xl',
    rectangle: 'rounded-2xl',
};

export function StaticTable({table, isHighlighted, highlightedSeatId}: StaticTableProps) {
    return (
        <motion.div
            className={cn(
                'absolute border-2 bg-card/90 backdrop-blur-sm flex flex-col items-center justify-center shadow-sm',
                SHAPE_CLASSES[table.shape],
                isHighlighted ? 'border-[hsl(var(--primary))] border-4 z-20 ring-4 ring-[hsl(var(--primary))/10]' : 'border-[hsl(var(--gold))]/40'
            )}
            style={{left: table.pos_x, top: table.pos_y, width: table.width, height: table.height}}
            animate={isHighlighted ? {scale: [1, 1.08, 1]} : {}}
            transition={isHighlighted ? {duration: 1.2, repeat: Infinity, repeatDelay: 0.5} : {}}
        >
            <div className="text-center">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground block">Tavolina</span>
                <span className="text-2xl font-serif text-[hsl(var(--primary))]">{table.number}</span>
                {table.label && (
                    <span className="text-[10px] font-medium text-[hsl(var(--gold))] block truncate max-w-[100px] px-1">
            {table.label}
          </span>
                )}
            </div>

            {table.shape !== 'round' && table.table_seats?.map(seat => {
                const isSeatHighlighted = seat.id === highlightedSeatId;
                return (
                    <div
                        key={seat.id}
                        className="absolute top-0 left-0 z-10 w-12 h-12 flex items-center justify-center"
                        style={{
                            transform: `translate(${seat.relative_x}px, ${seat.relative_y}px) translate(-50%, -50%)`,
                        }}
                    >
                        <div
                            className={cn(
                                'w-8 h-8 rounded-full border-2 flex items-center justify-center text-[9px] font-medium transition-colors',
                                isSeatHighlighted
                                    ? 'bg-[hsl(var(--primary))] border-[hsl(var(--primary))] text-white scale-125 shadow-lg'
                                    : 'border-dashed border-border text-muted-foreground bg-card/90'
                            )}
                        >
                            {seat.seat_index + 1}
                        </div>
                    </div>
                );
            })}
        </motion.div>
    );
}