'use client'

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react'

import {
    motion,
    useReducedMotion,
} from 'framer-motion'

import { StaticTable } from '@/components/static-table'
import { StaticVenueElement } from '@/components/static-venue-element'
import type {
    Table,
    VenueElement,
} from '@/types/seating'

interface VenueMapProps {
    tables: Table[]
    venueElements: VenueElement[]
    highlightedTableId: string | null
    highlightedSeatId?: string | null
    maxHeight?: number
}

export function VenueMap({
                             tables,
                             venueElements,
                             highlightedTableId,
                             highlightedSeatId,
                             maxHeight = 280,
                         }: VenueMapProps) {
    const wrapperRef =
        useRef<HTMLDivElement>(
            null
        )

    const animationTimeoutRef =
        useRef<number | null>(null)

    const prefersReducedMotion =
        useReducedMotion()

    const [
        scale,
        setScale,
    ] =
        useState(0.5)

    const [
        hasInteracted,
        setHasInteracted,
    ] =
        useState(false)

    /*
     * Calculate total venue bounds.
     *
     * We retain a reasonable minimum canvas
     * so small layouts still feel spacious.
     */
    const bounds =
        useMemo(() => {
            const allX = [
                ...tables.map(
                    (table) =>
                        table.pos_x +
                        table.width
                ),
                ...venueElements.map(
                    (element) =>
                        element.pos_x +
                        element.width
                ),
            ]

            const allY = [
                ...tables.map(
                    (table) =>
                        table.pos_y +
                        table.height
                ),
                ...venueElements.map(
                    (element) =>
                        element.pos_y +
                        element.height
                ),
            ]

            return {
                width:
                    Math.max(
                        1000,
                        ...allX
                    ) + 100,

                height:
                    Math.max(
                        800,
                        ...allY
                    ) + 100,
            }
        }, [
            tables,
            venueElements,
        ])

    /*
     * Highlighted table.
     */
    const targetTable =
        useMemo(
            () =>
                tables.find(
                    (table) =>
                        table.id ===
                        highlightedTableId
                ) ?? null,
            [
                tables,
                highlightedTableId,
            ]
        )

    /*
     * Entrance element.
     */
    const entrance =
        useMemo(
            () =>
                venueElements.find(
                    (element) =>
                        element.type ===
                        'entrance'
                ) ?? null,
            [venueElements]
        )

    /*
     * Route from entrance to table.
     */
    const pathLine =
        useMemo(() => {
            if (
                !entrance ||
                !targetTable
            ) {
                return null
            }

            return {
                startX:
                    entrance.pos_x +
                    entrance.width /
                    2,

                startY:
                    entrance.pos_y +
                    entrance.height /
                    2,

                endX:
                    targetTable.pos_x +
                    targetTable.width /
                    2,

                endY:
                    targetTable.pos_y +
                    targetTable.height /
                    2,
            }
        }, [
            entrance,
            targetTable,
        ])

    /*
     * Responsive map scale.
     *
     * On phones we intentionally keep the map
     * slightly larger than the available width
     * so tables remain readable and guests can
     * naturally pan around.
     */
    const updateScale =
        useCallback(() => {
            const container =
                wrapperRef.current

            if (!container) {
                return
            }

            const containerWidth =
                container.clientWidth

            const widthScale =
                containerWidth /
                bounds.width

            let minimumScale =
                0.5

            if (
                containerWidth <
                480
            ) {
                minimumScale =
                    0.7
            } else if (
                containerWidth <
                768
            ) {
                minimumScale =
                    0.6
            }

            const nextScale =
                Math.min(
                    1,
                    Math.max(
                        widthScale,
                        minimumScale
                    )
                )

            setScale(
                (current) =>
                    Math.abs(
                        current -
                        nextScale
                    ) > 0.01
                        ? nextScale
                        : current
            )
        }, [bounds.width])

    /*
     * Resize observer is more reliable than
     * listening only to window.resize because
     * the parent container itself may change.
     */
    useEffect(() => {
        updateScale()

        const container =
            wrapperRef.current

        if (!container) {
            return
        }

        if (
            typeof ResizeObserver ===
            'undefined'
        ) {
            window.addEventListener(
                'resize',
                updateScale
            )

            return () => {
                window.removeEventListener(
                    'resize',
                    updateScale
                )
            }
        }

        const observer =
            new ResizeObserver(
                updateScale
            )

        observer.observe(
            container
        )

        return () => {
            observer.disconnect()
        }
    }, [updateScale])

    /*
     * Scroll a venue object into
     * the visual centre of the viewport.
     */
    const scrollToPosition =
        useCallback(
            (
                target: {
                    pos_x: number
                    pos_y: number
                    width: number
                    height: number
                },
                smooth = true
            ) => {
                const container =
                    wrapperRef.current

                if (!container) {
                    return
                }

                const targetCenterX =
                    (target.pos_x +
                        target.width /
                        2) *
                    scale

                const targetCenterY =
                    (target.pos_y +
                        target.height /
                        2) *
                    scale

                const maxLeft =
                    Math.max(
                        0,
                        container.scrollWidth -
                        container.clientWidth
                    )

                const maxTop =
                    Math.max(
                        0,
                        container.scrollHeight -
                        container.clientHeight
                    )

                const left =
                    Math.min(
                        maxLeft,
                        Math.max(
                            0,
                            targetCenterX -
                            container.clientWidth /
                            2
                        )
                    )

                const top =
                    Math.min(
                        maxTop,
                        Math.max(
                            0,
                            targetCenterY -
                            container.clientHeight /
                            2
                        )
                    )

                container.scrollTo({
                    left,
                    top,
                    behavior:
                        smooth &&
                        !prefersReducedMotion
                            ? 'smooth'
                            : 'auto',
                })
            },
            [
                scale,
                prefersReducedMotion,
            ]
        )

    /*
     * Automatic guest guidance:
     *
     * 1. Show entrance.
     * 2. Move to assigned table.
     * 3. Stop.
     *
     * Do not continuously loop between both.
     */
    useEffect(() => {
        if (
            !scale ||
            hasInteracted ||
            !targetTable
        ) {
            return
        }

        if (
            animationTimeoutRef.current
        ) {
            window.clearTimeout(
                animationTimeoutRef.current
            )
        }

        /*
         * When an entrance exists, begin there.
         * Otherwise just show the assigned table.
         */
        if (entrance) {
            scrollToPosition(
                entrance,
                false
            )

            animationTimeoutRef.current =
                window.setTimeout(
                    () => {
                        if (
                            hasInteracted
                        ) {
                            return
                        }

                        scrollToPosition(
                            targetTable,
                            true
                        )
                    },
                    prefersReducedMotion
                        ? 100
                        : 1600
                )
        } else {
            scrollToPosition(
                targetTable,
                false
            )
        }

        return () => {
            if (
                animationTimeoutRef.current
            ) {
                window.clearTimeout(
                    animationTimeoutRef.current
                )
            }
        }
    }, [
        entrance,
        targetTable,
        scale,
        hasInteracted,
        scrollToPosition,
        prefersReducedMotion,
    ])

    /*
     * The moment the guest starts using the
     * map themselves, automatic movement stops.
     */
    const handleInteraction =
        useCallback(() => {
            if (
                hasInteracted
            ) {
                return
            }

            setHasInteracted(
                true
            )

            if (
                animationTimeoutRef.current
            ) {
                window.clearTimeout(
                    animationTimeoutRef.current
                )

                animationTimeoutRef.current =
                    null
            }
        }, [hasInteracted])

    const scaledHeight =
        bounds.height *
        scale

    const finalHeight =
        Math.min(
            scaledHeight,
            maxHeight
        )

    return (
        <div
            ref={
                wrapperRef
            }
            className="relative w-full overscroll-contain overflow-auto rounded-[1.5rem] border border-border/70 bg-card shadow-inner"
            onPointerDown={
                handleInteraction
            }
            onWheel={
                handleInteraction
            }
            onTouchStart={
                handleInteraction
            }
            style={{
                height:
                    finalHeight >
                    0
                        ? finalHeight
                        : maxHeight,

                backgroundImage:
                    'radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)',

                backgroundSize:
                    '28px 28px',
            }}
        >
            {/*
             * Soft inner fade makes the venue
             * feel contained without hiding
             * or interfering with the map.
             */}
            <div
                aria-hidden
                className="pointer-events-none sticky left-0 top-0 z-20 h-0 w-full"
            >
                <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-card/70 to-transparent" />
            </div>

            {/* Scaled canvas */}
            <div
                className="relative"
                style={{
                    width:
                        bounds.width *
                        scale,

                    height:
                        bounds.height *
                        scale,
                }}
            >
                <div
                    className="absolute left-0 top-0"
                    style={{
                        width:
                        bounds.width,

                        height:
                        bounds.height,

                        transform: `scale(${scale})`,

                        transformOrigin:
                            'top left',
                    }}
                >
                    {/* =================================
                        ROUTE
                    ================================= */}
                    {pathLine && (
                        <svg
                            aria-hidden
                            className="pointer-events-none absolute inset-0 z-0 overflow-visible"
                            width={
                                bounds.width
                            }
                            height={
                                bounds.height
                            }
                        >
                            {/*
                             * Soft route underlay
                             */}
                            <line
                                x1={
                                    pathLine.startX
                                }
                                y1={
                                    pathLine.startY
                                }
                                x2={
                                    pathLine.endX
                                }
                                y2={
                                    pathLine.endY
                                }
                                stroke="hsl(var(--primary))"
                                strokeWidth={
                                    9
                                }
                                strokeOpacity={
                                    0.08
                                }
                                strokeLinecap="round"
                            />

                            {/*
                             * Animated route
                             */}
                            <motion.line
                                x1={
                                    pathLine.startX
                                }
                                y1={
                                    pathLine.startY
                                }
                                x2={
                                    pathLine.endX
                                }
                                y2={
                                    pathLine.endY
                                }
                                stroke="hsl(var(--primary))"
                                strokeWidth={
                                    4
                                }
                                strokeDasharray="12 10"
                                strokeLinecap="round"
                                initial={
                                    prefersReducedMotion
                                        ? {
                                            opacity: 1,
                                        }
                                        : {
                                            pathLength: 0,
                                            opacity: 0,
                                        }
                                }
                                animate={{
                                    pathLength:
                                        1,
                                    opacity:
                                        0.8,
                                }}
                                transition={{
                                    duration:
                                        prefersReducedMotion
                                            ? 0
                                            : 1.2,

                                    ease:
                                        'easeInOut',
                                }}
                            />

                            {/*
                             * Entrance marker
                             */}
                            <motion.circle
                                cx={
                                    pathLine.startX
                                }
                                cy={
                                    pathLine.startY
                                }
                                r={8}
                                fill="hsl(var(--primary))"
                                initial={{
                                    opacity:
                                        0,
                                    scale:
                                        0.5,
                                }}
                                animate={{
                                    opacity:
                                        0.7,
                                    scale:
                                        1,
                                }}
                                transition={{
                                    duration:
                                        prefersReducedMotion
                                            ? 0
                                            : 0.4,
                                }}
                            />

                            {/*
                             * Target marker
                             */}
                            <motion.circle
                                cx={
                                    pathLine.endX
                                }
                                cy={
                                    pathLine.endY
                                }
                                r={10}
                                fill="none"
                                stroke="hsl(var(--primary))"
                                strokeWidth={
                                    3
                                }
                                initial={{
                                    opacity:
                                        0,
                                    scale:
                                        0.5,
                                }}
                                animate={{
                                    opacity:
                                        1,
                                    scale:
                                        1,
                                }}
                                transition={{
                                    delay:
                                        prefersReducedMotion
                                            ? 0
                                            : 0.8,

                                    duration:
                                        prefersReducedMotion
                                            ? 0
                                            : 0.4,
                                }}
                            />
                        </svg>
                    )}

                    {/* =================================
                        VENUE ELEMENTS
                    ================================= */}
                    <div className="relative z-10">
                        {venueElements.map(
                            (
                                element
                            ) => (
                                <StaticVenueElement
                                    key={
                                        element.id
                                    }
                                    element={
                                        element
                                    }
                                />
                            )
                        )}

                        {/* =================================
                            TABLES
                        ================================= */}
                        {tables.map(
                            (
                                table
                            ) => (
                                <StaticTable
                                    key={
                                        table.id
                                    }
                                    table={
                                        table
                                    }
                                    isHighlighted={
                                        table.id ===
                                        highlightedTableId
                                    }
                                    highlightedSeatId={
                                        table.id ===
                                        highlightedTableId
                                            ? highlightedSeatId ??
                                            null
                                            : null
                                    }
                                />
                            )
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}