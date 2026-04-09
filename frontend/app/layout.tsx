import type { Metadata } from 'next'
import { Geist, Geist_Mono, Noto_Sans_Thai, Space_Grotesk } from 'next/font/google'
import NextTopLoader from 'nextjs-toploader'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })
const notoThai = Noto_Sans_Thai({
  variable: '--font-noto-thai',
  subsets: ['thai'],
  weight: ['400', '500', '600', '700'],
})
const spaceGrotesk = Space_Grotesk({
  variable: '--font-brand',
  subsets: ['latin'],
  weight: ['500', '600', '700'],
})

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'https://transparent-city.vercel.app'
  ),
  title: 'เมืองโปร่งใส — Transparent City Bangkok',
  description:
    'Community-driven civic transparency for Bangkok. Powered by Traffy Fondue open data.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="th"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} ${notoThai.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextTopLoader color="#2dd4bf" shadow="0 0 10px #2dd4bf,0 0 5px #2dd4bf" showSpinner={false} height={2} />
        {children}
      </body>
    </html>
  )
}
