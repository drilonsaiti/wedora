'use client'

import type { CSSProperties } from 'react'

import {
    CircleCheck,
    Info,
    Loader2,
    OctagonX,
    TriangleAlert,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import {
    Toaster as Sonner,
    type ToasterProps,
} from 'sonner'

export function Toaster(
    props: ToasterProps
) {
    const {
        theme = 'system',
    } = useTheme()

    return (
        <Sonner
            theme={
                theme as ToasterProps['theme']
            }
            position="top-center"
            closeButton
            richColors={false}
            visibleToasts={4}
            duration={4000}
            gap={8}
            offset="1rem"
            className="toaster group"
            icons={{
                success: (
                    <CircleCheck className="h-4 w-4 text-[hsl(var(--primary))]" />
                ),

                info: (
                    <Info className="h-4 w-4 text-muted-foreground" />
                ),

                warning: (
                    <TriangleAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                ),

                error: (
                    <OctagonX className="h-4 w-4 text-destructive" />
                ),

                loading: (
                    <Loader2 className="h-4 w-4 animate-spin text-[hsl(var(--primary))]" />
                ),
            }}
            toastOptions={{
                classNames: {
                    toast: [
                        '!rounded-2xl',
                        '!border !border-border/70',
                        '!bg-card/95',
                        '!text-card-foreground',
                        '!shadow-[0_18px_50px_-18px_rgba(0,0,0,0.28)]',
                        '!backdrop-blur-xl',
                        '!px-4 !py-3.5',
                    ].join(
                        ' '
                    ),

                    content:
                        '!gap-0.5',

                    title:
                        '!text-xs !font-medium !text-foreground',

                    description:
                        '!text-[11px] !leading-5 !text-muted-foreground',

                    icon:
                        '!mr-1',

                    success:
                        '!border-[hsl(var(--primary))]/15',

                    error:
                        '!border-destructive/20',

                    warning:
                        '!border-amber-500/20',

                    info:
                        '!border-border/70',

                    loading:
                        '!border-[hsl(var(--primary))]/15',

                    actionButton: [
                        '!h-8',
                        '!rounded-full',
                        '!bg-foreground',
                        '!px-3',
                        '!text-[10px]',
                        '!font-medium',
                        '!text-background',
                        'hover:!opacity-90',
                    ].join(
                        ' '
                    ),

                    cancelButton: [
                        '!h-8',
                        '!rounded-full',
                        '!bg-secondary',
                        '!px-3',
                        '!text-[10px]',
                        '!font-medium',
                        '!text-foreground',
                    ].join(
                        ' '
                    ),

                    closeButton: [
                        '!h-6 !w-6',
                        '!rounded-full',
                        '!border !border-border/70',
                        '!bg-card',
                        '!text-muted-foreground',
                        '!shadow-sm',
                        'hover:!bg-secondary',
                        'hover:!text-foreground',
                    ].join(
                        ' '
                    ),
                },
            }}
            style={
                {
                    '--normal-bg':
                        'hsl(var(--card))',

                    '--normal-text':
                        'hsl(var(--card-foreground))',

                    '--normal-border':
                        'hsl(var(--border))',

                    '--border-radius':
                        '1rem',
                } as CSSProperties
            }
            {...props}
        />
    )
}