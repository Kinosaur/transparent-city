'use client'

import { useState, useMemo } from 'react'
import type { OrgData, Locale } from '@/lib/types'
import { organizationLabel } from '@/lib/labels'

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
}: {
  val: number | null
  bkk: number
  higherIsBetter: boolean
  suffix?: string
}) {
  if (val === null) return <span className="text-[--color-muted] text-xs">—</span>
  const diff = val - bkk
  const better = higherIsBetter ? diff > 0 : diff < 0
  const worse  = higherIsBetter ? diff < 0 : diff > 0
  const color  = better ? 'text-[--color-good]' : worse ? 'text-[--color-bad]' : 'text-[--color-muted]'
  const sign   = diff > 0 ? '+' : ''
  return (
    <span className={`text-xs ${color}`}>
      {sign}{Math.abs(diff).toFixed(1)}{suffix}
    </span>
  )
}

function SortIcon({ active, asc }: { active: boolean; asc: boolean }) {
  return (
    <span className="inline-flex flex-col ml-1 gap-[1px] translate-y-[1px]" aria-hidden>
      <svg width="7" height="5" viewBox="0 0 7 5" className={active && asc ? 'opacity-100' : 'opacity-30'}>
        <path d="M3.5 0L7 5H0L3.5 0Z" fill="currentColor" />
      </svg>
      <svg width="7" height="5" viewBox="0 0 7 5" className={active && !asc ? 'opacity-100' : 'opacity-30'}>
        <path d="M3.5 5L0 0H7L3.5 5Z" fill="currentColor" />
      </svg>
    </span>
  )
}

function SortTh({
  col,
  label,
  sortKey,
  sortAsc,
  onSort,
}: {
  col: SortKey
  label: string
  sortKey: SortKey
  sortAsc: boolean
  onSort: (key: SortKey) => void
}) {
  const active = sortKey === col
  return (
    <th
      className="p-0 text-right text-xs font-medium uppercase tracking-wider whitespace-nowrap"
      aria-sort={active ? (sortAsc ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={() => onSort(col)}
        className={`w-full px-3 py-3 cursor-pointer select-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[--color-teal-400] ${
          active ? 'text-[--color-teal-400]' : 'text-[--color-muted] hover:text-[--color-fg]'
        }`}
      >
        {label}
        <SortIcon active={active} asc={sortAsc} />
      </button>
    </th>
  )
}

const MIN_TICKET_OPTIONS = [100, 500, 1000, 5000]

export default function LeaderboardPage({ orgs, bkkAvg, dict: { leaderboard: d }, lang }: Props) {
  const [query,      setQuery]      = useState('')
  const [minTickets, setMinTickets] = useState(100)
  const [sortKey,    setSortKey]    = useState<SortKey>('total_tickets')
  const [sortAsc,    setSortAsc]    = useState(false)

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
      rows = rows.filter((o) => organizationLabel(o.organization, lang).toLowerCase().includes(q))
    }
    rows = [...rows].sort((a, b) => {
      const av = a[sortKey] ?? -Infinity
      const bv = b[sortKey] ?? -Infinity
      return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number)
    })
    return rows
  }, [orgs, query, minTickets, sortKey, sortAsc, lang])

  const maxResRate = Math.max(...orgs.map((o) => o.resolution_rate ?? 0))

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
          className="flex-1 px-4 py-2.5 rounded-xl bg-[--color-surface-900] border border-[--color-border] text-[--color-fg] placeholder:text-[--color-muted] text-sm outline-none focus-visible:border-[--color-teal-400]/50 focus-visible:ring-2 focus-visible:ring-[--color-teal-400]/20 transition-colors"
          aria-label={d.search_placeholder}
        />
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-[--color-muted] whitespace-nowrap">{d.min_tickets_label}:</span>
          <div className="flex gap-1" role="group" aria-label={d.min_tickets_label}>
            {MIN_TICKET_OPTIONS.map((n) => (
              <button
                key={n}
                onClick={() => setMinTickets(n)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  minTickets === n
                    ? 'bg-[--color-teal-400]/15 text-[--color-teal-400] border border-[--color-teal-400]/30'
                    : 'bg-[--color-surface-900] text-[--color-muted] border border-[--color-border] hover:text-[--color-fg] hover:border-[--color-border-hover]'
                }`}
                aria-pressed={minTickets === n}
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
          <table className="w-full min-w-[640px]" role="grid">
            <thead>
              <tr className="border-b border-[--color-border]">
                <th className="px-4 py-3 text-left text-xs font-medium text-[--color-muted] uppercase tracking-wider w-8">#</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-[--color-muted] uppercase tracking-wider">{d.org_name}</th>
                <SortTh col="total_tickets" label={d.total_tickets} sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
                <SortTh col="resolution_rate" label={d.resolution_rate} sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
                <SortTh col="median_resolution_days" label={d.median_days} sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
                <SortTh col="avg_satisfaction" label={d.avg_satisfaction} sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
                <SortTh col="reopen_rate" label={d.reopen_rate} sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} />
              </tr>
              {/* BKK avg reference row */}
              <tr className="border-b border-[--color-border] bg-[--color-teal-400]/5">
                <td className="px-4 py-2" />
                <td className="px-3 py-2 text-left text-xs text-[--color-teal-400] font-medium">{d.bkk_avg}</td>
                <td className="px-3 py-2 text-right text-xs text-[--color-teal-400]">—</td>
                <td className="px-3 py-2 text-right text-xs text-[--color-teal-400]">{bkkAvg.resolution_rate.toFixed(1)}%</td>
                <td className="px-3 py-2 text-right text-xs text-[--color-teal-400]">{bkkAvg.median_resolution_days.toFixed(1)}</td>
                <td className="px-3 py-2 text-right text-xs text-[--color-teal-400]">{bkkAvg.avg_satisfaction.toFixed(2)}</td>
                <td className="px-3 py-2 text-right text-xs text-[--color-teal-400]">{bkkAvg.reopen_rate.toFixed(1)}%</td>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <p className="text-sm text-[--color-muted]">{d.no_results}</p>
                  </td>
                </tr>
              ) : (
                filtered.map((org, i) => (
                  <tr
                    key={org.organization}
                    className="border-b border-[--color-border] last:border-0 hover:bg-white/3 transition-colors"
                  >
                    <td className="px-4 py-3 text-xs text-[--color-muted] tabular-nums">{i + 1}</td>
                    <td className="px-3 py-3 text-sm text-[--color-subtle] max-w-[220px]">
                      <span className="line-clamp-2 leading-snug">{organizationLabel(org.organization, lang)}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-sm font-medium text-[--color-fg] tabular-nums">
                        {org.total_tickets.toLocaleString()}
                      </span>
                    </td>
                    {/* Resolution rate with inline bar */}
                    <td className="px-3 py-3 text-right">
                      <div className="text-sm font-medium text-[--color-fg] tabular-nums">
                        {org.resolution_rate !== null ? `${org.resolution_rate.toFixed(1)}%` : '—'}
                      </div>
                      {org.resolution_rate !== null && (
                        <div className="mt-1 h-1 rounded-full bg-[--color-surface-700] overflow-hidden w-16 ml-auto" aria-hidden>
                          <div
                            className={`h-full rounded-full ${
                              org.resolution_rate >= bkkAvg.resolution_rate ? 'bg-[--color-good]' : 'bg-[--color-bad]'
                            } opacity-70`}
                            style={{ width: `${Math.min(100, (org.resolution_rate / Math.max(maxResRate, 1)) * 100)}%` }}
                          />
                        </div>
                      )}
                      <DeltaBadge val={org.resolution_rate} bkk={bkkAvg.resolution_rate} higherIsBetter suffix="%" />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="text-sm font-medium text-[--color-fg] tabular-nums">
                        {org.median_resolution_days !== null ? org.median_resolution_days.toFixed(1) : '—'}
                      </div>
                      <DeltaBadge val={org.median_resolution_days} bkk={bkkAvg.median_resolution_days} higherIsBetter={false} suffix={` ${d.days}`} />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="text-sm font-medium text-[--color-fg] tabular-nums">
                        {org.avg_satisfaction !== null ? org.avg_satisfaction.toFixed(2) : '—'}
                      </div>
                      <DeltaBadge val={org.avg_satisfaction} bkk={bkkAvg.avg_satisfaction} higherIsBetter />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="text-sm font-medium text-[--color-fg] tabular-nums">
                        {org.reopen_rate !== null ? `${org.reopen_rate.toFixed(1)}%` : '—'}
                      </div>
                      <DeltaBadge val={org.reopen_rate} bkk={bkkAvg.reopen_rate} higherIsBetter={false} suffix="%" />
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
