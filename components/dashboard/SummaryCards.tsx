import { formatAmount } from '@/lib/utils'

interface Props {
  income: number
  expense: number
}

export default function SummaryCards({ income, expense }: Props) {
  const balance = income - expense
  return (
    <div className="bg-indigo-600 px-4 py-5 text-white">
      <div className="text-center mb-4">
        <p className="text-indigo-200 text-sm">이번 달 잔액</p>
        <p className="text-3xl font-bold">{formatAmount(balance)}원</p>
      </div>
      <div className="flex gap-3">
        <div className="flex-1 bg-white/10 rounded-xl p-3 text-center">
          <p className="text-indigo-200 text-xs mb-1">수입</p>
          <p className="font-semibold text-green-300">+{formatAmount(income)}</p>
        </div>
        <div className="flex-1 bg-white/10 rounded-xl p-3 text-center">
          <p className="text-indigo-200 text-xs mb-1">지출</p>
          <p className="font-semibold text-red-300">-{formatAmount(expense)}</p>
        </div>
      </div>
    </div>
  )
}
