import type { BudgetWithUsage } from '@/types'
import { formatAmount } from '@/lib/utils'

interface Props {
  budget: BudgetWithUsage
  onEdit: (b: BudgetWithUsage) => void
}

export default function BudgetCard({ budget, onEdit }: Props) {
  // amount가 0이면 division by zero 방지
  const pct = budget.amount > 0 ? Math.min((budget.used / budget.amount) * 100, 100) : 0
  const isOver = budget.used > budget.amount

  return (
    <div
      className="bg-white rounded-xl p-4 shadow-sm mb-3 active:bg-gray-50"
      onClick={() => onEdit(budget)}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{budget.category.icon}</span>
        <span className="font-medium text-gray-800">{budget.category.name}</span>
        <span className={`ml-auto text-sm font-semibold ${isOver ? 'text-red-500' : 'text-gray-600'}`}>
          {formatAmount(budget.used)} / {formatAmount(budget.amount)}원
        </span>
      </div>
      <div className="bg-gray-100 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${isOver ? 'bg-red-500' : 'bg-indigo-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {isOver && (
        <p className="text-xs text-red-500 mt-1">
          예산 초과 ({formatAmount(budget.used - budget.amount)}원)
        </p>
      )}
    </div>
  )
}
