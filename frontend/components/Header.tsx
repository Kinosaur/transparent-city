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
    const secure = window.location.protocol === 'https:' ? '; Secure' : ''
    document.cookie = `lang=${otherLang}; path=/; max-age=31536000; SameSite=Lax${secure}`
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
          <span className="font-bold text-[--color-fg] text-sm tracking-wide">
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
                    : 'text-[--color-subtle] hover:text-[--color-fg] hover:bg-white/5'
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
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[--color-border] text-sm text-[--color-subtle] hover:text-[--color-fg] hover:border-[--color-border-hover] transition-colors"
        >
          <span className={lang === 'th' ? 'text-[--color-fg] font-medium' : ''}>TH</span>
          <span className="opacity-30">|</span>
          <span className={lang === 'en' ? 'text-[--color-fg] font-medium' : ''}>EN</span>
        </button>

        {/* GitHub link */}
        <a
          href="https://github.com/Kinosaur/transparent-city"
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-[--color-subtle] hover:text-[--color-fg] transition-colors"
          aria-label="GitHub repository"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
          </svg>
        </a>
      </div>
    </header>
  )
}
