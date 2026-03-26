import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import fs from 'fs'
import path from 'path'
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
  return {
    title,
    description,
    openGraph: { title, description, type: 'website' },
  }
}

function loadData() {
  const base = path.join(process.cwd(), 'public', 'data')
  return {
    points: JSON.parse(fs.readFileSync(path.join(base, 'points.json'), 'utf-8')) as MapPoint[],
    districts: JSON.parse(fs.readFileSync(path.join(base, 'districts.json'), 'utf-8')) as DistrictData[],
    geojson: JSON.parse(fs.readFileSync(path.join(base, 'bangkok-districts.geojson'), 'utf-8')),
  }
}

export default async function MapPage({ params }: PageProps<'/[lang]/map'>) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()

  const [dict, { points, districts, geojson }] = await Promise.all([
    getDictionary(lang),
    Promise.resolve(loadData()),
  ])

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 56px)' }}>
      {/* Slim header */}
      <div className="px-4 sm:px-6 lg:px-8 py-4 shrink-0">
        <h1 className="text-2xl font-bold text-white">{dict.map.title}</h1>
        <p className="text-sm text-[--color-subtle] mt-0.5">{dict.map.subtitle}</p>
      </div>

      {/* Full-height map */}
      <div className="relative flex-1 min-h-0">
        <MapLoader
          points={points}
          districts={districts}
          geojson={geojson}
          dict={dict}
          lang={lang as Locale}
        />
      </div>
    </div>
  )
}
