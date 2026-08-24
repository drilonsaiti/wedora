import * as React from 'react'

import { Slot } from '@radix-ui/react-slot'
import {
    cva,
    type VariantProps,
} from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
    [
        'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap',
        'text-xs font-medium',
        'transition-[background-color,border-color,color,box-shadow,transform,opacity] duration-200',
        'outline-none',
        'focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:pointer-events-none disabled:opacity-50',
        '[&_svg]:pointer-events-none [&_svg]:shrink-0',
        '[&_svg:not([class*="size-"]):not([class*="h-"]):not([class*="w-"])]:size-4',
    ],
    {
        variants: {
            variant: {
                /*
                 * Primary Wedora CTA.
                 */
                default: [
                    'rounded-full',
                    'bg-primary text-primary-foreground',
                    'shadow-sm',
                    'hover:-translate-y-0.5 hover:opacity-95 hover:shadow-md',
                    'active:translate-y-0 active:shadow-sm',
                ],

                /*
                 * Destructive actions remain red,
                 * but use the same visual language.
                 */
                destructive: [
                    'rounded-full',
                    'bg-destructive text-destructive-foreground',
                    'shadow-sm',
                    'hover:-translate-y-0.5 hover:opacity-90 hover:shadow-md',
                    'active:translate-y-0',
                    'focus-visible:ring-destructive/25',
                ],

                /*
                 * Main secondary action.
                 */
                outline: [
                    'rounded-full',
                    'border border-border/80',
                    'bg-card text-foreground',
                    'shadow-sm',
                    'hover:-translate-y-0.5 hover:bg-secondary',
                    'active:translate-y-0',
                ],

                /*
                 * Softer utility action.
                 */
                secondary: [
                    'rounded-full',
                    'bg-secondary text-secondary-foreground',
                    'hover:bg-secondary/75',
                ],

                /*
                 * Toolbars, menus and quiet actions.
                 *
                 * Deliberately not pill-shaped.
                 */
                ghost: [
                    'rounded-xl',
                    'text-muted-foreground',
                    'hover:bg-secondary hover:text-foreground',
                ],

                /*
                 * Text navigation.
                 */
                link: [
                    'h-auto rounded-none p-0',
                    'text-foreground underline-offset-4',
                    'shadow-none',
                    'hover:text-primary hover:underline',
                    'focus-visible:ring-offset-4',
                ],
            },

            size: {
                default:
                    'h-10 px-5',

                sm:
                    'h-8 gap-1.5 px-3.5 text-[11px]',

                lg:
                    'h-11 px-6 text-xs',

                icon:
                    'h-9 w-9 rounded-full p-0',
            },
        },

        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    }
)

function Button({
                    className,
                    variant,
                    size,
                    asChild = false,
                    ...props
                }: React.ComponentProps<'button'> &
    VariantProps<
        typeof buttonVariants
    > & {
    asChild?: boolean
}) {
    const Comp =
        asChild
            ? Slot
            : 'button'

    return (
        <Comp
            data-slot="button"
            className={cn(
                buttonVariants({
                    variant,
                    size,
                }),
                className
            )}
            {...props}
        />
    )
}

export {
    Button,
    buttonVariants,
}