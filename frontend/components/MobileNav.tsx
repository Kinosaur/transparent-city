'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Locale } from '@/lib/types'

type Props = {
  lang: Locale
  dict: {
    nav: { overview: string; districts: string }
  }
}

export default function MobileNav({ lang, dict }: Props) {
  const pathname = usePathname()

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
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-3-3v6M3 12a9 9 0 1118 0 9 9 0 01-18 0z" />
        </svg>
      ),
    },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-white/10 bg-[#08080f]/95 backdrop-blur-md">
      <div className="flex">
        {items.map(({ label, href, icon }) => {
          const isActive = href === `/${lang}` ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors ${
                isActive
                  ? 'text-[--color-teal-400]'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {icon}
              <span>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
