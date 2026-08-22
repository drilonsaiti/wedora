import {getTranslations} from 'next-intl/server';
import {generateWeddingTheme} from '@/lib/theme';
import {getWeddingBySlug} from '@/actions/wedding';
import {notFound} from 'next/navigation';

const DEMO_WEDDING_SLUG = 'sara-drilon';

export default async function DemoLayout({
                                             children
                                         }: {
    children: React.ReactNode;
}) {
    const t = await getTranslations('wedding');

    const wedding = await getWeddingBySlug(DEMO_WEDDING_SLUG);

    if (!wedding || !wedding.wedding_settings) {
        notFound();
    }

    const themeHue = wedding.wedding_settings.theme_hue ?? 355;
    const theme = generateWeddingTheme(themeHue);

    const cssVars = Object.entries(theme)
        .map(([key, value]) => `${key}: ${value};`)
        .join(' ');

    return (
        <div style={{['--theme-override' as string]: '1'}}>
            <style
                dangerouslySetInnerHTML={{
                    __html: `:root { ${cssVars} }`
                }}
            />

            <div
                className="fixed top-0 left-0 right-0 z-[60] bg-[hsl(var(--dark))] text-white text-center text-[10px] uppercase tracking-widest py-1.5 font-sans"
            >
                {t('demo.banner')}
            </div>

            <div className="pt-6">
                {children}
            </div>
        </div>
    );
}