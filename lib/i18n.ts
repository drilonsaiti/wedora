export const locales = ['en', 'de', 'fr', 'it', 'tr', 'sq', 'mk'] as const;
export const defaultLocale = 'en' as const;

export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
    en: 'English',
    de: 'Deutsch',
    fr: 'Français',
    it: 'Italiano',
    tr: 'Türkçe',
    sq: 'Shqip',
    mk: 'Македонски'
};
