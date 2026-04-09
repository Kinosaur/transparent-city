import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import fs from 'fs'
import path from 'path'
import { getDictionary, hasLocale } from '../dictionaries'
import type { DistrictData, OverviewData, Locale } from '@/lib/types'
import { fromSlug, districtName } from '@/lib/districts-en'
import DistrictPage from '@/components/districts/DistrictPage'

function loadData(): { districts: DistrictData[]; overview: OverviewData } {
  const base = path.join(process.cwd(), 'public', 'data')
  return {
    districts: JSON.parse(fs.readFileSync(path.join(base, 'districts.json'), 'utf-8')),
    overview: JSON.parse(fs.readFileSync(path.join(base, 'overview.json'), 'utf-8')),
  }
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps<'/[lang]'>): Promise<Metadata> {
  const { lang } = await params
  const { district: slug } = await searchParams
  const isTh = lang === 'th'

  const { districts } = loadData()

  // If a specific district is in the URL, generate a district-specific OG image
  const thName = slug ? fromSlug(slug as string) : undefined
  const districtData = thName ? districts.find((d) => d.district === thName) : undefined

  let title: string
  let description: string
  let ogImage: string

  if (districtData) {
    const dName = districtName(districtData.district, lang as Locale)
    title = isTh
      ? `${dName} เกรด ${districtData.grade} — เมืองโปร่งใส`
      : `${dName}: Grade ${districtData.grade} — Transparent City`
    description = isTh
      ? `ผลงานเขต${dName}: อัตราการแก้ไข ${districtData.resolution_rate?.toFixed(1)}%, เวลาเฉลี่ย ${districtData.median_resolution_days?.toFixed(1)} วัน`
      : `${dName} district report: ${districtData.resolution_rate?.toFixed(1)}% resolution rate, ${districtData.median_resolution_days?.toFixed(1)} day median fix time.`
    const staleRate = districtData.total_tickets > 0
      ? ((districtData.stale_tickets / districtData.total_tickets) * 100).toFixed(1)
      : '0'
    ogImage = `https://transparent-city.vercel.app/api/og?page=districts&lang=${lang}&district=${encodeURIComponent(districtName(districtData.district, 'en'))}&grade=${districtData.grade}&resolution=${districtData.resolution_rate?.toFixed(1)}&stale=${staleRate}&tickets=${districtData.total_tickets}`
  } else {
    title = isTh ? 'ผลงานเขต — เมืองโปร่งใส' : 'District Report Card — Transparent City'
    description = isTh
      ? 'เปรียบเทียบผลงาน 50 เขตในกรุงเทพฯ: เกรด A-F, อัตราการแก้ไข, เวลาเฉลี่ย, ตั๋วค้างคา'
      : 'Compare all 50 Bangkok districts: A-F grades, resolution rates, median fix times, and stale ticket counts.'
    ogImage = `https://transparent-city.vercel.app/api/og?page=districts&lang=${lang}`
  }

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      locale: isTh ? 'th_TH' : 'en_US',
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [ogImage] },
    alternates: { canonical: `/${lang}/districts`, languages: { th: '/th/districts', en: '/en/districts' } },
  }
}

export default async function DistrictsRoute({
  params,
  searchParams,
}: PageProps<'/[lang]'>) {
  const { lang } = await params
  const { district: slug } = await searchParams
  if (!hasLocale(lang)) notFound()

  const [dict, { districts, overview }] = await Promise.all([
    getDictionary(lang),
    Promise.resolve(loadData()),
  ])

  const bkkAvg = {
    resolution_rate: overview.resolution_rate,
    median_resolution_days: overview.median_resolution_days,
    avg_satisfaction: overview.avg_satisfaction,
    stale_rate: overview.stale_rate,
  }

  // Pre-select district from URL if present
  const thName = slug ? fromSlug(slug as string) : undefined
  const initialDistrict = thName ? (districts.find((d) => d.district === thName) ?? null) : null

  return (
    <DistrictPage
      districts={districts}
      bkkAvg={bkkAvg}
      dict={dict}
      lang={lang as Locale}
      initialDistrict={initialDistrict}
    />
  )
}
