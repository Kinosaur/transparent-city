'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { MonthlyTrend } from '@/lib/types'

type Props = {
  data: MonthlyTrend[]
  dict: {
    charts: {
      monthly_trend_title: string
      monthly_trend_subtitle: string
      resolved: string
      pending: string
      total: string
    }
  }
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { color: string; name: string; value: number }[]
  label?: string
}) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-white/10 bg-[#16162a] px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 font-semibold text-white">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {p.value.toLocaleString()}
        </p>
      ))}
    </div>
  )
}

export default function MonthlyChart({ data, dict }: Props) {
  return (
    <div className="rounded-xl border border-[--color-border] bg-[--color-surface-900] px-5 pt-5 pb-3">
      <h2 className="text-sm font-semibold text-white mb-0.5">
        {dict.charts.monthly_trend_title}
      </h2>
      <p className="text-xs text-[--color-muted] mb-4">{dict.charts.monthly_trend_subtitle}</p>

      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0d" vertical={false} />
          <XAxis
            dataKey="ym"
            tick={{ fill: '#6b7280', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: string) => v.slice(2)} // "2024-01" → "24-01"
            interval={2}
          />
          <YAxis
            tick={{ fill: '#6b7280', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) =>
              v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
            }
            width={36}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11, color: '#9ca3af', paddingTop: 8 }}
          />
          <Line
            type="monotone"
            dataKey="total"
            name={dict.charts.total}
            stroke="#2dd4bf"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#2dd4bf' }}
          />
          <Line
            type="monotone"
            dataKey="resolved"
            name={dict.charts.resolved}
            stroke="#4ade80"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#4ade80' }}
          />
          <Line
            type="monotone"
            dataKey="pending"
            name={dict.charts.pending}
            stroke="#f87171"
            strokeWidth={1.5}
            strokeDasharray="4 2"
            dot={false}
            activeDot={{ r: 4, fill: '#f87171' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
