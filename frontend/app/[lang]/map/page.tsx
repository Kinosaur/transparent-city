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
      {/* Page context */}
      <header className="shrink-0 border-b border-[--color-border] bg-[--color-surface-950]/80 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[--color-fg]">{dict.map.title}</h1>
            <p className="mt-0.5 text-sm text-[--color-subtle]">{dict.map.subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border border-[--color-border] bg-[--color-surface-900] px-2.5 py-1 text-[--color-subtle]">
              {dict.map.snapshot_label}: {overview.data_range.to}
            </span>
            <Link href={`/${lang}/methods`} className="rounded-full px-1 py-1 font-medium text-[--color-teal-400] hover:underline hover:underline-offset-4">
              {dict.map.methods_link}
            </Link>
          </div>
        </div>
      </header>

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
