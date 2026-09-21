'use client'

import {
    useEffect,
    useState,
} from 'react'

import { zodResolver } from '@hookform/resolvers/zod'
import {
    Circle,
    Loader2,
    Minus,
    Plus,
    RectangleHorizontal,
    Square,
    type LucideIcon,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import {useForm, useWatch} from 'react-hook-form'

import {
    addTable,
    updateTable,
} from '@/actions/seating'
import { distributeSeatsEvenly } from '@/lib/seat-generator'
import { cn } from '@/lib/utils'
import { getValidationMessage } from '@/lib/validation'
import {
    type SeatSides,
    type TableFormValues,
    tableSchema,
} from '@/schemas'

interface TableFormProps {
    initialValues?: Partial<TableFormValues> & {
        id?: string
    }
    weddingId: string
    onSuccess: () => void
    onCancel: () => void
}

const DIMENSIONS = {
    round: {
        width: 128,
        height: 128,
    },
    square: {
        width: 140,
        height: 140,
    },
    rectangle: {
        width: 240,
        height: 100,
    },
} as const

interface SideStepperProps {
    label: string
    value: number
    onChange: (value: number) => void
}

function SideStepper({
                         label,
                         value,
                         onChange,
                     }: SideStepperProps) {
    return (
        <div className="flex flex-col items-center gap-1.5">
            <span className="text-[8px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
                {label}
            </span>

            <div className="flex h-8 items-center overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm">
                <button
                    type="button"
                    onClick={() =>
                        onChange(
                            Math.max(
                                0,
                                value - 1
                            )
                        )
                    }
                    disabled={
                        value <= 0
                    }
                    aria-label={`${label} −`}
                    className="flex h-full w-8 items-center justify-center text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                >
                    <Minus
                        className="h-3 w-3"
                        strokeWidth={1.8}
                    />
                </button>

                <span className="w-7 text-center text-xs font-medium tabular-nums text-foreground">
                    {value}
                </span>

                <button
                    type="button"
                    onClick={() =>
                        onChange(
                            value + 1
                        )
                    }
                    aria-label={`${label} +`}
                    className="flex h-full w-8 items-center justify-center text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                    <Plus
                        className="h-3 w-3"
                        strokeWidth={1.8}
                    />
                </button>
            </div>
        </div>
    )
}

export function TableForm({
                              initialValues,
                              weddingId,
                              onSuccess,
                              onCancel,
                          }: TableFormProps) {
    const t =
        useTranslations(
            'seating'
        )

    const tv =
        useTranslations(
            'validation'
        )

    const tc =
        useTranslations(
            'common'
        )

    const [
        loading,
        setLoading,
    ] =
        useState(false)

    const [
        error,
        setError,
    ] =
        useState<string | null>(
            null
        )

    const {
        register,
        handleSubmit,
        control,
        setValue,
        formState: {
            errors,
        },
    } =
        useForm<TableFormValues>({
            resolver:
                zodResolver(
                    tableSchema
                ),

            defaultValues: {
                number:
                    initialValues?.number ??
                    undefined,

                seats:
                    initialValues?.seats ??
                    8,

                label:
                    initialValues?.label ??
                    '',

                shape:
                    initialValues?.shape ??
                    'round',

                seatSides:
                    initialValues?.seatSides ??
                    distributeSeatsEvenly(
                        initialValues?.seats ??
                        8,
                        DIMENSIONS[
                        initialValues?.shape ??
                        'round'
                            ].width,
                        DIMENSIONS[
                        initialValues?.shape ??
                        'round'
                            ].height
                    ),
            },
        })

    const [
        selectedShape,
        seatsValue,
        watchedSides,
    ] = useWatch({
        control,
        name: [
            "shape",
            "seats",
            "seatSides",
        ],
    });

    const seatsCount = seatsValue || 0;

    const sides: SeatSides = watchedSides ?? {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
    };

    const shapeOptions: Array<{
        value: TableFormValues['shape']
        label: string
        Icon: LucideIcon
    }> = [
        {
            value: 'round',
            label: t(
                'shapeRound'
            ),
            Icon: Circle,
        },
        {
            value: 'square',
            label: t(
                'shapeSquare'
            ),
            Icon: Square,
        },
        {
            value: 'rectangle',
            label: t(
                'shapeRectangle'
            ),
            Icon: RectangleHorizontal,
        },
    ]

    /*
     * ============================================
     * KEEP SEAT DISTRIBUTION IN SYNC
     * ============================================
     *
     * For square / rectangular tables we
     * redistribute seats when:
     *
     * - seat count changes
     * - table shape changes
     *
     * Manual changes remain untouched until
     * one of those values changes.
     */
    useEffect(() => {
        if (
            selectedShape ===
            'round'
        ) {
            return
        }

        const dimensions =
            DIMENSIONS[
                selectedShape
                ]

        setValue(
            'seatSides',
            distributeSeatsEvenly(
                seatsCount,
                dimensions.width,
                dimensions.height
            ),
            {
                shouldValidate:
                    true,
            }
        )
    }, [
        seatsCount,
        selectedShape,
        setValue,
    ])

    const totalAssigned =
        (sides?.top ??
            0) +
        (sides?.right ??
            0) +
        (sides?.bottom ??
            0) +
        (sides?.left ??
            0)

    const isBalanced =
        totalAssigned ===
        seatsCount

    /*
     * A round table doesn't use individual
     * side distribution.
     */
    const distributionValid =
        selectedShape ===
        'round' ||
        isBalanced

    const updateSide = (
        side: keyof SeatSides,
        value: number
    ) => {
        setValue(
            'seatSides',
            {
                ...sides,
                [side]:
                value,
            },
            {
                shouldValidate:
                    true,
                shouldDirty:
                    true,
            }
        )
    }

    const numberError =
        getValidationMessage(
            errors.number,
            {
                validation:
                tv,
            }
        )

    const seatsError =
        getValidationMessage(
            errors.seats,
            {
                validation:
                tv,
            }
        )

    const seatSidesError =
        getValidationMessage(
            errors.seatSides,
            {
                validation:
                tv,
            }
        )

    const labelError =
        getValidationMessage(
            errors.label,
            {
                validation:
                tv,
            }
        )

    const onSubmit =
        async (
            data: TableFormValues
        ) => {
            setLoading(
                true
            )

            setError(
                null
            )

            try {
                if (
                    initialValues?.id
                ) {
                    await updateTable(
                        initialValues.id,
                        data
                    )
                } else {
                    await addTable(
                        {
                            ...data,
                            weddingId,
                        }
                    )
                }

                onSuccess()
            } catch {
                setError(
                    tc(
                        'error'
                    )
                )
            } finally {
                setLoading(
                    false
                )
            }
        }

    return (
        <form
            onSubmit={handleSubmit(
                onSubmit
            )}
            className="space-y-6"
        >
            {/* =====================================
                SHAPE
            ===================================== */}
            <div>
                <label className="label-wedding">
                    {t(
                        'tableShape'
                    )}
                </label>

                <div className="mt-2 grid grid-cols-3 gap-2">
                    {shapeOptions.map(
                        ({
                             value,
                             label,
                             Icon,
                         }) => {
                            const active =
                                selectedShape ===
                                value

                            return (
                                <button
                                    key={
                                        value
                                    }
                                    type="button"
                                    aria-pressed={
                                        active
                                    }
                                    onClick={() =>
                                        setValue(
                                            'shape',
                                            value,
                                            {
                                                shouldValidate:
                                                    true,
                                                shouldDirty:
                                                    true,
                                            }
                                        )
                                    }
                                    className={cn(
                                        'group flex min-h-[82px] flex-col items-center justify-center gap-2 rounded-2xl border px-2 py-3 transition-all',
                                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20',

                                        active
                                            ? 'border-foreground/15 bg-secondary/70 text-foreground shadow-sm'
                                            : 'border-border/70 bg-background text-muted-foreground hover:border-foreground/10 hover:bg-secondary/30 hover:text-foreground'
                                    )}
                                >
                                    <div
                                        className={cn(
                                            'flex h-8 w-8 items-center justify-center rounded-xl transition-colors',

                                            active
                                                ? 'bg-foreground text-background'
                                                : 'bg-secondary text-muted-foreground group-hover:text-foreground'
                                        )}
                                    >
                                        <Icon
                                            className="h-4 w-4"
                                            strokeWidth={
                                                1.6
                                            }
                                        />
                                    </div>

                                    <span className="text-[10px] font-medium">
                                        {
                                            label
                                        }
                                    </span>
                                </button>
                            )
                        }
                    )}
                </div>
            </div>

            {/* =====================================
                TABLE DETAILS
            ===================================== */}
            <div className="grid gap-4 sm:grid-cols-2">
                {/* Table number */}
                <div>
                    <label
                        htmlFor="table-number"
                        className="label-wedding"
                    >
                        {t(
                            'tableNumberLabel'
                        )}
                    </label>

                    <input
                        {...register(
                            'number',
                            {
                                valueAsNumber:
                                    true,
                            }
                        )}
                        id="table-number"
                        type="number"
                        min={1}
                        inputMode="numeric"
                        placeholder={t(
                            'tableNumberPlaceholder'
                        )}
                        className="input-wedding h-11"
                    />

                    {numberError && (
                        <p className="mt-1.5 text-xs text-destructive">
                            {
                                numberError
                            }
                        </p>
                    )}
                </div>

                {/* Seats */}
                <div>
                    <label
                        htmlFor="table-seats"
                        className="label-wedding"
                    >
                        {t(
                            'seats'
                        )}
                    </label>

                    <input
                        {...register(
                            'seats',
                            {
                                valueAsNumber:
                                    true,
                            }
                        )}
                        id="table-seats"
                        type="number"
                        min={1}
                        inputMode="numeric"
                        placeholder={t(
                            'seatsPlaceholder'
                        )}
                        className="input-wedding h-11"
                    />

                    {seatsError && (
                        <p className="mt-1.5 text-xs text-destructive">
                            {
                                seatsError
                            }
                        </p>
                    )}
                </div>
            </div>

            {/* =====================================
                SEAT DISTRIBUTION
            ===================================== */}
            {selectedShape !==
                'round' && (
                    <div className="rounded-[1.5rem] border border-border/70 bg-secondary/20 p-4 sm:p-5">
                        <div className="mb-5 flex items-start justify-between gap-4">
                            <div>
                                <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                                    {t(
                                        'seatDistribution'
                                    )}
                                </p>

                                <p
                                    className={cn(
                                        'mt-1 text-xs tabular-nums',

                                        isBalanced
                                            ? 'text-muted-foreground'
                                            : 'font-medium text-destructive'
                                    )}
                                >
                                    {t(
                                        'assignedSeats',
                                        {
                                            assigned:
                                            totalAssigned,

                                            total:
                                            seatsCount,
                                        }
                                    )}
                                </p>
                            </div>

                            <div
                                className={cn(
                                    'flex h-8 min-w-8 items-center justify-center rounded-full border px-2 text-[10px] font-medium tabular-nums',

                                    isBalanced
                                        ? 'border-border/70 bg-background text-foreground'
                                        : 'border-destructive/20 bg-destructive/[0.06] text-destructive'
                                )}
                            >
                                {totalAssigned}
                                /
                                {
                                    seatsCount
                                }
                            </div>
                        </div>

                        {/* Visual table layout */}
                        <div className="mx-auto grid max-w-[270px] grid-cols-[1fr_auto_1fr] grid-rows-[auto_1fr_auto] items-center justify-items-center gap-x-3 gap-y-4">
                            <div />

                            <SideStepper
                                label={t(
                                    'top'
                                )}
                                value={
                                    sides?.top ??
                                    0
                                }
                                onChange={(
                                    value
                                ) =>
                                    updateSide(
                                        'top',
                                        value
                                    )
                                }
                            />

                            <div />

                            <SideStepper
                                label={t(
                                    'left'
                                )}
                                value={
                                    sides?.left ??
                                    0
                                }
                                onChange={(
                                    value
                                ) =>
                                    updateSide(
                                        'left',
                                        value
                                    )
                                }
                            />

                            {/* Table preview */}
                            <div
                                className={cn(
                                    'flex items-center justify-center border border-border bg-card text-[8px] font-medium uppercase tracking-[0.14em] text-muted-foreground shadow-sm',

                                    selectedShape ===
                                    'square'
                                        ? 'h-16 w-16 rounded-2xl'
                                        : 'h-12 w-24 rounded-2xl'
                                )}
                            >
                                {t(
                                    'table'
                                )}
                            </div>

                            <SideStepper
                                label={t(
                                    'right'
                                )}
                                value={
                                    sides?.right ??
                                    0
                                }
                                onChange={(
                                    value
                                ) =>
                                    updateSide(
                                        'right',
                                        value
                                    )
                                }
                            />

                            <div />

                            <SideStepper
                                label={t(
                                    'bottom'
                                )}
                                value={
                                    sides?.bottom ??
                                    0
                                }
                                onChange={(
                                    value
                                ) =>
                                    updateSide(
                                        'bottom',
                                        value
                                    )
                                }
                            />

                            <div />
                        </div>

                        {seatSidesError && (
                            <p className="mt-4 text-center text-xs text-destructive">
                                {
                                    seatSidesError
                                }
                            </p>
                        )}
                    </div>
                )}

            {/* =====================================
                OPTIONAL LABEL
            ===================================== */}
            <div>
                <label
                    htmlFor="table-label"
                    className="label-wedding"
                >
                    {t(
                        'tableLabelOptional'
                    )}
                </label>

                <input
                    {...register(
                        'label'
                    )}
                    id="table-label"
                    type="text"
                    placeholder={t(
                        'tableLabelPlaceholder'
                    )}
                    className="input-wedding h-11"
                />

                {labelError && (
                    <p className="mt-1.5 text-xs text-destructive">
                        {
                            labelError
                        }
                    </p>
                )}
            </div>

            {/* =====================================
                ERROR
            ===================================== */}
            {error && (
                <div
                    role="alert"
                    className="rounded-2xl border border-destructive/15 bg-destructive/[0.06] px-4 py-3"
                >
                    <p className="text-xs leading-5 text-destructive">
                        {
                            error
                        }
                    </p>
                </div>
            )}

            {/* =====================================
                ACTIONS
            ===================================== */}
            <div className="flex gap-3 border-t border-border/60 pt-5">
                <button
                    type="button"
                    onClick={
                        onCancel
                    }
                    disabled={
                        loading
                    }
                    className="btn-secondary flex-1 justify-center disabled:pointer-events-none disabled:opacity-50"
                >
                    {tc(
                        'cancel'
                    )}
                </button>

                <button
                    type="submit"
                    disabled={
                        loading ||
                        !distributionValid
                    }
                    className="btn-primary flex-1 justify-center disabled:pointer-events-none disabled:opacity-50"
                >
                    {loading ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />

                            {tc(
                                'saving'
                            )}
                        </>
                    ) : initialValues?.id ? (
                        t(
                            'updateTable'
                        )
                    ) : (
                        t(
                            'addTable'
                        )
                    )}
                </button>
            </div>
        </form>
    )
}