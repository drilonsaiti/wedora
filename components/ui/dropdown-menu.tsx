'use client'

import * as React from 'react'
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'

import {cn} from '@/lib/utils'

function DropdownMenu({
                          ...props
                      }: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
    return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />
}

function DropdownMenuTrigger({
                                 ...props
                             }: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
    return (
        <DropdownMenuPrimitive.Trigger
            data-slot="dropdown-menu-trigger"
            {...props}
        />
    )
}

function DropdownMenuContent({
                                 className,
                                 sideOffset = 6,
                                 ...props
                             }: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
    return (
        <DropdownMenuPrimitive.Portal>
            <DropdownMenuPrimitive.Content
                data-slot="dropdown-menu-content"
                sideOffset={sideOffset}
                className={cn(
                    'z-50 min-w-[8rem] overflow-hidden rounded-xl border border-border bg-card p-1.5 text-card-foreground shadow-lg',
                    'animate-in fade-in-0 zoom-in-95',
                    'data-[side=bottom]:slide-in-from-top-2',
                    'data-[side=left]:slide-in-from-right-2',
                    'data-[side=right]:slide-in-from-left-2',
                    'data-[side=top]:slide-in-from-bottom-2',
                    className,
                )}
                {...props}
            />
        </DropdownMenuPrimitive.Portal>
    )
}

function DropdownMenuItem({
                              className,
                              inset,
                              ...props
                          }: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean
}) {
    return (
        <DropdownMenuPrimitive.Item
            data-slot="dropdown-menu-item"
            data-inset={inset}
            className={cn(
                'relative flex cursor-default select-none items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none transition-colors',
                'text-foreground',
                'focus:bg-secondary focus:text-secondary-foreground',
                'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
                inset && 'pl-8',
                className,
            )}
            {...props}
        />
    )
}

function DropdownMenuSeparator({
                                   className,
                                   ...props
                               }: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
    return (
        <DropdownMenuPrimitive.Separator
            data-slot="dropdown-menu-separator"
            className={cn('-mx-1 my-1 h-px bg-border', className)}
            {...props}
        />
    )
}

export {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
}