'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Locale } from '@/lib/types'

type Props = {
  lang: Locale
  dict: {
    nav: { overview: string; districts: string; leaderboard: string; gallery: string; map: string }
  }
}

export default function MobileNav({ lang, dict }: Props) {
  const pathname = usePathname()

  function isItemActive(href: string): boolean {
    if (href === `/${lang}`) return pathname === href
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  const items = [
    {
      label: dict.nav.overview,
      href: `/${lang}`,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      ),
    },
    {
      label: dict.nav.districts,
      href: `/${lang}/districts`,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      label: dict.nav.map,
      href: `/${lang}/map`,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      label: dict.nav.leaderboard,
      href: `/${lang}/leaderboard`,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      label: dict.nav.gallery,
      href: `/${lang}/gallery`,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-[--color-border] bg-[--color-surface-950]/95 backdrop-blur-md">
      <div className="flex px-1 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
        {items.map(({ label, href, icon }) => {
          const isActive = isItemActive(href)
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex-1 flex flex-col items-center gap-0.5 py-2 rounded-lg text-[10px] transition-all ${
                isActive
                  ? 'text-[--color-teal-400] bg-[--color-teal-400]/12'
                  : 'text-[--color-muted] hover:text-[--color-subtle] hover:bg-white/5'
              }`}
            >
              <span
                className={`absolute top-0 left-1/2 -translate-x-1/2 h-0.5 rounded-full transition-all ${
                  isActive ? 'w-6 opacity-100 bg-[--color-teal-400]' : 'w-0 opacity-0'
                }`}
              />
              {icon}
              <span className="leading-tight truncate max-w-full px-1 font-medium">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
