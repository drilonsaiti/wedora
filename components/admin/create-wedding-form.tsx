'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createWedding } from '@/actions/wedding';
import { Heart, Loader2 } from 'lucide-react';
import {CreateWeddingInput, createWeddingSchema} from "@/schemas";
import { ColorPicker } from '@/components/ui/color-picker';
import { generateWeddingTheme } from '@/lib/theme';

interface CreateWeddingFormProps {
    adminEmail: string;
}

export function CreateWeddingForm({ adminEmail }: CreateWeddingFormProps) {
    const [serverError, setServerError] = useState<string | null>(null);
    const [slugTouched, setSlugTouched] = useState(false);

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<CreateWeddingInput>({
        resolver: zodResolver(createWeddingSchema),
        defaultValues: { groom_name: '', bride_name: '', slug: '', theme_hue: 355 },
    });

    const themeHue = watch('theme_hue');
    const previewTheme = generateWeddingTheme(themeHue);

    const groomName = watch('groom_name');
    const brideName = watch('bride_name');

    // Auto-generate slug from names until the user manually edits it themselves
    const handleNameBlur = () => {
        if (slugTouched) return;
        if (groomName && brideName) {
            setValue('slug', slugify(`${brideName}-${groomName}`));
        }
    };

    const onSubmit = async (data: CreateWeddingInput) => {
        setServerError(null);
        const result = await createWedding(data);
        if (result && !result.success) {
            setServerError(result.error);
        }
        // on success, the server action redirects — nothing else to do here
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 w-full max-w-md">
            <div className="text-center mb-8">
                <div className="flex items-center justify-center gap-2 mb-4">
                    <div className="h-px w-8 bg-[hsl(var(--gold))] opacity-60" />
                    <Heart className="w-3 h-3 text-[hsl(var(--primary))] fill-current" />
                    <div className="h-px w-8 bg-[hsl(var(--gold))] opacity-60" />
                </div>
                <h1 className="font-serif text-3xl font-light text-[hsl(var(--dark))]">
                    Krijoni dasmën tuaj
                </h1>
                <p className="text-xs text-muted-foreground mt-2">{adminEmail}</p>
            </div>

            <div>
                <label className="font-sans text-xs uppercase tracking-widest text-muted-foreground block mb-2">
                    Emri i Dhëndrit
                </label>
                <input
                    {...register('groom_name', { onBlur: handleNameBlur })}
                    type="text"
                    placeholder="p.sh. Drilon"
                    className="input-wedding py-3 w-full"
                />
                {errors.groom_name && (
                    <p className="text-xs text-destructive mt-1">{errors.groom_name.message}</p>
                )}
            </div>

            <div>
                <label className="font-sans text-xs uppercase tracking-widest text-muted-foreground block mb-2">
                    Emri i Nuses
                </label>
                <input
                    {...register('bride_name', { onBlur: handleNameBlur })}
                    type="text"
                    placeholder="p.sh. Sara"
                    className="input-wedding py-3 w-full"
                />
                {errors.bride_name && (
                    <p className="text-xs text-destructive mt-1">{errors.bride_name.message}</p>
                )}
            </div>

            <div>
                <label className="font-sans text-xs uppercase tracking-widest text-muted-foreground block mb-2">
                    URL Publike
                </label>
                <div className="flex items-center gap-1 input-wedding py-3 px-4">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">app.com/w/</span>
                    <input
                        {...register('slug', {
                            onChange: () => setSlugTouched(true),
                        })}
                        type="text"
                        placeholder="sara-drilon"
                        className="bg-transparent outline-none flex-1 min-w-0 text-sm"
                    />
                </div>
                {errors.slug && (
                    <p className="text-xs text-destructive mt-1">{errors.slug.message}</p>
                )}
                <p className="text-[10px] text-muted-foreground mt-1 italic">
                    Kjo do të jetë adresa që të ftuarit do të përdorin
                </p>
            </div>

            <div>
                <label className="font-sans text-xs uppercase tracking-widest text-muted-foreground block mb-3">
                    Ngjyra e Temës
                </label>
                <ColorPicker value={themeHue} onChange={(hue) => setValue('theme_hue', hue)} />
            </div>

            <div
                className="rounded-2xl p-6 border border-border text-center"
                style={previewTheme as React.CSSProperties}
            >
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
                    Pamja paraprake
                </p>
                <button
                    type="button"
                    className="rounded-full px-6 py-2.5 text-xs font-sans font-medium tracking-widest uppercase text-white"
                    style={{ backgroundColor: `hsl(${previewTheme['--primary']})` }}
                >
                    Shiko vendin
                </button>
            </div>

            {serverError && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3">
                    <p className="text-xs text-destructive text-center">{serverError}</p>
                </div>
            )}



            <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-60"
            >
                {isSubmitting ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Duke krijuar...
                    </>
                ) : (
                    'Krijo Dasmën'
                )}
            </button>
        </form>
    );
}

function slugify(value: string) {
    return value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // strip accents
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}