export interface WeddingThemeVars {
    '--primary': string;
    '--primary-foreground': string;
    '--accent': string;
    '--accent-foreground': string;
    '--gold': string;
    '--ring': string;
}


export function generateWeddingTheme(hue: number): WeddingThemeVars {
    const clampedHue = Math.max(0, Math.min(360, hue));

    return {
        '--primary': `${clampedHue} 30% 55%`,
        '--primary-foreground': '0 0% 100%',
        '--accent': `${clampedHue} 25% 92%`,
        '--accent-foreground': `${clampedHue} 30% 35%`,
        '--gold': `${(clampedHue + 30) % 360} 60% 55%`,
        '--ring': `${clampedHue} 30% 55%`,
    };
}

export const WEDDING_COLOR_PRESETS = [
    { name: 'Trëndafil', hue: 355 },
    { name: 'Blu Detit', hue: 205 },
    { name: 'Jeshile Gjelbër', hue: 150 },
    { name: 'Vjollcë', hue: 265 },
    { name: 'Portokalli i Ngrohtë', hue: 25 },
    { name: 'Bordo', hue: 340 },
] as const;