'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { MonthYear } from '@/types'
import { formatAmount } from '@/lib/utils'

interface DataPoint extends MonthYear {
  income: number
  expense: number
}

interface Props {
  data: DataPoint[]
}

function formatYAxis(value: number) {
  if (value >= 10000) return `${Math.floor(value / 10000)}만`
  return String(value)
}

export default function MonthlyBarChart({ data }: Props) {
  const formatted = data.map(d => ({
    name: `${d.month}월`,
    수입: d.income,
    지출: d.expense,
  }))

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
      <h3 className="text-sm font-semibold text-gray-600 mb-3">월별 수입/지출</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={formatted} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 10 }} width={40} />
          <Tooltip formatter={(v: unknown) => `${formatAmount(Number(v))}원`} />
          <Legend />
          <Bar dataKey="수입" fill="#10b981" radius={[4, 4, 0, 0] as [number, number, number, number]} />
          <Bar dataKey="지출" fill="#ef4444" radius={[4, 4, 0, 0] as [number, number, number, number]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
