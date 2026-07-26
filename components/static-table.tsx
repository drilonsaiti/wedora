'use client';

import {cn} from '@/lib/utils';
import {Table} from '@/types/seating';
import {motion} from 'framer-motion';

interface StaticTableProps {
    table: Table;
    isHighlighted: boolean;
}

export function StaticTable({table, isHighlighted}: StaticTableProps) {
    return (
        <motion.div
            className={cn(
                'absolute w-32 h-32 rounded-full border-2 bg-card/90 backdrop-blur-sm flex flex-col items-center justify-center shadow-sm',
                isHighlighted ? 'border-[hsl(var(--primary))] border-4 z-20 ring-4 ring-[hsl(var(--primary))/10]' : 'border-[hsl(var(--gold))]/40'
            )}
            style={{left: table.pos_x, top: table.pos_y}}
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
        </motion.div>
    );
}