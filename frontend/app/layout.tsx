import type { Metadata } from 'next'
import { Geist, Geist_Mono, Noto_Sans_Thai } from 'next/font/google'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })
const notoThai = Noto_Sans_Thai({
  variable: '--font-noto-thai',
  subsets: ['thai'],
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'เมืองโปร่งใส — Transparent City Bangkok',
  description:
    'Community-driven civic transparency for Bangkok. Powered by Traffy Fondue open data.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="th"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} ${notoThai.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
