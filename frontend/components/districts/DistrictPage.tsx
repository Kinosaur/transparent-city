'use client'

import { useState } from 'react'
import type { DistrictData, Locale } from '@/lib/types'
import DistrictSelector from './DistrictSelector'
import ReportCard from './ReportCard'

type BkkAvg = {
  resolution_rate: number
  median_resolution_days: number
  avg_satisfaction: number
  stale_rate: number
}

type Dict = {
  districts: {
    title: string
    subtitle: string
    select_placeholder: string
    grade_label: string
    vs_bkk: string
    resolution_rate: string
    median_days: string
    avg_satisfaction: string
    stale_pct: string
    top_types: string
    worst_stale: string
    days_open: string
    bkk_avg: string
    this_district: string
    days: string
    tickets: string
    total_tickets: string
    improving: string
    worsening: string
    stable: string
    no_stale: string
    select_prompt: string
    grade_excellent: string
    grade_good: string
    grade_average: string
    grade_below: string
    grade_poor: string
    score_label: string
    trend_3mo: string
    stale_label: string
    comparison_subtitle: string
    bkk_prefix: string
  }
}

type Props = {
  districts: DistrictData[]
  bkkAvg: BkkAvg
  dict: Dict
  lang: Locale
}

export default function DistrictPage({ districts, bkkAvg, dict, lang }: Props) {
  const [selected, setSelected] = useState<DistrictData | null>(null)

  const sorted = [...districts].sort((a, b) => a.district.localeCompare(b.district, 'th'))

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
          {dict.districts.title}
        </h1>
        <p className="mt-2 text-[--color-subtle]">{dict.districts.subtitle}</p>
      </div>

      {/* Selector */}
      <DistrictSelector
        districts={sorted}
        selected={selected}
        onSelect={setSelected}
        placeholder={dict.districts.select_placeholder}
      />

      {/* Report card or empty state */}
      {selected ? (
        <ReportCard
          district={selected}
          bkkAvg={bkkAvg}
          dict={dict}
          lang={lang}
        />
      ) : (
        <div className="flex items-center justify-center h-48 rounded-xl border border-dashed border-[--color-border] text-[--color-muted]">
          {dict.districts.select_prompt}
        </div>
      )}
    </div>
  )
}
