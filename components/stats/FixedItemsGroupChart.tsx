'use client'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import type { FixedItem, FixedItemGroup } from '@/types'
import { formatAmount } from '@/lib/utils'

const GROUP_COLORS: Record<FixedItemGroup, string> = {
  '구독/서비스': '#8b5cf6',
  '보험/금융':   '#3b82f6',
  '공과금':      '#f59e0b',
  '통신/교통':   '#10b981',
  '주거':        '#f97316',
  '교육':        '#ec4899',
  '저축/투자':   '#6366f1',
}

interface Props {
  items: FixedItem[]
}

export default function FixedItemsGroupChart({ items }: Props) {
  const active = items.filter(i => i.is_active)

  const groupMap = new Map<FixedItemGroup, number>()
  for (const item of active) {
    groupMap.set(item.group_name, (groupMap.get(item.group_name) ?? 0) + item.amount)
  }

  const data = Array.from(groupMap.entries())
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)

  const total = data.reduce((s, d) => s + d.amount, 0)

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl p-4 shadow-sm text-center text-gray-400 py-8">
        <p>이번 달 고정비 항목이 없습니다</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-600 mb-3">그룹별 고정비</h3>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie data={data} dataKey="amount" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={false}>
            {data.map(d => (
              <Cell key={d.name} fill={GROUP_COLORS[d.name as FixedItemGroup] ?? '#9ca3af'} />
            ))}
          </Pie>
          <Tooltip formatter={(v: unknown) => `${formatAmount(Number(v))}원`} />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-3 space-y-2">
        {data.map(d => (
          <div key={d.name} className="flex items-center gap-2 text-sm">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: GROUP_COLORS[d.name as FixedItemGroup] ?? '#9ca3af' }}
            />
            <span className="text-gray-700">{d.name}</span>
            <span className="ml-auto font-medium text-gray-800">{formatAmount(d.amount)}원</span>
            <span className="text-gray-400 text-xs w-9 text-right">
              {total > 0 ? Math.round((d.amount / total) * 100) : 0}%
            </span>
          </div>
        ))}
        <div className="flex justify-between pt-2 border-t border-gray-100 text-sm font-semibold">
          <span className="text-gray-600">합계</span>
          <span className="text-indigo-600">{formatAmount(total)}원</span>
        </div>
      </div>
    </div>
  )
}
