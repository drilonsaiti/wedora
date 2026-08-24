export interface WeddingThemeVars {
    '--primary': string
    '--primary-foreground': string
    '--accent': string
    '--accent-foreground': string
    '--gold': string
    '--ring': string
    '--blush': string
    '--dark': string
}

export type WeddingColorPresetId =
    | 'rose'
    | 'ocean'
    | 'sage'
    | 'violet'
    | 'terracotta'
    | 'burgundy'

export interface WeddingColorPreset {
    id: WeddingColorPresetId
    hue: number
}

/*
 * ============================================
 * WEDDING THEME GENERATOR
 *
 * Only the actual wedding accent changes.
 *
 * Champagne gold stays neutral so every
 * generated theme still feels like Wedora.
 * ============================================
 */
export function generateWeddingTheme(
    hue: number
): WeddingThemeVars {
    const clampedHue =
        Math.max(
            0,
            Math.min(
                360,
                hue
            )
        )

    return {
        /*
         * Main wedding color.
         *
         * Deep enough for buttons/text while
         * remaining soft and elegant.
         */
        '--primary':
            `${clampedHue} 36% 46%`,

        '--primary-foreground':
            '0 0% 100%',

        /*
         * Very light version used for icon
         * backgrounds and subtle highlights.
         */
        '--accent':
            `${clampedHue} 30% 94%`,

        '--accent-foreground':
            `${clampedHue} 34% 34%`,

        /*
         * Focus states follow the selected
         * wedding color.
         */
        '--ring':
            `${clampedHue} 36% 46%`,

        /*
         * Ambient glow derived from the wedding
         * color but intentionally very soft.
         */
        '--blush':
            `${clampedHue} 38% 88%`,

        /*
         * Champagne stays champagne.
         *
         * Do NOT rotate this with the selected hue.
         */
        '--gold':
            '38 45% 54%',

        /*
         * Keep dark surfaces neutral rather than
         * tinting the whole dark mode with the
         * wedding color.
         */
        '--dark':
            '24 18% 10%',
    }
}

/*
 * ============================================
 * COLOR PRESETS
 *
 * Only stable IDs are stored here.
 * Visible names are translated in the UI.
 * ============================================
 */
export const WEDDING_COLOR_PRESETS: readonly WeddingColorPreset[] =
    [
        {
            id: 'rose',
            hue: 355,
        },
        {
            id: 'ocean',
            hue: 205,
        },
        {
            id: 'sage',
            hue: 150,
        },
        {
            id: 'violet',
            hue: 265,
        },
        {
            id: 'terracotta',
            hue: 25,
        },
        {
            id: 'burgundy',
            hue: 340,
        },
    ]