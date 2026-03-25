import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import fs from 'fs'
import path from 'path'
import { getDictionary, hasLocale } from '../dictionaries'
import type { GalleryItem, Locale } from '@/lib/types'
import GalleryPage from '@/components/gallery/GalleryPage'

export async function generateMetadata({ params }: PageProps<'/[lang]'>): Promise<Metadata> {
  const { lang } = await params
  const isTh = lang === 'th'
  const title = isTh ? 'ก่อน-หลัง — เมืองโปร่งใส' : 'Before / After — Transparent City'
  const description = isTh
    ? 'หลักฐานที่พิสูจน์ว่าการรายงานปัญหาได้ผลจริง: ภาพก่อนและหลังการแก้ไข'
    : 'Visual proof that civic reporting works: before and after photos of resolved tickets.'
  return {
    title,
    description,
    openGraph: { title, description, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
    alternates: { canonical: `/${lang}/gallery`, languages: { th: '/th/gallery', en: '/en/gallery' } },
  }
}

export default async function GalleryRoute({ params }: PageProps<'/[lang]'>) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()

  const base = path.join(process.cwd(), 'public', 'data')
  const [dict, items] = await Promise.all([
    getDictionary(lang),
    Promise.resolve(JSON.parse(fs.readFileSync(path.join(base, 'gallery.json'), 'utf-8')) as GalleryItem[]),
  ])

  return <GalleryPage items={items} dict={dict} lang={lang as Locale} />
}
