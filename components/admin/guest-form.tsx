'use client'

import { useState } from 'react'

import { zodResolver } from '@hookform/resolvers/zod'
import {
    ChevronDown,
    Loader2,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'

import {
    addGuest,
    updateGuest,
} from '@/actions/seating'
import { getValidationMessage } from '@/lib/validation'
import {
    type GuestFormValues,
    guestSchema,
} from '@/schemas'
import type { Table } from '@/types/seating'

interface GuestFormProps {
    weddingId: string
    initialValues?: Partial<GuestFormValues> & {
        id?: string
    }
    tables: Table[]
    onSuccess: () => void
    onCancel: () => void
}

export function GuestForm({
    weddingId,
                              initialValues,
                              tables,
                              onSuccess,
                              onCancel,
                          }: GuestFormProps) {
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
        formState: {
            errors,
        },
    } =
        useForm<GuestFormValues>({
            resolver:
                zodResolver(
                    guestSchema
                ),

            defaultValues: {
                first_name:
                    initialValues?.first_name ??
                    '',

                last_name:
                    initialValues?.last_name ??
                    '',

                table_id:
                    initialValues?.table_id ??
                    null,
            },
        })

    const firstNameError =
        getValidationMessage(
            errors.first_name,
            {
                validation:
                tv,
            }
        )

    const lastNameError =
        getValidationMessage(
            errors.last_name,
            {
                validation:
                tv,
            }
        )

    const tableError =
        getValidationMessage(
            errors.table_id,
            {
                validation:
                tv,
            }
        )

    const onSubmit =
        async (
            data: GuestFormValues
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
                    await updateGuest(
                        initialValues.id,
                        data
                    )
                } else {
                    await addGuest(
                        weddingId,
                        data
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
                GUEST NAME
            ===================================== */}
            <div className="grid gap-4 sm:grid-cols-2">
                {/* First name */}
                <div>
                    <label
                        htmlFor="guest-first-name"
                        className="label-wedding"
                    >
                        {t(
                            'firstName'
                        )}
                    </label>

                    <input
                        {...register(
                            'first_name'
                        )}
                        id="guest-first-name"
                        type="text"
                        autoComplete="given-name"
                        placeholder={t(
                            'firstNamePlaceholder'
                        )}
                        className="input-wedding h-11"
                        disabled={
                            loading
                        }
                    />

                    {firstNameError && (
                        <p className="mt-1.5 text-xs leading-5 text-destructive">
                            {
                                firstNameError
                            }
                        </p>
                    )}
                </div>

                {/* Last name */}
                <div>
                    <label
                        htmlFor="guest-last-name"
                        className="label-wedding"
                    >
                        {t(
                            'lastName'
                        )}
                    </label>

                    <input
                        {...register(
                            'last_name'
                        )}
                        id="guest-last-name"
                        type="text"
                        autoComplete="family-name"
                        placeholder={t(
                            'lastNamePlaceholder'
                        )}
                        className="input-wedding h-11"
                        disabled={
                            loading
                        }
                    />

                    {lastNameError && (
                        <p className="mt-1.5 text-xs leading-5 text-destructive">
                            {
                                lastNameError
                            }
                        </p>
                    )}
                </div>
            </div>

            {/* =====================================
                TABLE ASSIGNMENT
            ===================================== */}
            <div>
                <label
                    htmlFor="guest-table"
                    className="label-wedding"
                >
                    {t(
                        'assignTableOptional'
                    )}
                </label>

                <div className="relative">
                    <select
                        {...register(
                            'table_id',
                            {
                                setValueAs: (
                                    value
                                ) =>
                                    value ===
                                    ''
                                        ? null
                                        : value,
                            }
                        )}
                        id="guest-table"
                        disabled={
                            loading
                        }
                        className="input-wedding h-11 appearance-none pr-10 text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <option value="">
                            {t(
                                'noTable'
                            )}
                        </option>

                        {tables.map(
                            (
                                table
                            ) => (
                                <option
                                    key={
                                        table.id
                                    }
                                    value={
                                        table.id
                                    }
                                >
                                    {t(
                                        'tableOption',
                                        {
                                            number:
                                            table.number,

                                            seats:
                                            table.seats,
                                        }
                                    )}
                                </option>
                            )
                        )}
                    </select>

                    <ChevronDown
                        aria-hidden
                        className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                        strokeWidth={
                            1.6
                        }
                    />
                </div>

                {tableError && (
                    <p className="mt-1.5 text-xs leading-5 text-destructive">
                        {
                            tableError
                        }
                    </p>
                )}
            </div>

            {/* =====================================
                SERVER ERROR
            ===================================== */}
            {error && (
                <div
                    role="alert"
                    className="rounded-2xl border border-destructive/15 bg-destructive/[0.06] px-4 py-3"
                >
                    <p className="text-xs leading-5 text-destructive">
                        {error}
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
                        loading
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
                            'updateGuest'
                        )
                    ) : (
                        t(
                            'addGuest'
                        )
                    )}
                </button>
            </div>
        </form>
    )
}