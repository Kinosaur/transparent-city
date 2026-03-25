import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import fs from 'fs'
import path from 'path'
import { getDictionary, hasLocale } from '../dictionaries'
import type { OrgData, OverviewData, Locale } from '@/lib/types'
import LeaderboardPage from '@/components/leaderboard/LeaderboardPage'

export async function generateMetadata({ params }: PageProps<'/[lang]'>): Promise<Metadata> {
  const { lang } = await params
  const isTh = lang === 'th'
  const title = isTh ? 'จัดอันดับหน่วยงาน — เมืองโปร่งใส' : 'Agency Leaderboard — Transparent City'
  const description = isTh
    ? 'อันดับหน่วยงานตามผลงาน: อัตราการแก้ไข, ความเร็ว, ความพึงพอใจ'
    : 'All Bangkok agencies ranked by resolution rate, speed, and satisfaction score.'
  return {
    title,
    description,
    openGraph: { title, description, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
    alternates: { canonical: `/${lang}/leaderboard`, languages: { th: '/th/leaderboard', en: '/en/leaderboard' } },
  }
}

function loadData(): { orgs: OrgData[]; overview: OverviewData } {
  const base = path.join(process.cwd(), 'public', 'data')
  const orgs: OrgData[] = JSON.parse(fs.readFileSync(path.join(base, 'orgs.json'), 'utf-8'))
  const overview: OverviewData = JSON.parse(fs.readFileSync(path.join(base, 'overview.json'), 'utf-8'))
  // Only pass orgs with enough tickets to be meaningful (reduces payload ~90%)
  return { orgs: orgs.filter((o) => o.total_tickets >= 100), overview }
}

export default async function LeaderboardRoute({ params }: PageProps<'/[lang]'>) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()

  const [dict, { orgs, overview }] = await Promise.all([
    getDictionary(lang),
    Promise.resolve(loadData()),
  ])

  const bkkAvg = {
    resolution_rate: overview.resolution_rate,
    median_resolution_days: overview.median_resolution_days,
    avg_satisfaction: overview.avg_satisfaction,
    reopen_rate: overview.reopen_pct,
  }

  return (
    <LeaderboardPage
      orgs={orgs}
      bkkAvg={bkkAvg}
      dict={dict}
      lang={lang as Locale}
    />
  )
}
