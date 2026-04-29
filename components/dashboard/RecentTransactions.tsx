import type { Transaction } from '@/types'
import { formatAmount, formatDate } from '@/lib/utils'

interface Props {
  transactions: Transaction[]
}

export default function RecentTransactions({ transactions }: Props) {
  return (
    <div className="px-4 py-3">
      <h2 className="text-sm font-semibold text-gray-500 mb-2">최근 내역</h2>
      {transactions.length === 0 ? (
        <p className="text-center text-gray-400 py-4 text-sm">내역이 없습니다</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {transactions.slice(0, 5).map(t => (
            <div key={t.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
              <span className="text-xl">{t.category?.icon ?? '📌'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{t.category?.name ?? '미분류'}</p>
                <p className="text-xs text-gray-400">{formatDate(t.date)}</p>
              </div>
              <p className={`text-sm font-semibold ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                {t.type === 'income' ? '+' : '-'}{formatAmount(t.amount)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
