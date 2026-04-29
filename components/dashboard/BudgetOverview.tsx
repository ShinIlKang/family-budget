import type { BudgetWithUsage } from '@/types'
import { formatAmount } from '@/lib/utils'

interface Props {
  budgets: BudgetWithUsage[]
}

export default function BudgetOverview({ budgets }: Props) {
  if (budgets.length === 0) return null
  const total = budgets.reduce((a, b) => a + b.amount, 0)
  const used = budgets.reduce((a, b) => a + b.used, 0)
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0

  return (
    <div className="px-4 py-3 bg-white border-b border-gray-100">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600">이번 달 예산</span>
        <span className="text-gray-800 font-medium">{formatAmount(used)} / {formatAmount(total)}원</span>
      </div>
      <div className="bg-gray-100 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${pct >= 100 ? 'bg-red-500' : 'bg-indigo-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
