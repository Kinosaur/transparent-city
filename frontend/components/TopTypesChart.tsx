'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import type { ProblemType } from '@/lib/types'

type Props = {
  data: ProblemType[]
  dict: {
    charts: {
      top_types_title: string
      top_types_subtitle: string
      count: string
      res_rate: string
      med_days: string
    }
  }
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { name: string; value: number }[]
  label?: string
}) => {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div className="rounded-lg border border-[--color-border] bg-[--color-surface-800]/95 backdrop-blur-sm px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 font-semibold text-[--color-fg]">{label}</p>
      <p className="text-[--color-teal-400]">
        {item.name}: {item.value.toLocaleString()}
      </p>
    </div>
  )
}

export default function TopTypesChart({ data, dict }: Props) {
  const top10 = data.slice(0, 10)

  return (
    <div className="rounded-xl border border-[--color-border] bg-[--color-surface-900] px-5 pt-5 pb-3 h-full">
      <h2 className="text-sm font-semibold text-[--color-fg] mb-0.5">
        {dict.charts.top_types_title}
      </h2>
      <p className="text-xs text-[--color-muted] mb-4">{dict.charts.top_types_subtitle}</p>

      <ResponsiveContainer width="100%" height={260}>
        <BarChart
          layout="vertical"
          data={top10}
          margin={{ top: 0, right: 12, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0d" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: '#6b7280', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) =>
              v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
            }
          />
          <YAxis
            type="category"
            dataKey="type"
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={80}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff08' }} />
          <Bar dataKey="count" name={dict.charts.count} radius={[0, 3, 3, 0]}>
            {top10.map((entry, i) => (
              <Cell
                key={entry.type}
                fill={`rgba(45,212,191,${1 - i * 0.07})`}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
