'use client'

import { useEffect, useRef, useState } from 'react'
import type { OverviewData, Locale } from '@/lib/types'

function useCountUp(target: number, decimals = 0, duration = 1200) {
  const [value, setValue] = useState(0)
  const frame = useRef<number | null>(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(target)
      return
    }
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

const accentMap = {
  teal: { text: 'text-[--color-teal-400]', bar: 'bg-[--color-teal-400]' },
  good: { text: 'text-[--color-good]',     bar: 'bg-[--color-good]' },
  bad:  { text: 'text-[--color-bad]',      bar: 'bg-[--color-bad]' },
  warn: { text: 'text-[--color-warn]',     bar: 'bg-[--color-warn]' },
}

function KpiCard({
  label,
  value,
  suffix,
  accent,
  icon,
  progress,
}: {
  label: string
  value: string
  suffix?: string
  accent?: keyof typeof accentMap
  icon: React.ReactNode
  progress?: number
}) {
  const colors = accent ? accentMap[accent] : { text: 'text-[--color-fg]', bar: 'bg-[--color-fg]' }

  return (
    <div className="rounded-xl border border-[--color-border] bg-[--color-surface-900] px-5 py-5 flex flex-col gap-2.5 hover:border-[--color-border-hover] transition-colors group">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-[--color-muted] uppercase tracking-wider font-medium leading-tight">{label}</p>
        <span className={`shrink-0 ${colors.text} opacity-50 group-hover:opacity-100 transition-opacity duration-200`}>
          {icon}
        </span>
      </div>
      <p className={`text-3xl font-bold tabular-nums leading-none ${colors.text}`}>
        {value}
        {suffix && <span className="text-base font-normal text-[--color-subtle] ml-1">{suffix}</span>}
      </p>
      {progress !== undefined && (
        <div
          className="h-1 rounded-full bg-[--color-surface-700] overflow-hidden"
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={`h-full rounded-full ${colors.bar} opacity-70`}
            style={{
              width: `${Math.min(100, Math.max(0, progress))}%`,
              transition: 'width 1.4s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />
        </div>
      )}
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
  const total   = useCountUp(data.total_tickets, 0)
  const resRate = useCountUp(data.resolution_rate, 1)
  const medDays = useCountUp(data.median_resolution_days, 1)
  const avgStar = useCountUp(data.avg_satisfaction, 2)

  const fmt = (n: number) =>
    lang === 'th'
      ? Math.round(n).toLocaleString('th-TH')
      : Math.round(n).toLocaleString('en-US')

  // Progress values (all 0–100)
  const resProgress  = resRate                              // already %
  const daysProgress = Math.max(0, 100 - (medDays / 30) * 100) // 0 days = 100, 30 days = 0
  const starProgress = (avgStar / 5) * 100

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard
        label={dict.kpi.total_tickets}
        value={fmt(total)}
        accent="teal"
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden>
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        }
      />
      <KpiCard
        label={dict.kpi.resolution_rate}
        value={`${resRate.toFixed(1)}%`}
        accent="good"
        progress={resProgress}
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden>
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
      />
      <KpiCard
        label={dict.kpi.median_resolution_days}
        value={medDays.toFixed(1)}
        suffix={dict.kpi.days}
        accent="teal"
        progress={daysProgress}
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
        }
      />
      <KpiCard
        label={dict.kpi.avg_satisfaction}
        value={avgStar.toFixed(2)}
        suffix={dict.kpi.out_of_5}
        accent="warn"
        progress={starProgress}
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden>
            <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        }
      />
    </div>
  )
}
