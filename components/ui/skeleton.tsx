import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

interface SkeletonProps extends ComponentProps<'div'> {}

export function Skeleton({
                             className,
                             ...props
                         }: SkeletonProps) {
    return (
        <div
            aria-hidden="true"
            className={cn(
                'animate-pulse rounded-xl bg-muted',
                className
            )}
            {...props}
        />
    )
}