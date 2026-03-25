import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import fs from 'fs'
import path from 'path'
import { getDictionary, hasLocale } from '../dictionaries'
import type { DistrictData, OverviewData, Locale } from '@/lib/types'
import DistrictPage from '@/components/districts/DistrictPage'

export async function generateMetadata({ params }: PageProps<'/[lang]'>): Promise<Metadata> {
  const { lang } = await params
  const isTh = lang === 'th'
  const title = isTh
    ? 'ผลงานเขต — เมืองโปร่งใส'
    : 'District Report Card — Transparent City'
  const description = isTh
    ? 'เปรียบเทียบผลงาน 50 เขตในกรุงเทพฯ: เกรด A-F, อัตราการแก้ไข, เวลาเฉลี่ย, ตั๋วค้างคา'
    : 'Compare all 50 Bangkok districts: A-F grades, resolution rates, median fix times, and stale ticket counts.'
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      locale: isTh ? 'th_TH' : 'en_US',
    },
    twitter: { card: 'summary_large_image', title, description },
    alternates: { canonical: `/${lang}/districts`, languages: { th: '/th/districts', en: '/en/districts' } },
  }
}

function loadData(): { districts: DistrictData[]; overview: OverviewData } {
  const base = path.join(process.cwd(), 'public', 'data')
  return {
    districts: JSON.parse(fs.readFileSync(path.join(base, 'districts.json'), 'utf-8')),
    overview: JSON.parse(fs.readFileSync(path.join(base, 'overview.json'), 'utf-8')),
  }
}

export default async function DistrictsRoute({ params }: PageProps<'/[lang]'>) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()

  const [dict, { districts, overview }] = await Promise.all([
    getDictionary(lang),
    Promise.resolve(loadData()),
  ])

  // Bangkok averages from overview
  const bkkAvg = {
    resolution_rate: overview.resolution_rate,
    median_resolution_days: overview.median_resolution_days,
    avg_satisfaction: overview.avg_satisfaction,
    stale_rate: overview.stale_rate,
  }

  return (
    <DistrictPage
      districts={districts}
      bkkAvg={bkkAvg}
      dict={dict}
      lang={lang as Locale}
    />
  )
}
