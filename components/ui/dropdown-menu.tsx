"use client";

import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";

import { cn } from "@/lib/utils";

/*
 * ============================================
 * ROOT
 * ============================================
 */
function DropdownMenu({
                          ...props
                      }: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
    return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
}

/*
 * ============================================
 * TRIGGER
 * ============================================
 */
function DropdownMenuTrigger({
                                 ...props
                             }: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
    return (
        <DropdownMenuPrimitive.Trigger
            data-slot="dropdown-menu-trigger"
            {...props}
        />
    );
}

/*
 * ============================================
 * CONTENT
 * ============================================
 */
function DropdownMenuContent({
                                 className,
                                 sideOffset = 8,
                                 align = "end",
                                 collisionPadding = 8,
                                 ...props
                             }: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
    return (
        <DropdownMenuPrimitive.Portal>
            <DropdownMenuPrimitive.Content
                data-slot="dropdown-menu-content"
                sideOffset={sideOffset}
                align={align}
                collisionPadding={collisionPadding}
                className={cn(
                    /*
                     * Surface
                     *
                     * `max-height` is pinned to Radix's own
                     * available-space variable and paired with
                     * `overflow-y-auto` so a menu with many
                     * items (e.g. one row per table in a large
                     * wedding) scrolls internally instead of
                     * either overflowing past the viewport edge
                     * or -- with the old plain `overflow-hidden`
                     * and no max-height -- silently clipping off
                     * items with no way to scroll to them at all.
                     */
                    "z-[100] min-w-[11rem] overflow-x-hidden overflow-y-auto",
                    "max-h-[var(--radix-dropdown-menu-content-available-height)]",
                    "rounded-2xl border border-border/70",
                    "bg-card/95 p-1.5 text-card-foreground",
                    "shadow-[0_18px_50px_-18px_rgba(0,0,0,0.28)]",
                    "backdrop-blur-xl",

                    /*
                     * Animation
                     */
                    "origin-[var(--radix-dropdown-menu-content-transform-origin)]",
                    "data-[state=open]:animate-in",
                    "data-[state=closed]:animate-out",
                    "data-[state=open]:fade-in-0",
                    "data-[state=closed]:fade-out-0",
                    "data-[state=open]:zoom-in-95",
                    "data-[state=closed]:zoom-out-95",

                    "data-[side=bottom]:slide-in-from-top-1.5",
                    "data-[side=top]:slide-in-from-bottom-1.5",
                    "data-[side=left]:slide-in-from-right-1.5",
                    "data-[side=right]:slide-in-from-left-1.5",

                    className,
                )}
                {...props}
            />
        </DropdownMenuPrimitive.Portal>
    );
}

/*
 * ============================================
 * ITEM
 * ============================================
 */
function DropdownMenuItem({
                              className,
                              inset,
                              variant = "default",
                              ...props
                          }: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean;
    variant?: "default" | "destructive";
}) {
    return (
        <DropdownMenuPrimitive.Item
            data-slot="dropdown-menu-item"
            data-inset={inset}
            data-variant={variant}
            className={cn(
                /*
                 * Layout
                 */
                "relative flex min-h-9 cursor-pointer select-none items-center gap-2.5",
                "rounded-xl px-3 py-2",

                /*
                 * Typography
                 */
                "text-xs font-medium outline-none",

                /*
                 * Interaction
                 */
                "transition-colors",
                "focus:bg-secondary focus:text-foreground",
                "data-[highlighted]:bg-secondary data-[highlighted]:text-foreground",

                /*
                 * Disabled
                 */
                "data-[disabled]:pointer-events-none",
                "data-[disabled]:opacity-40",

                /*
                 * Icons
                 */
                "[&_svg]:pointer-events-none",
                "[&_svg]:h-4 [&_svg]:w-4",
                "[&_svg]:shrink-0",
                "[&_svg]:text-muted-foreground",

                /*
                 * Destructive
                 */
                variant === "destructive" && [
                    "text-destructive",
                    "focus:bg-destructive/[0.08]",
                    "focus:text-destructive",
                    "data-[highlighted]:bg-destructive/[0.08]",
                    "data-[highlighted]:text-destructive",
                    "[&_svg]:text-destructive",
                ],

                inset && "pl-9",

                className,
            )}
            {...props}
        />
    );
}

/*
 * ============================================
 * SEPARATOR
 * ============================================
 */
function DropdownMenuSeparator({
                                   className,
                                   ...props
                               }: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
    return (
        <DropdownMenuPrimitive.Separator
            data-slot="dropdown-menu-separator"
            className={cn("-mx-1 my-1.5 h-px bg-border/60", className)}
            {...props}
        />
    );
}

export {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
};
