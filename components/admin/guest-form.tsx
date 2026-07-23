import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { guestSchema, type GuestFormValues } from '@/schemas';
import { addGuest, updateGuest } from '@/actions/seating';
import { Table } from '@/types/seating';

interface GuestFormProps {
  initialValues?: Partial<GuestFormValues> & { id?: string };
  tables: Table[];
  onSuccess: () => void;
  onCancel: () => void;
}

export function GuestForm({ initialValues, tables, onSuccess, onCancel }: GuestFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GuestFormValues>({
    resolver: zodResolver(guestSchema),
    defaultValues: {
      first_name: initialValues?.first_name || '',
      last_name: initialValues?.last_name || '',
      table_id: initialValues?.table_id || null,
    },
  });

  const onSubmit = async (data: GuestFormValues) => {
    setLoading(true);
    setError(null);
    try {
      if (initialValues?.id) {
        await updateGuest(initialValues.id, data);
      } else {
        await addGuest(data);
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
          <label className="label-wedding">Emri</label>
          <input
            {...register('first_name')}
            placeholder="p.sh. Filan"
            className="input-wedding"
          />
          {errors.first_name && (
            <p className="text-xs text-destructive mt-1">{errors.first_name.message}</p>
          )}
        </div>

        <div>
          <label className="label-wedding">Mbiemri</label>
          <input
            {...register('last_name')}
            placeholder="p.sh. Fisteku"
            className="input-wedding"
          />
          {errors.last_name && (
            <p className="text-xs text-destructive mt-1">{errors.last_name.message}</p>
          )}
        </div>

        <div>
          <label className="label-wedding">Cakto tavolinën (Opsionale)</label>
          <select
              {...register('table_id', {
                setValueAs: (value) => value === '' ? null : value,
              })}
              className="input-wedding appearance-none text-foreground"
          >
            <option value="">Pa Tavolinë</option>
            {tables.map((table) => (
                <option key={table.id} value={table.id}>
                  Tavolina {table.number} ({table.seats} vende)
                </option>
            ))}
          </select>
          {errors.table_id && (
            <p className="text-xs text-destructive mt-1">{errors.table_id.message}</p>
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
            'Përditëso të ftuarin'
          ) : (
            'Shto të ftuarin'
          )}
        </button>
      </div>
    </form>
  );
}
