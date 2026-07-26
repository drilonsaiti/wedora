// components/theme-provider.tsx
'use client'

import * as React from 'react'
import {ThemeProvider as NextThemesProvider} from 'next-themes'

// next-themes renders an inline <script> to prevent theme flicker on load.
// React 19 warns about script tags rendered inside components — that warning
// is a false positive here; the script runs correctly during SSR.
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    const originalError = console.error
    console.error = (...args: unknown[]) => {
        if (typeof args[0] === 'string' && args[0].includes('Encountered a script tag')) return
        originalError.apply(console, args)
    }
}

export function ThemeProvider({
                                  children,
                                  ...props
                              }: React.ComponentProps<typeof NextThemesProvider>) {
    return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}