'use client'

import { Check } from 'lucide-react'
import { useTranslations } from 'next-intl'

import {
    WEDDING_COLOR_PRESETS,
    type WeddingColorPresetId,
} from '@/lib/theme'
import { cn } from '@/lib/utils'

interface ColorPickerProps {
    value: number
    onChange: (hue: number) => void
}

const PRESET_TRANSLATION_KEYS: Record<
    WeddingColorPresetId,
    | 'colorPresets.rose'
    | 'colorPresets.ocean'
    | 'colorPresets.sage'
    | 'colorPresets.violet'
    | 'colorPresets.terracotta'
    | 'colorPresets.burgundy'
> = {
    rose: 'colorPresets.rose',
    ocean: 'colorPresets.ocean',
    sage: 'colorPresets.sage',
    violet: 'colorPresets.violet',
    terracotta: 'colorPresets.terracotta',
    burgundy: 'colorPresets.burgundy',
}

export function ColorPicker({
                                value,
                                onChange,
                            }: ColorPickerProps) {
    const t =
        useTranslations(
            'weddings.settingsPage'
        )

    return (
        <div className="space-y-6">
            {/* =====================================
                PRESETS
            ===================================== */}
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6">
                {WEDDING_COLOR_PRESETS.map(
                    (
                        preset
                    ) => {
                        const active =
                            value ===
                            preset.hue

                        const label =
                            t(
                                PRESET_TRANSLATION_KEYS[
                                    preset.id
                                    ]
                            )

                        return (
                            <button
                                key={
                                    preset.id
                                }
                                type="button"
                                onClick={() =>
                                    onChange(
                                        preset.hue
                                    )
                                }
                                aria-label={
                                    label
                                }
                                aria-pressed={
                                    active
                                }
                                title={
                                    label
                                }
                                className={cn(
                                    'group flex min-w-0 flex-col items-center gap-2 rounded-2xl border px-2 py-3 transition-all',
                                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25',

                                    active
                                        ? 'border-foreground/20 bg-secondary/60 shadow-sm'
                                        : 'border-transparent hover:border-border/70 hover:bg-secondary/30'
                                )}
                            >
                                <span
                                    className={cn(
                                        'relative flex h-10 w-10 items-center justify-center rounded-full border shadow-sm transition-transform duration-200',
                                        'group-hover:scale-105',

                                        active
                                            ? 'scale-105 border-foreground/20 ring-4 ring-foreground/[0.06]'
                                            : 'border-black/[0.06] dark:border-white/[0.08]'
                                    )}
                                    style={{
                                        backgroundColor: `hsl(${preset.hue} 36% 46%)`,
                                    }}
                                >
                                    {active && (
                                        <Check
                                            className="h-4 w-4 text-white drop-shadow-sm"
                                            strokeWidth={
                                                2.2
                                            }
                                        />
                                    )}
                                </span>

                                <span
                                    className={cn(
                                        'w-full truncate text-center text-[9px] font-medium leading-4',
                                        active
                                            ? 'text-foreground'
                                            : 'text-muted-foreground'
                                    )}
                                >
                                    {
                                        label
                                    }
                                </span>
                            </button>
                        )
                    }
                )}
            </div>

            {/* =====================================
                CUSTOM COLOR
            ===================================== */}
            <div className="border-t border-border/60 pt-5">
                <div className="mb-4 flex items-center justify-between gap-4">
                    <label
                        htmlFor="wedding-theme-hue"
                        className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
                    >
                        {t(
                            'customColor'
                        )}
                    </label>

                    <div className="flex items-center gap-2">
                        <span
                            aria-hidden
                            className="h-4 w-4 rounded-full border border-black/[0.06] shadow-sm dark:border-white/[0.08]"
                            style={{
                                backgroundColor: `hsl(${value} 36% 46%)`,
                            }}
                        />

                        <span className="text-[10px] tabular-nums text-muted-foreground">
                            {value}°
                        </span>
                    </div>
                </div>

                <input
                    id="wedding-theme-hue"
                    type="range"
                    min={0}
                    max={360}
                    step={1}
                    value={
                        value
                    }
                    onChange={(
                        event
                    ) =>
                        onChange(
                            Number(
                                event
                                    .target
                                    .value
                            )
                        )
                    }
                    aria-label={t(
                        'customColor'
                    )}
                    aria-valuetext={`${value}°`}
                    className="
                        h-3 w-full cursor-pointer appearance-none rounded-full
                        outline-none
                        focus-visible:ring-2
                        focus-visible:ring-ring/25
                        focus-visible:ring-offset-2
                        focus-visible:ring-offset-background

                        [&::-webkit-slider-thumb]:h-5
                        [&::-webkit-slider-thumb]:w-5
                        [&::-webkit-slider-thumb]:appearance-none
                        [&::-webkit-slider-thumb]:rounded-full
                        [&::-webkit-slider-thumb]:border-[3px]
                        [&::-webkit-slider-thumb]:border-background
                        [&::-webkit-slider-thumb]:bg-foreground
                        [&::-webkit-slider-thumb]:shadow-md

                        [&::-moz-range-thumb]:h-5
                        [&::-moz-range-thumb]:w-5
                        [&::-moz-range-thumb]:rounded-full
                        [&::-moz-range-thumb]:border-[3px]
                        [&::-moz-range-thumb]:border-background
                        [&::-moz-range-thumb]:bg-foreground
                        [&::-moz-range-thumb]:shadow-md
                    "
                    style={{
                        background:
                            'linear-gradient(to right, hsl(0 36% 46%), hsl(60 36% 46%), hsl(120 36% 46%), hsl(180 36% 46%), hsl(240 36% 46%), hsl(300 36% 46%), hsl(360 36% 46%))',
                    }}
                />
            </div>
        </div>
    )
}