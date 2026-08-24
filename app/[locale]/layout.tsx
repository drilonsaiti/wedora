import type {Metadata} from 'next'
import {Cormorant_Garamond, Geist, Jost} from 'next/font/google'
import '../globals.css'
import {cn} from '@/lib/utils'
import {ThemeProvider} from '@/contexts/theme-provider'
import {NextIntlClientProvider} from 'next-intl';
import {getMessages, getTranslations} from 'next-intl/server';
import {locales, type Locale} from '@/lib/i18n';
import {notFound} from 'next/navigation';
import {Toaster} from "sonner";

const geist = Geist({subsets: ['latin'], variable: '--font-sans'})

const cormorant = Cormorant_Garamond({
    subsets: ['latin'],
    weight: ['300', '400', '500', '600'],
    style: ['normal', 'italic'],
    variable: '--font-cormorant',
    display: 'swap',
})

const jost = Jost({
    subsets: ['latin'],
    weight: ['300', '400', '500', '600'],
    variable: '--font-jost',
    display: 'swap',
})

export async function generateMetadata({params}: {params: {locale: string}}): Promise<Metadata> {
    const {locale} = await params;
    const t = await getTranslations({locale, namespace: 'common'});
    
    return {
        title: 'Wedding Photos',
        description: 'Share your wedding memories',
        viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
        // themeColor: '#faf7f4', // themeColor is deprecated in Metadata, use viewport instead if needed
    };
}

export default async function RootLayout({
                                       children,
                                       params
                                   }: {
    children: React.ReactNode;
    params: Promise<{
        locale: string
    }>
}) {
    const {locale} = await params;

    // Validate that the incoming `locale` parameter is valid
    if (!locales.includes(locale as any)) {
        notFound();
    }

    // Providing all messages to the client
    // side is the easiest way to get started
    const messages = await getMessages();

    return (
        <html
            lang={locale}
            className={cn(cormorant.variable, jost.variable, 'font-sans', geist.variable)}
            suppressHydrationWarning
        >
        <body className="font-sans antialiased">
        <NextIntlClientProvider messages={messages}>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                {children}
                <Toaster />
            </ThemeProvider>
        </NextIntlClientProvider>
        </body>
        </html>
    )
}