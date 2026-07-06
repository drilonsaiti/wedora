import type { Metadata } from 'next'
import { Cormorant_Garamond, Jost, Geist } from 'next/font/google'
import './globals.css'
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

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

export const metadata: Metadata = {
  title: 'Wedding Photos',
  description: 'Share your wedding memories',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  themeColor: '#faf7f4',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={cn(cormorant.variable, jost.variable, "font-sans", geist.variable)}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
