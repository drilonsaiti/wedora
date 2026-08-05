'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateWedding } from '@/actions/wedding';
import { ColorPicker } from '@/components/ui/color-picker';
import { generateWeddingTheme } from '@/lib/theme';
import { Loader2, Check } from 'lucide-react';
import { z } from 'zod';
import {EditWeddingInput, editWeddingSchema} from "@/schemas";



export function EditWeddingForm({ wedding }: { wedding: any }) {
    const [saved, setSaved] = useState(false);
    const settings = wedding.wedding_settings?.[0] ?? wedding.wedding_settings ?? {};
    let hue = 355;
    try {
        const theme = JSON.parse(settings.theme_color ?? '{}');
        const match = theme['--primary']?.match(/^(\d+)/);
        if (match) hue = parseInt(match[1], 10);
    } catch {}

    const {
        register, handleSubmit, watch, setValue,
        formState: { errors, isSubmitting },
    } = useForm<EditWeddingInput>({
        resolver: zodResolver(editWeddingSchema),
        defaultValues: {
            groom_name: wedding.groom_name ?? '',
            bride_name: wedding.bride_name ?? '',
            groom_email: wedding.groom_email ?? '',
            bride_email: wedding.bride_email ?? '',
            wedding_date: wedding.wedding_date ?? '',
            theme_hue: hue,
            enable_find_seat: settings.enable_find_seat ?? true,
            enable_photo_upload: settings.enable_photo_upload ?? true,
        },
    });

    const themeHue = watch('theme_hue');
    const previewTheme = generateWeddingTheme(themeHue);

    const onSubmit = async (data: EditWeddingInput) => {
        setSaved(false);
        const result = await updateWedding(wedding.id, data);
        if (result.success) {
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <h1 className="font-serif text-2xl font-light text-[hsl(var(--dark))] mb-2">Cilësimet e Dasmës</h1>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="font-sans text-xs uppercase tracking-widest text-muted-foreground block mb-2">Emri i Dhëndrit</label>
                    <input {...register('groom_name')} className="input-wedding py-3 w-full" />
                </div>
                <div>
                    <label className="font-sans text-xs uppercase tracking-widest text-muted-foreground block mb-2">Emri i Nuses</label>
                    <input {...register('bride_name')} className="input-wedding py-3 w-full" />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="font-sans text-xs uppercase tracking-widest text-muted-foreground block mb-2">Email i Dhëndrit</label>
                    <input {...register('groom_email')} type="email" className="input-wedding py-3 w-full" />
                </div>
                <div>
                    <label className="font-sans text-xs uppercase tracking-widest text-muted-foreground block mb-2">Email i Nuses</label>
                    <input {...register('bride_email')} type="email" className="input-wedding py-3 w-full" />
                </div>
            </div>
            <p className="text-[10px] text-muted-foreground -mt-3 italic">
                Ndryshimi i email-it këtu s&apos;e ndryshon email-in e llogarisë ekzistuese — kontaktoni suportin për atë.
            </p>

            <div>
                <label className="font-sans text-xs uppercase tracking-widest text-muted-foreground block mb-2">Data e Dasmës</label>
                <input {...register('wedding_date')} type="date" className="input-wedding py-3 w-full" />
            </div>

            <div>
                <label className="font-sans text-xs uppercase tracking-widest text-muted-foreground block mb-3">Ngjyra e Temës</label>
                <ColorPicker value={themeHue} onChange={(hue) => setValue('theme_hue', hue)} />
            </div>

            <div
                className="rounded-2xl p-6 border border-border text-center"
                style={previewTheme as React.CSSProperties}
            >
                <button type="button" className="rounded-full px-6 py-2.5 text-xs font-sans font-medium tracking-widest uppercase text-white"
                        style={{ backgroundColor: `hsl(${previewTheme['--primary']})` }}>
                    Shiko vendin
                </button>
            </div>

            <div className="space-y-2">
                <label className="flex items-center justify-between p-3 rounded-xl border border-border cursor-pointer hover:bg-muted transition-colors">
                    <p className="font-sans text-sm font-medium">Gjej Vendin</p>
                    <input type="checkbox" {...register('enable_find_seat')} className="w-4 h-4 accent-[hsl(var(--primary))]" />
                </label>
                <label className="flex items-center justify-between p-3 rounded-xl border border-border cursor-pointer hover:bg-muted transition-colors">
                    <p className="font-sans text-sm font-medium">Ngarko Foto</p>
                    <input type="checkbox" {...register('enable_photo_upload')} className="w-4 h-4 accent-[hsl(var(--primary))]" />
                </label>
                {errors.enable_find_seat && <p className="text-xs text-destructive">{errors.enable_find_seat.message}</p>}
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-60">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : null}
                {isSubmitting ? 'Duke ruajtur...' : saved ? 'U ruajt!' : 'Ruaj Ndryshimet'}
            </button>
        </form>
    );
}