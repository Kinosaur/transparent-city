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
    const start = performance.now()
    function tick(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
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
      {/* Glow */}
      <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-[--color-bad]/10 blur-3xl pointer-events-none" />
      <div className="relative flex flex-col sm:flex-row sm:items-center gap-3">
        <span className="text-4xl sm:text-5xl font-bold text-[--color-bad] tabular-nums leading-none">
          {formatted}
        </span>
        <div>
          <p className="text-white font-medium">{label}</p>
          <p className="text-sm text-[--color-subtle] mt-0.5">{rate}% {rateLabel}</p>
        </div>
      </div>
    </div>
  )
}
