'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import type { GalleryItem, Locale } from '@/lib/types'

const PAGE_SIZE = 24

type Dict = {
  gallery: {
    title: string
    subtitle: string
    filter_type: string
    filter_district: string
    all_types: string
    all_districts: string
    before: string
    after: string
    days_to_resolve: string
    days: string
    same_day: string
    no_rating: string
    load_more: string
    no_results: string
    showing: string
    photos: string
  }
}

type Props = {
  items: GalleryItem[]
  dict: Dict
  lang: Locale
}

function StarRow({ star, noRating }: { star: number | null; noRating: string }) {
  if (star === null) return <span className="text-[--color-muted] text-xs">{noRating}</span>
  const full = Math.round(star)
  return (
    <span className="text-xs text-amber-400">
      {'★'.repeat(full)}{'☆'.repeat(5 - full)}
    </span>
  )
}

function GalleryCard({ item, d }: { item: GalleryItem; d: Dict['gallery'] }) {
  const [flipped, setFlipped] = useState(false)
  const daysLabel =
    item.days_to_resolve === null
      ? null
      : item.days_to_resolve === 0
      ? d.same_day
      : `${d.days_to_resolve} ${item.days_to_resolve} ${d.days}`

  return (
    <div className="rounded-xl overflow-hidden border border-white/8 bg-[--color-surface-900] flex flex-col group">
      {/* Photo area — click to flip before/after */}
      <button
        onClick={() => setFlipped((f) => !f)}
        className="relative aspect-[4/3] w-full overflow-hidden bg-[--color-surface-800]"
        aria-label={flipped ? d.before : d.after}
      >
        <Image
          src={flipped ? item.photo_after : item.photo}
          alt={item.type}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-opacity duration-300"
          loading="lazy"
          unoptimized
        />
        {/* Badge */}
        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/60 text-white backdrop-blur-sm">
          {flipped ? d.after : d.before}
        </span>
        {/* Flip hint */}
        <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full text-[10px] bg-black/50 text-white/70 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
          {flipped ? d.before : d.after} →
        </span>
      </button>

      {/* Info */}
      <div className="px-3 py-3 flex flex-col gap-1.5 flex-1">
        <p className="text-sm font-medium text-white leading-snug line-clamp-1">{item.type}</p>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-[--color-muted]">{item.district}</span>
          <StarRow star={item.star} noRating={d.no_rating} />
        </div>
        {daysLabel && (
          <p className="text-xs text-[--color-good]">{daysLabel}</p>
        )}
      </div>
    </div>
  )
}

export default function GalleryPage({ items, dict: { gallery: d }, lang }: Props) {
  const [typeFilter, setTypeFilter] = useState('')
  const [districtFilter, setDistrictFilter] = useState('')
  const [page, setPage] = useState(1)

  const types = useMemo(() => {
    const all = [...new Set(items.map((i) => i.type))].sort()
    return all
  }, [items])

  const districts = useMemo(() => {
    const all = [...new Set(items.map((i) => i.district))].sort()
    return all
  }, [items])

  const filtered = useMemo(() => {
    let rows = items
    if (typeFilter) rows = rows.filter((i) => i.type === typeFilter)
    if (districtFilter) rows = rows.filter((i) => i.district === districtFilter)
    return rows
  }, [items, typeFilter, districtFilter])

  const visible = filtered.slice(0, page * PAGE_SIZE)
  const hasMore = visible.length < filtered.length

  function resetFilters() {
    setTypeFilter('')
    setDistrictFilter('')
    setPage(1)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">{d.title}</h1>
        <p className="mt-2 text-[--color-subtle]">{d.subtitle}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 rounded-xl bg-[--color-surface-900] border border-white/8 text-sm text-white outline-none focus:border-[--color-teal-400]/50 transition-colors min-w-[160px]"
        >
          <option value="">{d.all_types}</option>
          {types.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <select
          value={districtFilter}
          onChange={(e) => { setDistrictFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 rounded-xl bg-[--color-surface-900] border border-white/8 text-sm text-white outline-none focus:border-[--color-teal-400]/50 transition-colors min-w-[140px]"
        >
          <option value="">{d.all_districts}</option>
          {districts.map((dist) => (
            <option key={dist} value={dist}>{dist}</option>
          ))}
        </select>

        {(typeFilter || districtFilter) && (
          <button
            onClick={resetFilters}
            className="px-3 py-2 rounded-xl text-sm text-[--color-muted] hover:text-white border border-white/8 transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {/* Count */}
      <p className="text-xs text-[--color-muted]">
        {d.showing} <span className="text-white font-medium">{visible.length}</span>{' '}
        {filtered.length !== visible.length && <>/ {filtered.length} </>}
        {d.photos}
      </p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex items-center justify-center h-48 rounded-xl border border-dashed border-white/10 text-[--color-muted]">
          {d.no_results}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {visible.map((item) => (
              <GalleryCard key={item.ticket_id} item={item} d={d} />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                onClick={() => setPage((p) => p + 1)}
                className="px-6 py-2.5 rounded-xl bg-[--color-surface-900] border border-white/8 text-sm text-white hover:border-[--color-teal-400]/40 hover:text-[--color-teal-400] transition-colors"
              >
                {d.load_more}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
