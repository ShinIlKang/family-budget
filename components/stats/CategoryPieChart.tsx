'use client'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import type { Transaction, Category } from '@/types'
import { formatAmount } from '@/lib/utils'

interface Props {
  transactions: Transaction[]
  categories: Category[]
}

export default function CategoryPieChart({ transactions, categories }: Props) {
  const catMap = new Map(categories.map(c => [c.id, c]))
  const usageMap = new Map<string, number>()
  for (const t of transactions.filter(t => t.type === 'expense')) {
    if (t.category_id) {
      usageMap.set(t.category_id, (usageMap.get(t.category_id) ?? 0) + t.amount)
    }
  }
  const data = Array.from(usageMap.entries())
    .map(([id, amount]) => ({ id, amount, cat: catMap.get(id) }))
    .filter(d => d.cat)
    .sort((a, b) => b.amount - a.amount)

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl p-4 shadow-sm text-center text-gray-400 py-8">
        <p>지출 내역이 없습니다</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-600 mb-3">카테고리별 지출</h3>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie data={data} dataKey="amount" nameKey="id" cx="50%" cy="50%" outerRadius={70} label={false}>
            {data.map(d => (
              <Cell key={d.id} fill={d.cat!.color} />
            ))}
          </Pie>
          <Tooltip formatter={(v: unknown) => `${formatAmount(Number(v))}원`} />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-3 space-y-2">
        {data.map(d => (
          <div key={d.id} className="flex items-center gap-2 text-sm">
            <span>{d.cat!.icon}</span>
            <span className="text-gray-700">{d.cat!.name}</span>
            <span className="ml-auto font-medium text-gray-800">{formatAmount(d.amount)}원</span>
          </div>
        ))}
      </div>
    </div>
  )
}
