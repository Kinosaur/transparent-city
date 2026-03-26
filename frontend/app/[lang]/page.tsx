import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import fs from 'fs'
import path from 'path'
import { getDictionary, hasLocale } from './dictionaries'
import type { OverviewData } from '@/lib/types'
import { formatDate } from '@/lib/districts-en'
import ProvocativeStat from '@/components/ProvocativeStat'
import KpiGrid from '@/components/KpiGrid'
import MonthlyChart from '@/components/MonthlyChart'
import TopTypesChart from '@/components/TopTypesChart'

export async function generateMetadata({ params }: PageProps<'/[lang]'>): Promise<Metadata> {
  const { lang } = await params
  const isTh = lang === 'th'
  const title = isTh
    ? 'ภาพรวมกรุงเทพฯ — เมืองโปร่งใส'
    : 'Bangkok Overview — Transparent City'
  const description = isTh
    ? 'สถิติตั๋วร้องเรียนกรุงเทพฯ จาก Traffy Fondue: 1.14 ล้านตั๋ว, อัตราการแก้ไข 78.5%, เวลาแก้ไขเฉลี่ย 5.5 วัน'
    : 'Bangkok civic complaint statistics from Traffy Fondue: 1.14M tickets, 78.5% resolution rate, 5.5-day median fix time.'
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
    alternates: { canonical: `/${lang}`, languages: { th: '/th', en: '/en' } },
  }
}

function loadOverview(): OverviewData {
  const filePath = path.join(process.cwd(), 'public', 'data', 'overview.json')
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
}

export default async function OverviewPage({ params }: PageProps<'/[lang]'>) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()

  const [dict, data] = await Promise.all([
    getDictionary(lang),
    Promise.resolve(loadOverview()),
  ])

  // Last 24 months for the trend chart
  const trendData = data.monthly_trends.slice(-24)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Page header */}
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold text-[--color-fg] tracking-tight">
          {dict.overview.title}
        </h1>
        <p className="mt-2 text-[--color-subtle]">
          {dict.overview.subtitle} ·{' '}
          <span className="text-[--color-muted]">
            {dict.overview.data_as_of} {formatDate(data.data_range.from, lang)} {dict.overview.to}{' '}
            {formatDate(data.data_range.to, lang)}
          </span>
        </p>
      </div>

      {/* Provocative stat */}
      <ProvocativeStat
        count={data.stale_tickets}
        label={dict.overview.provocative_label}
        rateLabel={dict.kpi.of_total}
        rate={data.stale_rate}
        lang={lang}
      />

      {/* KPI cards */}
      <KpiGrid data={data} dict={dict} lang={lang} />

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3">
          <MonthlyChart data={trendData} dict={dict} />
        </div>
        <div className="xl:col-span-2">
          <TopTypesChart data={data.top_problem_types} dict={dict} />
        </div>
      </div>
    </div>
  )
}
