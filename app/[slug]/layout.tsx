import {generateWeddingTheme} from '@/lib/theme';
import {getWeddingBySlug} from '@/actions/wedding';
import {notFound} from 'next/navigation';

export default async function WeddingLayout({
                                                children,
                                                params,
                                            }: {
    children: React.ReactNode;
    params: Promise<{ slug: string }>;
}) {
    const {slug} = await params
    const wedding = await getWeddingBySlug(slug);

    if (!wedding || !wedding.wedding_settings) {
        notFound()
    }

    const themeHue = wedding.wedding_settings.theme_hue ?? 355;
    const theme = generateWeddingTheme(themeHue);

    const cssVars = Object.entries(theme)
        .map(([key, value]) => `${key}: ${value};`)
        .join(' ');

    return (
        <div style={{['--theme-override' as string]: '1'}}>
            <style dangerouslySetInnerHTML={{__html: `:root { ${cssVars} }`}}/>
            {children}
        </div>
    );
}