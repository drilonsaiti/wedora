'use client';

import { cn } from '@/lib/utils';
import { WEDDING_COLOR_PRESETS } from '@/lib/theme';
import { Check } from 'lucide-react';

interface ColorPickerProps {
    value: number;
    onChange: (hue: number) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
    return (
        <div className="space-y-3">
            <div className="flex flex-wrap gap-3">
                {WEDDING_COLOR_PRESETS.map((preset) => (
                    <button
                        key={preset.hue}
                        type="button"
                        onClick={() => onChange(preset.hue)}
                        title={preset.name}
                        className="relative w-10 h-10 rounded-full border-2 border-white shadow-md transition-transform hover:scale-110"
                        style={{ backgroundColor: `hsl(${preset.hue}, 45%, 55%)` }}
                    >
                        {value === preset.hue && (
                            <span className="absolute inset-0 flex items-center justify-center">
                <Check className="w-4 h-4 text-white drop-shadow" />
              </span>
                        )}
                    </button>
                ))}
            </div>

            <div>
                <label className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-2">
                    Ose zgjidhni një ngjyrë tuajën
                </label>
                <input
                    type="range"
                    min={0}
                    max={360}
                    value={value}
                    onChange={(e) => onChange(Number(e.target.value))}
                    className="w-full h-3 rounded-full appearance-none cursor-pointer"
                    style={{
                        background: 'linear-gradient(to right, hsl(0,45%,55%), hsl(60,45%,55%), hsl(120,45%,55%), hsl(180,45%,55%), hsl(240,45%,55%), hsl(300,45%,55%), hsl(360,45%,55%))',
                    }}
                />
            </div>
        </div>
    );
}