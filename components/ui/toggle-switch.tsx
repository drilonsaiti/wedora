'use client';

import {cn} from '@/lib/utils';

interface ToggleSwitchProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label: string;
}

export function ToggleSwitch({checked, onChange, label}: ToggleSwitchProps) {
    return (
        <button
            type="button"
            onClick={() => onChange(!checked)}
            className="flex items-center gap-2 text-xs font-sans text-muted-foreground"
        >
            <span className="hidden sm:inline">{label}</span>
            <span
                className={cn(
                    'relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0',
                    checked ? 'bg-[hsl(var(--primary))]' : 'bg-muted'
                )}
            >
        <span
            className={cn(
                'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform',
                checked ? 'translate-x-5' : 'translate-x-1'
            )}
        />
      </span>
        </button>
    );
}