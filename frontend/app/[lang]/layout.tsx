import { notFound } from 'next/navigation'
import { getDictionary, hasLocale } from './dictionaries'
import Header from '@/components/Header'
import MobileNav from '@/components/MobileNav'

export async function generateStaticParams() {
  return [{ lang: 'th' }, { lang: 'en' }]
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<'/[lang]'>) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()

  const dict = await getDictionary(lang)

  return (
    <div className="flex flex-col min-h-screen">
      <Header lang={lang} dict={dict} />
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      <footer className="border-t border-[--color-border] py-6 px-4 text-center text-xs text-[--color-muted] mb-16 md:mb-0">
        <p>{dict.footer.credit}</p>
        <p className="mt-1 opacity-60">{dict.footer.disclaimer}</p>
      </footer>
      <MobileNav lang={lang} dict={dict} />
    </div>
  )
}
