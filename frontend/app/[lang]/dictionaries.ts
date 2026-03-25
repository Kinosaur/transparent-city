import 'server-only'

export type Locale = 'th' | 'en'

const dictionaries = {
  th: () => import('@/dictionaries/th.json').then((m) => m.default),
  en: () => import('@/dictionaries/en.json').then((m) => m.default),
}

export const hasLocale = (locale: string): locale is Locale =>
  locale in dictionaries

export const getDictionary = async (locale: Locale) => dictionaries[locale]()
