'use client'

import {cn} from '@/lib/utils'

interface ToggleSwitchProps {
    checked: boolean
    onChange: (checked: boolean) => void
    label: string
    className?: string
    disabled?: boolean
}

export function ToggleSwitch({
                                 checked,
                                 onChange,
                                 label,
                                 className,
                                 disabled = false,
                             }: ToggleSwitchProps) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            disabled={disabled}
            onClick={() =>
                onChange(!checked)
            }
            className={cn(
                'group inline-flex items-center gap-2.5 rounded-xl',
                'text-xs font-medium text-muted-foreground',
                'transition-colors',
                'hover:text-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                'disabled:pointer-events-none disabled:opacity-50',
                className
            )}
        >
            <span className="hidden sm:inline">
                {label}
            </span>

            <span
                aria-hidden
                className={cn(
                    'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-200',

                    checked
                        ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))]'
                        : 'border-border bg-secondary'
                )}
            >
                <span
                    className={cn(
                        'block h-4 w-4 rounded-full bg-white shadow-sm',
                        'transition-transform duration-200 ease-out',

                        checked
                            ? 'translate-x-[22px]'
                            : 'translate-x-[3px]'
                    )}
                />
            </span>
        </button>
    )
}