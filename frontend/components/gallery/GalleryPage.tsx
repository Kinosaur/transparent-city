'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import type { GalleryItem, Locale } from '@/lib/types'
import { districtName } from '@/lib/districts-en'
import { problemTypeLabel } from '@/lib/labels'

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
    tap_to_compare: string
    clear_filters: string
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

function GalleryCard({ item, d, lang }: { item: GalleryItem; d: Dict['gallery']; lang: Locale }) {
  const [flipped, setFlipped] = useState(false)
  const daysLabel =
    item.days_to_resolve === null
      ? null
      : item.days_to_resolve === 0
      ? d.same_day
      : `${d.days_to_resolve} ${item.days_to_resolve} ${d.days}`

  return (
    <div className="rounded-xl overflow-hidden border border-[--color-border] bg-[--color-surface-900] flex flex-col group">
      {/* Photo area — click to flip before/after */}
      <button
        onClick={() => setFlipped((f) => !f)}
        className="relative aspect-[4/3] w-full overflow-hidden bg-[--color-surface-800]"
        aria-label={`${d.tap_to_compare}: ${flipped ? d.after : d.before}, ${problemTypeLabel(item.type, lang)}, ${districtName(item.district, lang)}`}
      >
        <Image
          src={flipped ? item.photo_after : item.photo}
          alt={`${flipped ? d.after : d.before}: ${problemTypeLabel(item.type, lang)} — ${districtName(item.district, lang)}`}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-opacity duration-300"
          loading="lazy"
          unoptimized
        />
        {/* Badge */}
        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/60 text-[--color-fg] backdrop-blur-sm">
          {flipped ? d.after : d.before}
        </span>
        {/* Flip hint */}
        <span className="absolute bottom-2 right-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-[--color-fg]/80 backdrop-blur-sm opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
          {d.tap_to_compare}
        </span>
      </button>

      {/* Info */}
      <div className="px-3 py-3 flex flex-col gap-1.5 flex-1">
        <p className="text-sm font-medium text-[--color-fg] leading-snug line-clamp-1">{problemTypeLabel(item.type, lang)}</p>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-[--color-muted]">{districtName(item.district, lang)}</span>
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
        <h1 className="text-3xl sm:text-4xl font-bold text-[--color-fg] tracking-tight">{d.title}</h1>
        <p className="mt-2 text-[--color-subtle]">{d.subtitle}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <label className="sr-only" htmlFor="gallery-type-filter">{d.filter_type}</label>
        <select
          id="gallery-type-filter"
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}
          className="min-h-11 w-full rounded-xl border border-[--color-border] bg-[--color-surface-900] px-3 py-2 text-sm text-[--color-fg] outline-none transition-colors focus:border-[--color-teal-400]/50 sm:w-auto sm:min-w-[160px]"
        >
          <option value="">{d.all_types}</option>
          {types.map((t) => (
            <option key={t} value={t}>{problemTypeLabel(t, lang)}</option>
          ))}
        </select>

        <label className="sr-only" htmlFor="gallery-district-filter">{d.filter_district}</label>
        <select
          id="gallery-district-filter"
          value={districtFilter}
          onChange={(e) => { setDistrictFilter(e.target.value); setPage(1) }}
          className="min-h-11 w-full rounded-xl border border-[--color-border] bg-[--color-surface-900] px-3 py-2 text-sm text-[--color-fg] outline-none transition-colors focus:border-[--color-teal-400]/50 sm:w-auto sm:min-w-[160px]"
        >
          <option value="">{d.all_districts}</option>
          {districts.map((dist) => (
            <option key={dist} value={dist}>{districtName(dist, lang)}</option>
          ))}
        </select>

        {(typeFilter || districtFilter) && (
          <button
            onClick={resetFilters}
            className="min-h-11 min-w-11 rounded-xl border border-[--color-border] px-3 py-2 text-sm text-[--color-muted] transition-colors hover:text-[--color-fg]"
            aria-label={d.clear_filters}
          >
            ✕
          </button>
        )}
      </div>

      {/* Count */}
      <p className="text-xs text-[--color-muted]">
        {d.showing} <span className="text-[--color-fg] font-medium">{visible.length}</span>{' '}
        {filtered.length !== visible.length && <>/ {filtered.length} </>}
        {d.photos}
      </p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex items-center justify-center h-48 rounded-xl border border-dashed border-[--color-border-hover] text-[--color-muted]">
          {d.no_results}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {visible.map((item) => (
              <GalleryCard key={item.ticket_id} item={item} d={d} lang={lang} />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                onClick={() => setPage((p) => p + 1)}
                className="px-6 py-2.5 rounded-xl bg-[--color-surface-900] border border-[--color-border] text-sm text-[--color-fg] hover:border-[--color-teal-400]/40 hover:text-[--color-teal-400] transition-colors"
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
