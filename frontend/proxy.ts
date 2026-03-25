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

  const acceptLang = request.headers.get('accept-language') ?? ''
  const locale = acceptLang.toLowerCase().includes('th') ? 'th' : defaultLocale

  request.nextUrl.pathname = `/${locale}${pathname}`
  return NextResponse.redirect(request.nextUrl)
}

export const config = {
  matcher: ['/((?!_next|favicon\\.ico|data|.*\\..*).*)',],
}
