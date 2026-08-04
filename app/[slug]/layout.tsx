import { generateWeddingTheme } from '@/lib/theme';
import { getWeddingBySlug } from '@/actions/wedding';

export default async function WeddingLayout({
                                                children,
                                                params,
                                            }: {
    children: React.ReactNode;
    params: { slug: string };
}) {
    const wedding = await getWeddingBySlug(params.slug);

    if (!wedding || !wedding.wedding_settings) {
        throw new Error('No wedding found for this admin')
    }

    const theme_color = wedding.wedding_settings.theme_color;
    const themeHue = theme_color && !Number.isNaN(Number(theme_color))
        ? Number(theme_color)
        : 355;

    const theme = generateWeddingTheme(themeHue);

    const cssVars = Object.entries(theme)
        .map(([key, value]) => `${key}: ${value};`)
        .join(' ');

    return (
        <div style={{ ['--theme-override' as string]: '1' }}>
            <style dangerouslySetInnerHTML={{ __html: `:root { ${cssVars} }` }} />
            {children}
        </div>
    );
}