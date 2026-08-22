'use client'

import {useEffect, useState} from 'react'
import {useForm} from 'react-hook-form'
import {zodResolver} from '@hookform/resolvers/zod'
import {
    Circle,
    Loader2,
    Minus,
    Plus as PlusIcon,
    RectangleHorizontal,
    Square,
} from 'lucide-react'
import {useTranslations} from 'next-intl'
import {
    type SeatSides,
    type TableFormValues,
    tableSchema,
} from '@/schemas'
import {addTable, updateTable} from '@/actions/seating'
import {cn} from '@/lib/utils'
import {distributeSeatsEvenly} from '@/lib/seat-generator'
import {getValidationMessage} from '@/lib/validation'

interface TableFormProps {
    initialValues?: Partial<TableFormValues> & { id?: string }
    weddingId: string
    onSuccess: () => void
    onCancel: () => void
}

const DIMENSIONS = {
    round: {width: 128, height: 128},
    square: {width: 140, height: 140},
    rectangle: {width: 240, height: 100},
}

function SideStepper({
                         label,
                         value,
                         onChange,
                     }: {
    label: string
    value: number
    onChange: (v: number) => void
}) {
    return (
        <div className="flex flex-col items-center gap-1">
            <span className="text-[9px] uppercase tracking-widest text-muted-foreground">
                {label}
            </span>

            <div className="flex items-center gap-1 bg-muted rounded-lg">
                <button
                    type="button"
                    onClick={() => onChange(Math.max(0, value - 1))}
                    className="w-6 h-6 flex items-center justify-center hover:bg-border rounded-l-lg transition-colors"
                >
                    <Minus className="w-3 h-3"/>
                </button>

                <span className="w-6 text-center text-sm font-medium">
                    {value}
                </span>

                <button
                    type="button"
                    onClick={() => onChange(value + 1)}
                    className="w-6 h-6 flex items-center justify-center hover:bg-border rounded-r-lg transition-colors"
                >
                    <PlusIcon className="w-3 h-3"/>
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
    const t = useTranslations('dashboard.seating')
    const tv = useTranslations('validation')
    const tc = useTranslations('common')

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: {errors},
    } = useForm<TableFormValues>({
        resolver: zodResolver(tableSchema),
        defaultValues: {
            number: initialValues?.number || undefined,
            seats: initialValues?.seats || 8,
            label: initialValues?.label || '',
            shape: initialValues?.shape || 'round',
            seatSides:
                initialValues?.seatSides ??
                distributeSeatsEvenly(
                    initialValues?.seats || 8,
                    DIMENSIONS[initialValues?.shape || 'round'].width,
                    DIMENSIONS[initialValues?.shape || 'round'].height
                ),
        },
    })

    const selectedShape = watch('shape')
    const seatsCount = watch('seats')
    const sides = watch('seatSides') as SeatSides

    const shapeOptions: {
        value: TableFormValues['shape']
        label: string
        Icon: typeof Circle
    }[] = [
        {
            value: 'round',
            label: t('shapeRound'),
            Icon: Circle,
        },
        {
            value: 'square',
            label: t('shapeSquare'),
            Icon: Square,
        },
        {
            value: 'rectangle',
            label: t('shapeRectangle'),
            Icon: RectangleHorizontal,
        },
    ]

    useEffect(() => {
        if (selectedShape === 'round') return

        const total =
            (sides?.top ?? 0) +
            (sides?.right ?? 0) +
            (sides?.bottom ?? 0) +
            (sides?.left ?? 0)

        if (total !== seatsCount) {
            const dims = DIMENSIONS[selectedShape]

            setValue(
                'seatSides',
                distributeSeatsEvenly(
                    seatsCount || 0,
                    dims.width,
                    dims.height
                )
            )
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [seatsCount, selectedShape])

    const totalAssigned =
        (sides?.top ?? 0) +
        (sides?.right ?? 0) +
        (sides?.bottom ?? 0) +
        (sides?.left ?? 0)

    const isBalanced = totalAssigned === seatsCount

    const updateSide = (
        side: keyof SeatSides,
        value: number
    ) => {
        setValue(
            'seatSides',
            {
                ...sides,
                [side]: value,
            },
            {
                shouldValidate: true,
            }
        )
    }

    const numberError = getValidationMessage(
        errors.number,
        {
            validation: tv,
        }
    )

    const seatsError = getValidationMessage(
        errors.seats,
        {
            validation: tv,
        }
    )

    const seatSidesError = getValidationMessage(
        errors.seatSides,
        {
            validation: tv,
        }
    )

    const labelError = getValidationMessage(
        errors.label,
        {
            validation: tv,
        }
    )

    const onSubmit = async (data: TableFormValues) => {
        setLoading(true)
        setError(null)

        try {
            if (initialValues?.id) {
                await updateTable(initialValues.id, data)
            } else {
                await addTable({
                    ...data,
                    weddingId,
                })
            }

            onSuccess()
        } catch {
            setError(tc('error'))
        } finally {
            setLoading(false)
        }
    }

    return (
        <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
        >
            <div className="space-y-4">
                {/* Shape */}
                <div>
                    <label className="label-wedding">
                        {t('tableShape')}
                    </label>

                    <div className="grid grid-cols-3 gap-2 mt-1">
                        {shapeOptions.map(
                            ({value, label, Icon}) => (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() =>
                                        setValue(
                                            'shape',
                                            value,
                                            {
                                                shouldValidate: true,
                                            }
                                        )
                                    }
                                    className={cn(
                                        'flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-colors text-xs font-sans',
                                        selectedShape === value
                                            ? 'border-[hsl(var(--primary))] bg-[hsl(var(--accent))] text-[hsl(var(--primary))]'
                                            : 'border-border text-muted-foreground hover:border-[hsl(var(--gold))]/50'
                                    )}
                                >
                                    <Icon className="w-5 h-5"/>
                                    {label}
                                </button>
                            )
                        )}
                    </div>
                </div>

                {/* Table number */}
                <div>
                    <label className="label-wedding">
                        {t('tableNumberLabel')}
                    </label>

                    <input
                        {...register('number', {
                            valueAsNumber: true,
                        })}
                        type="number"
                        placeholder={t('tableNumberPlaceholder')}
                        className="input-wedding"
                    />

                    {numberError && (
                        <p className="text-xs text-destructive mt-1">
                            {numberError}
                        </p>
                    )}
                </div>

                {/* Seats */}
                <div>
                    <label className="label-wedding">
                        {t('seats')}
                    </label>

                    <input
                        {...register('seats', {
                            valueAsNumber: true,
                        })}
                        type="number"
                        placeholder={t('seatsPlaceholder')}
                        className="input-wedding"
                    />

                    {seatsError && (
                        <p className="text-xs text-destructive mt-1">
                            {seatsError}
                        </p>
                    )}
                </div>

                {/* Seat distribution */}
                {selectedShape !== 'round' && (
                    <div>
                        <label className="label-wedding">
                            {t('seatDistribution')}
                        </label>

                        <div className="grid grid-cols-3 gap-y-3 items-center justify-items-center mt-2 max-w-[220px] mx-auto">
                            <div/>

                            <SideStepper
                                label={t('top')}
                                value={sides?.top ?? 0}
                                onChange={(v) =>
                                    updateSide('top', v)
                                }
                            />

                            <div/>

                            <SideStepper
                                label={t('left')}
                                value={sides?.left ?? 0}
                                onChange={(v) =>
                                    updateSide('left', v)
                                }
                            />

                            <div
                                className={cn(
                                    'w-12 h-12 border-2 border-dashed border-[hsl(var(--gold))]/50 flex items-center justify-center text-[9px] text-muted-foreground',
                                    selectedShape === 'square'
                                        ? 'rounded-xl'
                                        : 'rounded-lg'
                                )}
                            >
                                {t('table')}
                            </div>

                            <SideStepper
                                label={t('right')}
                                value={sides?.right ?? 0}
                                onChange={(v) =>
                                    updateSide('right', v)
                                }
                            />

                            <div/>

                            <SideStepper
                                label={t('bottom')}
                                value={sides?.bottom ?? 0}
                                onChange={(v) =>
                                    updateSide('bottom', v)
                                }
                            />

                            <div/>
                        </div>

                        <p
                            className={cn(
                                'text-center text-xs mt-3',
                                isBalanced
                                    ? 'text-muted-foreground'
                                    : 'text-destructive font-medium'
                            )}
                        >
                            {t('assignedSeats', {
                                assigned: totalAssigned,
                                total: seatsCount || 0,
                            })}
                        </p>

                        {seatSidesError && (
                            <p className="text-xs text-destructive mt-1 text-center">
                                {seatSidesError}
                            </p>
                        )}
                    </div>
                )}

                {/* Label */}
                <div>
                    <label className="label-wedding">
                        {t('tableLabelOptional')}
                    </label>

                    <input
                        {...register('label')}
                        type="text"
                        placeholder={t('tableLabelPlaceholder')}
                        className="input-wedding"
                    />

                    {labelError && (
                        <p className="text-xs text-destructive mt-1">
                            {labelError}
                        </p>
                    )}
                </div>
            </div>

            {error && (
                <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                    {error}
                </p>
            )}

            <div className="flex gap-3 pt-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className="btn-ghost flex-1"
                    disabled={loading}
                >
                    {tc('cancel')}
                </button>

                <button
                    type="submit"
                    className="btn-primary flex-1"
                    disabled={loading || !isBalanced}
                >
                    {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin"/>
                    ) : initialValues?.id ? (
                        t('updateTable')
                    ) : (
                        t('addTable')
                    )}
                </button>
            </div>
        </form>
    )
}