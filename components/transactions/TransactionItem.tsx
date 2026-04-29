import type { Transaction } from '@/types'
import { formatAmount, formatDate } from '@/lib/utils'

interface Props {
  transaction: Transaction
  onEdit: (t: Transaction) => void
  onDelete: (id: string) => void
}

export default function TransactionItem({ transaction: t, onEdit, onDelete }: Props) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 active:bg-gray-50"
      onClick={() => onEdit(t)}
    >
      <span className="text-2xl">{t.category?.icon ?? '📌'}</span>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-800 truncate">{t.category?.name ?? '미분류'}</p>
        {t.memo && <p className="text-sm text-gray-500 truncate">{t.memo}</p>}
        <p className="text-xs text-gray-400">{formatDate(t.date)}</p>
      </div>
      <div className="text-right">
        <p className={`font-semibold ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
          {t.type === 'income' ? '+' : '-'}{formatAmount(t.amount)}원
        </p>
      </div>
      <button
        onClick={e => { e.stopPropagation(); onDelete(t.id) }}
        className="text-gray-300 hover:text-red-400 px-2 py-1"
        aria-label="삭제"
      >
        ×
      </button>
    </div>
  )
}
