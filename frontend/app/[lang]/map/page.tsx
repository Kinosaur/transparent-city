import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import fs from 'fs'
import path from 'path'
import Link from 'next/link'
import { getDictionary, hasLocale } from '../dictionaries'
import type { MapPoint, DistrictData, Locale } from '@/lib/types'
import MapLoader from '@/components/map/MapLoader'

export async function generateMetadata({ params }: PageProps<'/[lang]/map'>): Promise<Metadata> {
  const { lang } = await params
  const isTh = lang === 'th'
  const title = isTh ? 'แผนที่สำรวจ — เมืองโปร่งใส' : 'Explore Map — Transparent City'
  const description = isTh
    ? 'แผนที่ตั๋วค้างคาและคะแนนต่ำในกรุงเทพฯ พร้อม choropleth แสดงผลงานแต่ละเขต'
    : "Map of Bangkok's stale and low-rated civic tickets with district-level choropleth shading."
  const ogImage = `https://transparent-city.vercel.app/api/og?page=map&lang=${lang}`
  return {
    title,
    description,
    openGraph: { title, description, type: 'website', images: [{ url: ogImage, width: 1200, height: 630, alt: title }] },
    twitter: { card: 'summary_large_image', title, description, images: [ogImage] },
    alternates: { canonical: `/${lang}/map`, languages: { th: '/th/map', en: '/en/map' } },
  }
}

function loadData() {
  const base = path.join(process.cwd(), 'public', 'data')
  return {
    points: JSON.parse(fs.readFileSync(path.join(base, 'points.json'), 'utf-8')) as MapPoint[],
    districts: JSON.parse(fs.readFileSync(path.join(base, 'districts.json'), 'utf-8')) as DistrictData[],
    geojson: JSON.parse(fs.readFileSync(path.join(base, 'bangkok-districts.geojson'), 'utf-8')) as Record<string, unknown>,
    overview: JSON.parse(fs.readFileSync(path.join(base, 'overview.json'), 'utf-8')) as {
      stale_tickets: number
      data_range: { to: string }
    },
  }
}

export default async function MapPage({ params }: PageProps<'/[lang]/map'>) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()

  const [dict, { points, districts, geojson, overview }] = await Promise.all([
    getDictionary(lang),
    Promise.resolve(loadData()),
  ])

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 56px)' }}>
      {/* Slim header */}
      <div className="px-4 sm:px-6 lg:px-8 py-4 shrink-0">
        <h1 className="text-2xl font-bold text-[--color-fg]">{dict.map.title}</h1>
        <p className="text-sm text-[--color-subtle] mt-0.5">{dict.map.subtitle}</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[--color-subtle]">
          <span className="rounded-full border border-[--color-border] bg-[--color-surface] px-2.5 py-1">
            {dict.map.snapshot_label}: {overview.data_range.to}
          </span>
          <span className="rounded-full border border-teal-400/20 bg-teal-400/5 px-2.5 py-1 text-teal-300">
            {dict.map.no_api_key}
          </span>
          <Link href={`/${lang}/methods`} className="text-[--color-teal-400] hover:underline underline-offset-4">
            {dict.map.methods_link}
          </Link>
        </div>
      </div>

      {/* Full-height map */}
      <div className="relative flex-1 min-h-0">
        <MapLoader
          points={points}
          districts={districts}
          geojson={geojson}
          totalStale={overview.stale_tickets}
          dict={dict}
          lang={lang as Locale}
        />
      </div>
    </div>
  )
}
