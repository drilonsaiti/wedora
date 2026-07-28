'use client';

import {useEffect, useMemo, useRef, useState} from 'react';
import {Table, VenueElement} from '@/types/seating';
import {StaticTable} from '@/components/static-table';
import {StaticVenueElement} from '@/components/static-venue-element';
import {motion} from 'framer-motion';

interface VenueMapProps {
    tables: Table[];
    venueElements: VenueElement[];
    highlightedTableId: string | null;
    maxHeight?: number;
}

const TABLE_SIZE = 128;

export function VenueMap({tables, venueElements, highlightedTableId, maxHeight = 280}: VenueMapProps) {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);
    const [hasInteracted, setHasInteracted] = useState(false);
    const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const bounds = useMemo(() => {
        const allX = [
            ...tables.map(t => t.pos_x + TABLE_SIZE),
            ...venueElements.map(e => e.pos_x + e.width),
        ];
        const allY = [
            ...tables.map(t => t.pos_y + TABLE_SIZE),
            ...venueElements.map(e => e.pos_y + e.height),
        ];
        return {
            width: Math.max(1000, ...allX) + 100,
            height: Math.max(800, ...allY) + 100,
        };
    }, [tables, venueElements]);

    useEffect(() => {
        function updateScale() {
            if (!wrapperRef.current) return;
            const containerWidth = wrapperRef.current.clientWidth;
            // On mobile, we want it to be larger to be readable
            const minScale = containerWidth < 480 ? 0.7 : (containerWidth < 768 ? 0.6 : 0.5);
            const widthScale = containerWidth / bounds.width;
            const newScale = Math.max(widthScale, minScale);
            setScale(prev => Math.abs(prev - newScale) > 0.01 ? newScale : prev);
        }

        updateScale();
        window.addEventListener('resize', updateScale);
        return () => window.removeEventListener('resize', updateScale);
    }, [bounds.width]);

    const pathLine = useMemo(() => {
        const entrance = venueElements.find(e => e.type === 'entrance');
        const targetTable = tables.find(t => t.id === highlightedTableId);
        if (!entrance || !targetTable) return null;
        return {
            startX: entrance.pos_x + entrance.width / 2,
            startY: entrance.pos_y + entrance.height / 2,
            endX: targetTable.pos_x + TABLE_SIZE / 2,
            endY: targetTable.pos_y + TABLE_SIZE / 2,
        };
    }, [venueElements, tables, highlightedTableId]);

    const targetTable = useMemo(() => tables.find(t => t.id === highlightedTableId), [tables, highlightedTableId]);
    const entrance = useMemo(() => venueElements.find(e => e.type === 'entrance'), [venueElements]);

    // Scroll animation logic
    useEffect(() => {
        if (!wrapperRef.current || !scale || hasInteracted || !targetTable || !entrance) return;

        let currentStep = 0; // 0: Entrance, 1: Table

        const animate = () => {
            if (hasInteracted) return;

            const container = wrapperRef.current;
            if (!container) return;

            const target = currentStep === 0 ? entrance : targetTable;
            const targetSize = currentStep === 0 ? (entrance.width) : TABLE_SIZE;

            const x = target.pos_x * scale;
            const y = target.pos_y * scale;

            container.scrollTo({
                left: x - container.clientWidth / 2 + (targetSize * scale) / 2,
                top: y - container.clientHeight / 2 + (targetSize * scale) / 2,
                behavior: 'smooth'
            });

            currentStep = (currentStep + 1) % 2;
            animationTimeoutRef.current = setTimeout(animate, 4000);
        };

        animate();

        return () => {
            if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
        };
    }, [targetTable, entrance, scale, hasInteracted]);

    const handleInteraction = () => {
        if (!hasInteracted) {
            setHasInteracted(true);
            if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
        }
    };

    const scaledHeight = bounds.height * scale;
    const finalHeight = Math.min(scaledHeight, maxHeight);

    return (
        <div
            ref={wrapperRef}
            className="relative w-full bg-[#1a1a1a] backdrop-blur-sm border border-slate-200/40 rounded-2xl shadow-inner overflow-auto"
            onPointerDown={handleInteraction}
            onWheel={handleInteraction}
            onTouchStart={handleInteraction}
            style={{
                height: finalHeight > 0 ? finalHeight : maxHeight,
                backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
                backgroundSize: '30px 30px',
            }}
        >
            <div
                className="relative"
                style={{
                    width: bounds.width * scale,
                    height: bounds.height * scale,
                }}
            >
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: bounds.width,
                        height: bounds.height,
                        transform: `scale(${scale})`,
                        transformOrigin: 'top left',
                    }}
                >
                    {pathLine && (
                        <svg className="absolute inset-0 pointer-events-none" width={bounds.width}
                             height={bounds.height}>
                            <motion.line
                                x1={pathLine.startX}
                                y1={pathLine.startY}
                                x2={pathLine.endX}
                                y2={pathLine.endY}
                                stroke="hsl(var(--primary))"
                                strokeWidth={5}
                                strokeDasharray="14 8"
                                initial={{pathLength: 0, opacity: 0}}
                                animate={{pathLength: 1, opacity: 1}}
                                transition={{duration: 1, ease: 'easeInOut'}}
                            />
                        </svg>
                    )}

                    {venueElements.map(element => (
                        <StaticVenueElement key={element.id} element={element}/>
                    ))}

                    {tables.map(table => (
                        <StaticTable key={table.id} table={table} isHighlighted={table.id === highlightedTableId}/>
                    ))}
                </div>
            </div>
        </div>
    );
}