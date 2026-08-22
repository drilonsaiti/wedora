'use client'

import {useState} from 'react'
import {useForm} from 'react-hook-form'
import {zodResolver} from '@hookform/resolvers/zod'
import {Loader2} from 'lucide-react'
import {useTranslations} from 'next-intl'
import {type GuestFormValues, guestSchema} from '@/schemas'
import {addGuest, updateGuest} from '@/actions/seating'
import {Table} from '@/types/seating'
import {getValidationMessage} from '@/lib/validation'

interface GuestFormProps {
    initialValues?: Partial<GuestFormValues> & { id?: string }
    tables: Table[]
    onSuccess: () => void
    onCancel: () => void
}

export function GuestForm({
                              initialValues,
                              tables,
                              onSuccess,
                              onCancel,
                          }: GuestFormProps) {
    const t = useTranslations('dashboard.seating')
    const tv = useTranslations('validation')
    const tc = useTranslations('common')

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const {
        register,
        handleSubmit,
        formState: {errors},
    } = useForm<GuestFormValues>({
        resolver: zodResolver(guestSchema),
        defaultValues: {
            first_name: initialValues?.first_name || '',
            last_name: initialValues?.last_name || '',
            table_id: initialValues?.table_id || null,
        },
    })

    const firstNameError = getValidationMessage(
        errors.first_name,
        {
            validation: tv,
        }
    )

    const lastNameError = getValidationMessage(
        errors.last_name,
        {
            validation: tv,
        }
    )

    const tableError = getValidationMessage(
        errors.table_id,
        {
            validation: tv,
        }
    )

    const onSubmit = async (data: GuestFormValues) => {
        setLoading(true)
        setError(null)

        try {
            if (initialValues?.id) {
                await updateGuest(initialValues.id, data)
            } else {
                await addGuest(data)
            }

            onSuccess()
        } catch {
            setError(tc('error'))
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-4">
                {/* First name */}
                <div>
                    <label className="label-wedding">
                        {t('firstName')}
                    </label>

                    <input
                        {...register('first_name')}
                        placeholder={t('firstNamePlaceholder')}
                        className="input-wedding"
                    />

                    {firstNameError && (
                        <p className="text-xs text-destructive mt-1">
                            {firstNameError}
                        </p>
                    )}
                </div>

                {/* Last name */}
                <div>
                    <label className="label-wedding">
                        {t('lastName')}
                    </label>

                    <input
                        {...register('last_name')}
                        placeholder={t('lastNamePlaceholder')}
                        className="input-wedding"
                    />

                    {lastNameError && (
                        <p className="text-xs text-destructive mt-1">
                            {lastNameError}
                        </p>
                    )}
                </div>

                {/* Table */}
                <div>
                    <label className="label-wedding">
                        {t('assignTableOptional')}
                    </label>

                    <select
                        {...register('table_id', {
                            setValueAs: (value) =>
                                value === '' ? null : value,
                        })}
                        className="input-wedding appearance-none text-foreground"
                    >
                        <option value="">
                            {t('noTable')}
                        </option>

                        {tables.map((table) => (
                            <option
                                key={table.id}
                                value={table.id}
                            >
                                {t('tableOption', {
                                    number: table.number,
                                    seats: table.seats,
                                })}
                            </option>
                        ))}
                    </select>

                    {tableError && (
                        <p className="text-xs text-destructive mt-1">
                            {tableError}
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
                    disabled={loading}
                >
                    {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin"/>
                    ) : initialValues?.id ? (
                        t('updateGuest')
                    ) : (
                        t('addGuest')
                    )}
                </button>
            </div>
        </form>
    )
}