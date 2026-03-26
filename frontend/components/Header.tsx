'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { Locale } from '@/lib/types'

type Props = {
  lang: Locale
  dict: {
    site: { name: string; tagline: string }
    nav: { overview: string; districts: string; leaderboard: string; gallery: string; map: string }
  }
}

export default function Header({ lang, dict }: Props) {
  const pathname = usePathname()
  const router = useRouter()

  const otherLang: Locale = lang === 'th' ? 'en' : 'th'

  function toggleLang() {
    // Persist the choice so the middleware remembers it on future visits
    document.cookie = `lang=${otherLang}; path=/; max-age=31536000; SameSite=Lax`
    const newPath = pathname.replace(`/${lang}`, `/${otherLang}`)
    router.push(newPath)
  }

  const navItems = [
    { label: dict.nav.overview, href: `/${lang}` },
    { label: dict.nav.districts, href: `/${lang}/districts` },
    { label: dict.nav.leaderboard, href: `/${lang}/leaderboard` },
    { label: dict.nav.gallery, href: `/${lang}/gallery` },
    { label: dict.nav.map, href: `/${lang}/map` },
  ]

  return (
    <header className="sticky top-0 z-50 border-b border-[--color-border] bg-[--color-surface-950]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href={`/${lang}`} className="flex items-center gap-2 shrink-0">
          <span className="w-2 h-2 rounded-full bg-[--color-teal-400]" />
          <span className="font-bold text-white text-sm tracking-wide">
            {dict.site.name}
          </span>
        </Link>

        {/* Nav — hidden on small screens */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map(({ label, href }) => {
            const isActive =
              href === `/${lang}` ? pathname === href : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  isActive
                    ? 'text-[--color-teal-400] bg-[--color-teal-400]/10'
                    : 'text-[--color-subtle] hover:text-white hover:bg-white/5'
                }`}
              >
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Language toggle */}
        <button
          onClick={toggleLang}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[--color-border] text-sm text-[--color-subtle] hover:text-white hover:border-[--color-border-hover] transition-colors"
        >
          <span className={lang === 'th' ? 'text-white font-medium' : ''}>TH</span>
          <span className="opacity-30">|</span>
          <span className={lang === 'en' ? 'text-white font-medium' : ''}>EN</span>
        </button>
      </div>
    </header>
  )
}
