import type { Transaction } from '@/types'
import TransactionItem from './TransactionItem'

interface Props {
  transactions: Transaction[]
  onEdit: (t: Transaction) => void
  onDelete: (id: string) => void
}

export default function TransactionList({ transactions, onEdit, onDelete }: Props) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-4xl mb-2">📭</p>
        <p>내역이 없습니다</p>
      </div>
    )
  }
  return (
    <div>
      {transactions.map(t => (
        <TransactionItem key={t.id} transaction={t} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  )
}
