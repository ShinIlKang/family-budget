'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { MonthYear } from '@/types'
import { formatAmount } from '@/lib/utils'

interface DataPoint extends MonthYear {
  total: number
}

interface Props {
  data: DataPoint[]
  currentMonth: MonthYear
}

function formatYAxis(value: number) {
  if (value >= 10000) return `${Math.floor(value / 10000)}만`
  return String(value)
}

export default function FixedMonthlyTrendChart({ data, currentMonth }: Props) {
  const formatted = data.map(d => ({
    name: `${d.month}월`,
    total: d.total,
    isCurrent: d.year === currentMonth.year && d.month === currentMonth.month,
  }))

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-600 mb-3">월별 고정비 추이</h3>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={formatted} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 10 }} width={40} />
          <Tooltip formatter={(v: unknown) => `${formatAmount(Number(v))}원`} />
          <Bar dataKey="total" name="고정비" radius={[4, 4, 0, 0] as [number, number, number, number]}>
            {formatted.map((d, i) => (
              <Cell key={i} fill={d.isCurrent ? '#6366f1' : '#c7d2fe'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
