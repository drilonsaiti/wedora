import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

/*
 * Deliberately narrow scope: this covers pure/unit-testable logic
 * (lib/**, schemas/**) plus mocked-Supabase tests for the security-
 * critical RSVP auth path. It does NOT attempt to test React components,
 * Server Actions end-to-end, or anything that needs a real Supabase
 * instance -- see tests/README.md for why and what's not covered.
 */
export default defineConfig({
    plugins: [tsconfigPaths()],
    test: {
        environment: 'node',
        include: ['tests/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            include: ['lib/**', 'schemas/**'],
        },
    },
})
