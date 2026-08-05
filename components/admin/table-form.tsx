import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Circle, Square, RectangleHorizontal } from 'lucide-react';
import { type TableFormValues, tableSchema } from '@/schemas';
import { addTable, updateTable } from '@/actions/seating';
import { cn } from '@/lib/utils';

interface TableFormProps {
    initialValues?: Partial<TableFormValues> & { id?: string };
    weddingId: string;
    onSuccess: () => void;
    onCancel: () => void;
}

const SHAPE_OPTIONS: { value: TableFormValues['shape']; label: string; Icon: any }[] = [
    { value: 'round', label: 'Rrethore', Icon: Circle },
    { value: 'square', label: 'Katrore', Icon: Square },
    { value: 'rectangle', label: 'Drejtkëndore', Icon: RectangleHorizontal },
];

export function TableForm({ initialValues, weddingId, onSuccess, onCancel }: TableFormProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<TableFormValues>({
        resolver: zodResolver(tableSchema),
        defaultValues: {
            number: initialValues?.number || undefined,
            seats: initialValues?.seats || 8,
            label: initialValues?.label || '',
            shape: initialValues?.shape || 'round',
        },
    });

    const selectedShape = watch('shape');

    const onSubmit = async (data: TableFormValues) => {
        setLoading(true);
        setError(null);
        try {
            if (initialValues?.id) {
                await updateTable(initialValues.id, data);
            } else {
                await addTable({ ...data, weddingId });
            }
            onSuccess();
        } catch (err: any) {
            setError(err.message || 'Diçka shkoi keq');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-4">
                <div>
                    <label className="label-wedding">Forma e tavolinës</label>
                    <div className="grid grid-cols-3 gap-2 mt-1">
                        {SHAPE_OPTIONS.map(({ value, label, Icon }) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => setValue('shape', value, { shouldValidate: true })}
                                className={cn(
                                    'flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-colors text-xs font-sans',
                                    selectedShape === value
                                        ? 'border-[hsl(var(--primary))] bg-[hsl(var(--accent))] text-[hsl(var(--primary))]'
                                        : 'border-border text-muted-foreground hover:border-[hsl(var(--gold))]/50'
                                )}
                            >
                                <Icon className="w-5 h-5" />
                                {label}
                            </button>
                        ))}
                    </div>
                    {errors.shape && (
                        <p className="text-xs text-destructive mt-1">{errors.shape.message}</p>
                    )}
                </div>

                <div>
                    <label className="label-wedding">Numri i tavolinës</label>
                    <input
                        {...register('number', { valueAsNumber: true })}
                        type="number"
                        placeholder="p.sh. 1"
                        className="input-wedding"
                    />
                    {errors.number && (
                        <p className="text-xs text-destructive mt-1">{errors.number.message}</p>
                    )}
                </div>

                <div>
                    <label className="label-wedding">Vende</label>
                    <input
                        {...register('seats', { valueAsNumber: true })}
                        type="number"
                        placeholder="p.sh. 8"
                        className="input-wedding"
                    />
                    {errors.seats && (
                        <p className="text-xs text-destructive mt-1">{errors.seats.message}</p>
                    )}
                </div>

                <div>
                    <label className="label-wedding">Etiketa (opsionale)</label>
                    <input
                        {...register('label')}
                        type="text"
                        placeholder="p.sh. Familja Saiti"
                        className="input-wedding"
                    />
                    {errors.label && (
                        <p className="text-xs text-destructive mt-1">{errors.label.message}</p>
                    )}
                </div>
            </div>

            {error && (
                <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                    {error}
                </p>
            )}

            <div className="flex gap-3 pt-2">
                <button type="button" onClick={onCancel} className="btn-ghost flex-1" disabled={loading}>
                    Anulo
                </button>
                <button type="submit" className="btn-primary flex-1" disabled={loading}>
                    {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : initialValues?.id ? (
                        'Përditëso tavolinën'
                    ) : (
                        'Shto tavolinë'
                    )}
                </button>
            </div>
        </form>
    );
}