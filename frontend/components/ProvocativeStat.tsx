'use client'

import { useEffect, useRef, useState } from 'react'
import type { Locale } from '@/lib/types'

type Props = {
  count: number
  label: string
  rateLabel: string
  rate: number
  lang: Locale
}

function useCountUp(target: number, duration = 1400) {
  const [value, setValue] = useState(0)
  const frame = useRef<number | null>(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      frame.current = requestAnimationFrame(() => setValue(target))
      return () => { if (frame.current) cancelAnimationFrame(frame.current) }
    }
    const start = performance.now()
    function tick(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * target))
      if (progress < 1) frame.current = requestAnimationFrame(tick)
    }
    frame.current = requestAnimationFrame(tick)
    return () => { if (frame.current) cancelAnimationFrame(frame.current) }
  }, [target, duration])

  return value
}

export default function ProvocativeStat({ count, label, rateLabel, rate, lang }: Props) {
  const displayed = useCountUp(count)
  const formatted =
    lang === 'th'
      ? displayed.toLocaleString('th-TH')
      : displayed.toLocaleString('en-US')

  return (
    <div className="relative overflow-hidden rounded-xl border border-[--color-bad]/30 bg-[--color-bad]/5 px-6 py-5">
      {/* Ambient glow */}
      <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-[--color-bad]/10 blur-3xl pointer-events-none" aria-hidden />

      <div className="relative flex flex-col sm:flex-row sm:items-center gap-3">
        <span className="text-4xl sm:text-5xl font-bold text-[--color-bad] tabular-nums leading-none">
          {formatted}
        </span>
        <div className="flex-1">
          <p className="text-[--color-fg] font-medium">{label}</p>
          <p className="text-sm text-[--color-subtle] mt-0.5">{rate}% {rateLabel}</p>

          {/* Visual stale rate bar */}
          <div className="mt-2.5 h-1.5 rounded-full bg-[--color-surface-700] overflow-hidden max-w-xs" role="progressbar" aria-valuenow={rate} aria-valuemin={0} aria-valuemax={100} aria-label={`${rate}% stale rate`}>
            <div
              className="h-full rounded-full bg-[--color-bad] opacity-70"
              style={{ width: `${Math.min(100, rate)}%`, transition: 'width 1.4s cubic-bezier(0.16, 1, 0.3, 1)' }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
