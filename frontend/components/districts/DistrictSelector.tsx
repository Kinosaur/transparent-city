'use client'

import { useState, useRef, useEffect } from 'react'
import type { DistrictData, Locale } from '@/lib/types'
import { districtName } from '@/lib/districts-en'

type Props = {
  districts: DistrictData[]
  selected: DistrictData | null
  onSelect: (d: DistrictData) => void
  placeholder: string
  lang: Locale
}

const gradeColor: Record<string, string> = {
  A: 'text-[--color-good]',
  B: 'text-[--color-teal-400]',
  C: 'text-[--color-warn]',
  D: 'text-orange-400',
  F: 'text-[--color-bad]',
}

export default function DistrictSelector({ districts, selected, onSelect, placeholder, lang }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const filtered = query
    ? districts.filter((d) =>
        d.district.includes(query) ||
        districtName(d.district, lang).toLowerCase().includes(query.toLowerCase())
      )
    : districts

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative w-full max-w-sm">
      {/* Trigger */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-[--color-border] bg-[--color-surface-900] hover:border-[--color-border-hover] transition-colors text-left"
      >
        <span className={selected ? 'text-white font-medium' : 'text-[--color-muted]'}>
          {selected ? districtName(selected.district, lang) : placeholder}
        </span>
        {selected && (
          <span className={`text-xs font-bold ${gradeColor[selected.grade] ?? ''}`}>
            {selected.grade}
          </span>
        )}
        <svg
          className={`w-4 h-4 text-[--color-muted] transition-transform ml-auto ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-2 w-full rounded-xl border border-white/10 bg-[#16162a] shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden">
          {/* Search */}
          <div className="px-3 py-2 border-b border-white/10 bg-[#16162a]">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหาเขต..."
              className="w-full bg-transparent text-sm text-white placeholder-zinc-500 outline-none"
            />
          </div>
          {/* List */}
          <ul className="max-h-72 overflow-y-auto py-1 bg-[#16162a]">
            {filtered.map((d) => (
              <li key={d.district}>
                <button
                  onClick={() => { onSelect(d); setOpen(false); setQuery('') }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-white/8 transition-colors ${
                    selected?.district === d.district
                      ? 'text-[--color-teal-400]'
                      : 'text-[--color-subtle]'
                  }`}
                >
                  <span>{districtName(d.district, lang)}</span>
                  <div className="flex items-center gap-3 text-xs text-[--color-muted]">
                    <span>{d.total_tickets.toLocaleString()}</span>
                    <span className={`font-bold ${gradeColor[d.grade] ?? ''}`}>{d.grade}</span>
                  </div>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-4 py-3 text-sm text-[--color-muted]">ไม่พบเขตที่ค้นหา</li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
