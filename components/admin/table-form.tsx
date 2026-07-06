import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { tableSchema, type TableFormValues } from '@/schemas';
import { addTable, updateTable } from '@/actions/seating';

interface TableFormProps {
  initialValues?: Partial<TableFormValues> & { id?: string };
  onSuccess: () => void;
  onCancel: () => void;
}

export function TableForm({ initialValues, onSuccess, onCancel }: TableFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TableFormValues>({
    resolver: zodResolver(tableSchema),
    defaultValues: {
      number: initialValues?.number || undefined,
      seats: initialValues?.seats || 8,
      label: initialValues?.label || '',
    },
  });

  const onSubmit = async (data: TableFormValues) => {
    setLoading(true);
    setError(null);
    try {
      if (initialValues?.id) {
        await updateTable(initialValues.id, data);
      } else {
        await addTable(data);
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
        <button
          type="button"
          onClick={onCancel}
          className="btn-ghost flex-1"
          disabled={loading}
        >
          Anulo
        </button>
        <button
          type="submit"
          className="btn-primary flex-1"
          disabled={loading}
        >
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
