import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const locales = ['th', 'en']
const defaultLocale = 'th'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const hasLocale = locales.some(
    (l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`
  )
  if (hasLocale) return

  // Saved preference (set by the header toggle) takes priority
  const cookieLang = request.cookies.get('lang')?.value
  const acceptLang = request.headers.get('accept-language') ?? ''
  const fromAccept = acceptLang.toLowerCase().includes('th') ? 'th' : defaultLocale
  const locale = (cookieLang && locales.includes(cookieLang)) ? cookieLang : fromAccept

  request.nextUrl.pathname = `/${locale}${pathname}`
  return NextResponse.redirect(request.nextUrl)
}

export const config = {
  matcher: ['/((?!_next|favicon\\.ico|data|.*\\..*).*)',],
}
