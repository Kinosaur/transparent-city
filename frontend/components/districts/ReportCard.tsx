'use client'

import { Share2 } from 'lucide-react'
import type { DistrictData, Locale } from '@/lib/types'
import { districtName } from '@/lib/districts-en'
import { problemTypeLabel } from '@/lib/labels'

type BkkAvg = {
  resolution_rate: number
  median_resolution_days: number
  avg_satisfaction: number
  stale_rate: number
}

type Dict = {
  districts: {
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
    grade_excellent: string
    grade_good: string
    grade_average: string
    grade_below: string
    grade_poor: string
    score_label: string
    grade_method: string
    trend_3mo: string
    stale_label: string
    comparison_subtitle: string
    bkk_prefix: string
  }
}

type Props = {
  district: DistrictData
  bkkAvg: BkkAvg
  dict: Dict
  lang: Locale
  onShare?: () => void
}

const gradeConfig: Record<string, { bg: string; border: string; text: string; bar: string; glow: string }> = {
  A: { bg: 'bg-green-400/10',  border: 'border-green-400/40',  text: 'text-green-400',          bar: 'bg-green-400',          glow: 'shadow-green-400/10' },
  B: { bg: 'bg-teal-400/10',   border: 'border-teal-400/40',   text: 'text-[--color-teal-400]', bar: 'bg-[--color-teal-400]', glow: 'shadow-teal-400/10' },
  C: { bg: 'bg-amber-400/10',  border: 'border-amber-400/40',  text: 'text-amber-400',          bar: 'bg-amber-400',          glow: 'shadow-amber-400/10' },
  D: { bg: 'bg-orange-400/10', border: 'border-orange-400/40', text: 'text-orange-400',         bar: 'bg-orange-400',         glow: 'shadow-orange-400/10' },
  F: { bg: 'bg-red-500/10',    border: 'border-red-500/40',    text: 'text-red-400',            bar: 'bg-red-400',            glow: 'shadow-red-400/10' },
}

function gradeLabel(grade: string, dict: Dict['districts']): string {
  return { A: dict.grade_excellent, B: dict.grade_good, C: dict.grade_average, D: dict.grade_below, F: dict.grade_poor }[grade] ?? ''
}

function Delta({ val, bkk, higherIsBetter = true }: { val: number | null; bkk: number; higherIsBetter?: boolean }) {
  if (val === null) return <span className="text-[--color-muted]">—</span>
  const diff = val - bkk
  const better = higherIsBetter ? diff > 0 : diff < 0
  const worse  = higherIsBetter ? diff < 0 : diff > 0
  const color  = better ? 'text-[--color-good]' : worse ? 'text-[--color-bad]' : 'text-[--color-muted]'
  const arrow  = better ? '↑' : worse ? '↓' : '→'
  const sign   = diff > 0 ? '+' : ''
  return (
    <span className={`text-xs font-medium ${color}`}>
      {arrow} {sign}{Math.abs(diff).toFixed(1)}
    </span>
  )
}

function MetricBar({
  districtVal,
  bkkVal,
  max,
  higherIsBetter,
}: {
  districtVal: number | null
  bkkVal: number
  max: number
  higherIsBetter: boolean
}) {
  if (districtVal === null || max <= 0) return null
  const dPct = Math.min(100, Math.max(0, (districtVal / max) * 100))
  const bPct = Math.min(100, Math.max(0, (bkkVal / max) * 100))
  const better = higherIsBetter ? districtVal >= bkkVal : districtVal <= bkkVal

  return (
    <div className="relative h-1.5 w-full rounded-full bg-[--color-surface-700] overflow-hidden mt-2" aria-hidden>
      {/* BKK avg marker */}
      <div
        className="absolute top-0 bottom-0 w-px bg-[--color-teal-400]/60 z-10"
        style={{ left: `${bPct}%` }}
      />
      {/* District bar */}
      <div
        className={`absolute top-0 left-0 h-full rounded-full ${better ? 'bg-[--color-good]' : 'bg-[--color-bad]'} opacity-75`}
        style={{ width: `${dPct}%` }}
      />
    </div>
  )
}

function MetricRow({
  label,
  districtVal,
  bkkVal,
  barMax,
  format,
  suffix = '',
  higherIsBetter = true,
  bkkPrefix,
}: {
  label: string
  districtVal: number | null
  bkkVal: number
  barMax?: number
  format?: (n: number) => string
  suffix?: string
  higherIsBetter?: boolean
  bkkPrefix: string
}) {
  const fmt = format ?? ((n: number) => n.toFixed(1))
  return (
    <div className="py-3 border-b border-[--color-border] last:border-0">
      <div className="flex items-center gap-4">
        <span className="flex-1 text-sm text-[--color-subtle]">{label}</span>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-[--color-muted] text-xs">
            {bkkPrefix}: <span className="text-[--color-fg]">{fmt(bkkVal)}{suffix}</span>
          </span>
          <span className="font-semibold text-[--color-fg]">
            {districtVal !== null ? `${fmt(districtVal)}${suffix}` : '—'}
          </span>
          <Delta val={districtVal} bkk={bkkVal} higherIsBetter={higherIsBetter} />
        </div>
      </div>
      {barMax !== undefined && (
        <MetricBar
          districtVal={districtVal}
          bkkVal={bkkVal}
          max={barMax}
          higherIsBetter={higherIsBetter}
        />
      )}
    </div>
  )
}

function trendArrow(trend: { total: number; resolved: number }[]): 'improving' | 'worsening' | 'stable' {
  if (trend.length < 6) return 'stable'
  const recent = trend.slice(-3)
  const prev   = trend.slice(-6, -3)
  const recentRate = recent.reduce((s, m) => s + (m.resolved / (m.total || 1)), 0) / 3
  const prevRate   = prev.reduce((s, m) => s + (m.resolved / (m.total || 1)), 0) / 3
  const diff = recentRate - prevRate
  if (diff >  0.02) return 'improving'
  if (diff < -0.02) return 'worsening'
  return 'stable'
}

const trendIcon  = { improving: '↑', worsening: '↓', stable: '→' }
const trendColor = {
  improving: 'text-[--color-good]',
  worsening: 'text-[--color-bad]',
  stable:    'text-[--color-muted]',
}

export default function ReportCard({ district: d, bkkAvg, dict, lang, onShare }: Props) {
  const g        = gradeConfig[d.grade] ?? gradeConfig['C']
  const trend    = trendArrow(d.monthly_trend)
  const staleRate = d.total_tickets > 0 ? (d.stale_tickets / d.total_tickets) * 100 : 0

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

      {/* Left — Grade + summary */}
      <div className="lg:col-span-1 space-y-4">

        {/* Grade card */}
        <div className={`rounded-xl border ${g.border} ${g.bg} px-6 py-6 flex flex-col items-center text-center gap-2 shadow-lg ${g.glow}`}>
          <p className="text-xs text-[--color-muted] uppercase tracking-widest">{dict.districts.grade_label}</p>
          <span className={`text-8xl font-black leading-none ${g.text}`}>{d.grade}</span>
          <p className={`text-sm font-medium ${g.text}`}>{gradeLabel(d.grade, dict.districts)}</p>
          {d.composite_score !== null && (
            <div className="w-full px-2 mt-1">
              <div className="flex justify-between text-xs text-[--color-muted] mb-1">
                <span>{dict.districts.score_label}</span>
                <span className={g.text}>{d.composite_score.toFixed(1)} / 100</span>
              </div>
              <div className="h-1.5 rounded-full bg-[--color-surface-700] overflow-hidden" aria-hidden>
                <div
                  className={`h-full rounded-full ${g.bar} opacity-70`}
                  style={{ width: `${d.composite_score}%` }}
                />
              </div>
            </div>
          )}
          <p className="text-[10px] text-[--color-muted] opacity-70 leading-snug px-2 mt-1">
            {dict.districts.grade_method}
          </p>
          <button
            onClick={onShare}
            className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 hover:border-cyan-500/50 text-cyan-400 font-medium text-sm transition-all duration-200 cursor-pointer"
          >
            <Share2 size={15} aria-hidden />
            {lang === 'th' ? 'แชร์เขตนี้' : 'Share'}
          </button>
        </div>

        {/* Quick stats */}
        <div className="rounded-xl border border-[--color-border] bg-[--color-surface-900] px-5 py-4 space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-[--color-muted]">{dict.districts.total_tickets}</span>
            <span className="text-[--color-fg] font-semibold tabular-nums">{d.total_tickets.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-[--color-muted]">{dict.districts.trend_3mo}</span>
            <span className={`font-semibold ${trendColor[trend]}`}>
              {trendIcon[trend]} {dict.districts[trend]}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-[--color-muted]">{dict.districts.stale_label}</span>
            <span className="text-[--color-fg] font-semibold tabular-nums">{d.stale_tickets.toLocaleString()}</span>
          </div>
        </div>

        {/* Top types */}
        <div className="rounded-xl border border-[--color-border] bg-[--color-surface-900] px-5 py-4">
          <p className="text-xs text-[--color-muted] uppercase tracking-widest mb-3">{dict.districts.top_types}</p>
          <ol className="space-y-2.5">
            {d.top_types.map((t, i) => (
              <li key={t.type} className="flex items-center gap-2 text-sm">
                <span className="w-4 shrink-0 text-[--color-muted] text-xs tabular-nums">{i + 1}.</span>
                <span className="flex-1 text-[--color-subtle] leading-snug">{problemTypeLabel(t.type, lang)}</span>
                <span className="text-[--color-fg] font-medium text-xs tabular-nums">{t.count.toLocaleString()}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Right — Comparison + stale list */}
      <div className="lg:col-span-2 space-y-6">

        {/* Comparison panel */}
        <div className="rounded-xl border border-[--color-border] bg-[--color-surface-900] px-5 py-4">
          <p className="text-sm font-semibold text-[--color-fg] mb-1">{dict.districts.vs_bkk}</p>
          <p className="text-xs text-[--color-muted] mb-4">
            {districtName(d.district, lang)} — {dict.districts.comparison_subtitle}
          </p>
          <MetricRow
            label={dict.districts.resolution_rate}
            districtVal={d.resolution_rate}
            bkkVal={bkkAvg.resolution_rate}
            barMax={100}
            format={(n) => `${n.toFixed(1)}%`}
            higherIsBetter
            bkkPrefix={dict.districts.bkk_prefix}
          />
          <MetricRow
            label={dict.districts.median_days}
            districtVal={d.median_resolution_days}
            bkkVal={bkkAvg.median_resolution_days}
            barMax={60}
            format={(n) => n.toFixed(1)}
            suffix={` ${dict.districts.days}`}
            higherIsBetter={false}
            bkkPrefix={dict.districts.bkk_prefix}
          />
          <MetricRow
            label={dict.districts.avg_satisfaction}
            districtVal={d.avg_satisfaction}
            bkkVal={bkkAvg.avg_satisfaction}
            barMax={5}
            format={(n) => `${n.toFixed(2)} / 5`}
            higherIsBetter
            bkkPrefix={dict.districts.bkk_prefix}
          />
          <MetricRow
            label={dict.districts.stale_pct}
            districtVal={staleRate}
            bkkVal={bkkAvg.stale_rate}
            barMax={50}
            format={(n) => `${n.toFixed(1)}%`}
            higherIsBetter={false}
            bkkPrefix={dict.districts.bkk_prefix}
          />
        </div>

        {/* Worst stale tickets */}
        <div className="rounded-xl border border-[--color-border] bg-[--color-surface-900] px-5 py-4">
          <p className="text-sm font-semibold text-[--color-fg] mb-4">{dict.districts.worst_stale}</p>
          {d.worst_stale.length === 0 ? (
            <p className="text-sm text-[--color-muted]">{dict.districts.no_stale}</p>
          ) : (
            <div className="space-y-3">
              {d.worst_stale.map((t) => (
                <div
                  key={t.ticket_id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-[--color-surface-800] border border-[--color-border]"
                >
                  <div className="shrink-0 rounded-md bg-[--color-bad]/10 border border-[--color-bad]/20 px-2 py-1 text-center min-w-[52px]">
                    <p className="text-lg font-bold text-[--color-bad] leading-none tabular-nums">{t.days_open}</p>
                    <p className="text-[10px] text-[--color-bad]/70">{dict.districts.days}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[--color-fg] truncate">{problemTypeLabel(t.type, lang)}</p>
                    <p className="text-xs text-[--color-muted] mt-0.5 truncate">{t.address ?? '—'}</p>
                    <p className="text-[10px] text-[--color-muted] mt-1 font-mono opacity-60">{t.ticket_id}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
