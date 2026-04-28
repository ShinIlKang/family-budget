import type { FixedItem } from '@/types'
import { formatAmount } from '@/lib/utils'

interface Props {
  item: FixedItem
  onEdit: (item: FixedItem) => void
}

export default function FixedItemRow({ item, onEdit }: Props) {
  return (
    <div
      className={`flex items-center justify-between py-3 px-4 border-b border-gray-100 active:bg-gray-50 cursor-pointer${!item.is_active ? ' opacity-40' : ''}`}
      onClick={() => onEdit(item)}
    >
      <div>
        <p className="text-sm font-medium text-gray-800">{item.name}</p>
        {item.billing_day && (
          <p className="text-xs text-gray-400">매월 {item.billing_day}일</p>
        )}
      </div>
      <p className="text-sm font-semibold text-gray-700">{formatAmount(item.amount)}원</p>
    </div>
  )
}
