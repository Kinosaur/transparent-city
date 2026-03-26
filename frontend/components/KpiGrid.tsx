'use client'

import { useEffect, useRef, useState } from 'react'
import type { OverviewData, Locale } from '@/lib/types'

function useCountUp(target: number, decimals = 0, duration = 1200) {
  const [value, setValue] = useState(0)
  const frame = useRef<number | null>(null)

  useEffect(() => {
    const start = performance.now()
    function tick(now: number) {
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(parseFloat((eased * target).toFixed(decimals)))
      if (p < 1) frame.current = requestAnimationFrame(tick)
    }
    frame.current = requestAnimationFrame(tick)
    return () => { if (frame.current) cancelAnimationFrame(frame.current) }
  }, [target, decimals, duration])

  return value
}

function KpiCard({
  label,
  value,
  suffix,
  accent,
}: {
  label: string
  value: string
  suffix?: string
  accent?: 'teal' | 'good' | 'bad' | 'warn'
}) {
  const colorMap = {
    teal: 'text-[--color-teal-400]',
    good: 'text-[--color-good]',
    bad: 'text-[--color-bad]',
    warn: 'text-[--color-warn]',
  }
  const valueColor = accent ? colorMap[accent] : 'text-[--color-fg]'

  return (
    <div className="rounded-xl border border-[--color-border] bg-[--color-surface-900] px-5 py-5 flex flex-col gap-2 hover:border-[--color-border-hover] transition-colors">
      <p className="text-xs text-[--color-muted] uppercase tracking-wider font-medium">{label}</p>
      <p className={`text-3xl font-bold tabular-nums leading-none ${valueColor}`}>
        {value}
        {suffix && (
          <span className="text-base font-normal text-[--color-subtle] ml-1">{suffix}</span>
        )}
      </p>
    </div>
  )
}

type Props = {
  data: OverviewData
  dict: {
    kpi: {
      total_tickets: string
      resolution_rate: string
      median_resolution_days: string
      avg_satisfaction: string
      stale_tickets: string
      days: string
      out_of_5: string
      of_total: string
    }
  }
  lang: Locale
}

export default function KpiGrid({ data, dict, lang }: Props) {
  const total = useCountUp(data.total_tickets, 0)
  const resRate = useCountUp(data.resolution_rate, 1)
  const medDays = useCountUp(data.median_resolution_days, 1)
  const avgStar = useCountUp(data.avg_satisfaction, 2)

  const fmt = (n: number) =>
    lang === 'th' ? Math.round(n).toLocaleString('th-TH') : Math.round(n).toLocaleString('en-US')

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard
        label={dict.kpi.total_tickets}
        value={fmt(total)}
        accent="teal"
      />
      <KpiCard
        label={dict.kpi.resolution_rate}
        value={`${resRate.toFixed(1)}%`}
        accent="good"
      />
      <KpiCard
        label={dict.kpi.median_resolution_days}
        value={medDays.toFixed(1)}
        suffix={dict.kpi.days}
        accent="teal"
      />
      <KpiCard
        label={dict.kpi.avg_satisfaction}
        value={avgStar.toFixed(2)}
        suffix={dict.kpi.out_of_5}
        accent="warn"
      />
    </div>
  )
}
