'use client'

import { useState, useMemo } from 'react'
import type { OrgData, Locale } from '@/lib/types'

type BkkAvg = {
  resolution_rate: number
  median_resolution_days: number
  avg_satisfaction: number
  reopen_rate: number
}

type Dict = {
  leaderboard: {
    title: string
    subtitle: string
    search_placeholder: string
    min_tickets_label: string
    org_name: string
    total_tickets: string
    resolution_rate: string
    median_days: string
    avg_satisfaction: string
    reopen_rate: string
    bkk_avg: string
    no_results: string
    showing: string
    of: string
    agencies: string
    days: string
    above_avg: string
    below_avg: string
  }
}

type SortKey = 'total_tickets' | 'resolution_rate' | 'median_resolution_days' | 'avg_satisfaction' | 'reopen_rate'

type Props = {
  orgs: OrgData[]
  bkkAvg: BkkAvg
  dict: Dict
  lang: Locale
}

function DeltaBadge({
  val,
  bkk,
  higherIsBetter,
  suffix,
  d,
}: {
  val: number | null
  bkk: number
  higherIsBetter: boolean
  suffix?: string
  d: Dict['leaderboard']
}) {
  if (val === null) return <span className="text-[--color-muted] text-xs">—</span>
  const diff = val - bkk
  const better = higherIsBetter ? diff > 0 : diff < 0
  const worse = higherIsBetter ? diff < 0 : diff > 0
  const color = better ? 'text-[--color-good]' : worse ? 'text-[--color-bad]' : 'text-[--color-muted]'
  const sign = diff > 0 ? '+' : ''
  return (
    <span className={`text-xs ${color}`}>
      {sign}{Math.abs(diff).toFixed(1)}{suffix}
    </span>
  )
}

const MIN_TICKET_OPTIONS = [100, 500, 1000, 5000]

export default function LeaderboardPage({ orgs, bkkAvg, dict: { leaderboard: d }, lang }: Props) {
  const [query, setQuery] = useState('')
  const [minTickets, setMinTickets] = useState(100)
  const [sortKey, setSortKey] = useState<SortKey>('total_tickets')
  const [sortAsc, setSortAsc] = useState(false)

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc((a) => !a)
    } else {
      setSortKey(key)
      setSortAsc(key === 'median_resolution_days' || key === 'reopen_rate')
    }
  }

  const filtered = useMemo(() => {
    let rows = orgs.filter((o) => o.total_tickets >= minTickets)
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      rows = rows.filter((o) => o.organization.toLowerCase().includes(q))
    }
    rows = [...rows].sort((a, b) => {
      const av = a[sortKey] ?? -Infinity
      const bv = b[sortKey] ?? -Infinity
      return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number)
    })
    return rows
  }, [orgs, query, minTickets, sortKey, sortAsc])

  function SortHeader({ col, label }: { col: SortKey; label: string }) {
    const active = sortKey === col
    const arrow = active ? (sortAsc ? ' ↑' : ' ↓') : ''
    return (
      <th
        onClick={() => handleSort(col)}
        className={`px-3 py-3 text-right text-xs font-medium uppercase tracking-wider cursor-pointer select-none whitespace-nowrap transition-colors ${
          active ? 'text-[--color-teal-400]' : 'text-[--color-muted] hover:text-[--color-fg]'
        }`}
      >
        {label}{arrow}
      </th>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold text-[--color-fg] tracking-tight">{d.title}</h1>
        <p className="mt-2 text-[--color-subtle]">{d.subtitle}</p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={d.search_placeholder}
          className="flex-1 px-4 py-2.5 rounded-xl bg-[--color-surface-900] border border-[--color-border] text-[--color-fg] placeholder-[--color-muted] text-sm outline-none focus:border-[--color-teal-400]/50 transition-colors"
        />
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-[--color-muted] whitespace-nowrap">{d.min_tickets_label}:</span>
          <div className="flex gap-1">
            {MIN_TICKET_OPTIONS.map((n) => (
              <button
                key={n}
                onClick={() => setMinTickets(n)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  minTickets === n
                    ? 'bg-[--color-teal-400]/15 text-[--color-teal-400] border border-[--color-teal-400]/30'
                    : 'bg-[--color-surface-900] text-[--color-muted] border border-[--color-border] hover:text-[--color-fg]'
                }`}
              >
                {n >= 1000 ? `${n / 1000}k+` : `${n}+`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Count */}
      <p className="text-xs text-[--color-muted]">
        {d.showing} <span className="text-[--color-fg] font-medium">{filtered.length.toLocaleString()}</span> {d.of}{' '}
        {orgs.filter((o) => o.total_tickets >= minTickets).length.toLocaleString()} {d.agencies}
      </p>

      {/* Table */}
      <div className="rounded-xl border border-[--color-border] bg-[--color-surface-900] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-[--color-border]">
                <th className="px-4 py-3 text-left text-xs font-medium text-[--color-muted] uppercase tracking-wider w-8">#</th>
                <SortHeader col="total_tickets" label={d.org_name} />
                <SortHeader col="total_tickets" label={d.total_tickets} />
                <SortHeader col="resolution_rate" label={d.resolution_rate} />
                <SortHeader col="median_resolution_days" label={d.median_days} />
                <SortHeader col="avg_satisfaction" label={d.avg_satisfaction} />
                <SortHeader col="reopen_rate" label={d.reopen_rate} />
              </tr>
              {/* BKK avg reference row */}
              <tr className="border-b border-[--color-border] bg-[--color-teal-400]/5">
                <td className="px-4 py-2" />
                <td className="px-3 py-2 text-right text-xs text-[--color-teal-400] font-medium" colSpan={2}>
                  {d.bkk_avg}
                </td>
                <td className="px-3 py-2 text-right text-xs text-[--color-teal-400]">{bkkAvg.resolution_rate.toFixed(1)}%</td>
                <td className="px-3 py-2 text-right text-xs text-[--color-teal-400]">{bkkAvg.median_resolution_days.toFixed(1)}</td>
                <td className="px-3 py-2 text-right text-xs text-[--color-teal-400]">{bkkAvg.avg_satisfaction.toFixed(2)}</td>
                <td className="px-3 py-2 text-right text-xs text-[--color-teal-400]">{bkkAvg.reopen_rate.toFixed(1)}%</td>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-[--color-muted]">
                    {d.no_results}
                  </td>
                </tr>
              ) : (
                filtered.map((org, i) => (
                  <tr
                    key={org.organization}
                    className="border-b border-[--color-border] hover:bg-white/3 transition-colors"
                  >
                    <td className="px-4 py-3 text-xs text-[--color-muted] tabular-nums">{i + 1}</td>
                    <td className="px-3 py-3 text-sm text-[--color-subtle] max-w-[260px]" colSpan={2}>
                      <span className="line-clamp-2 leading-snug">{org.organization}</span>
                      <span className="text-xs text-[--color-muted] mt-0.5 block">
                        {org.total_tickets.toLocaleString()} {d.total_tickets.toLowerCase()}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="text-sm font-medium text-[--color-fg]">
                        {org.resolution_rate !== null ? `${org.resolution_rate.toFixed(1)}%` : '—'}
                      </div>
                      <DeltaBadge val={org.resolution_rate} bkk={bkkAvg.resolution_rate} higherIsBetter suffix="%" d={d} />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="text-sm font-medium text-[--color-fg]">
                        {org.median_resolution_days !== null ? org.median_resolution_days.toFixed(1) : '—'}
                      </div>
                      <DeltaBadge val={org.median_resolution_days} bkk={bkkAvg.median_resolution_days} higherIsBetter={false} suffix={` ${d.days}`} d={d} />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="text-sm font-medium text-[--color-fg]">
                        {org.avg_satisfaction !== null ? org.avg_satisfaction.toFixed(2) : '—'}
                      </div>
                      <DeltaBadge val={org.avg_satisfaction} bkk={bkkAvg.avg_satisfaction} higherIsBetter d={d} />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="text-sm font-medium text-[--color-fg]">
                        {org.reopen_rate !== null ? `${org.reopen_rate.toFixed(1)}%` : '—'}
                      </div>
                      <DeltaBadge val={org.reopen_rate} bkk={bkkAvg.reopen_rate} higherIsBetter={false} suffix="%" d={d} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
