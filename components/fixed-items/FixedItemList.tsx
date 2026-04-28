'use client'
import { useState } from 'react'
import type { FixedItem, FixedItemGroup } from '@/types'
import { FIXED_ITEM_GROUPS } from '@/types'
import { formatAmount } from '@/lib/utils'
import FixedItemRow from './FixedItemRow'

interface Props {
  items: FixedItem[]
  onEdit: (item: FixedItem) => void
}

const ALL_TAB = '전체' as const

export default function FixedItemList({ items, onEdit }: Props) {
  const [activeTab, setActiveTab] = useState<FixedItemGroup | typeof ALL_TAB>(ALL_TAB)

  const filtered = activeTab === ALL_TAB ? items : items.filter(i => i.group_name === activeTab)
  const activeTotal = items.filter(i => i.is_active).reduce((s, i) => s + i.amount, 0)

  return (
    <div className="flex flex-col h-full">
      <div className="flex overflow-x-auto border-b border-gray-200 bg-white">
        {([ALL_TAB, ...FIXED_ITEM_GROUPS] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-shrink-0 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto bg-white">
        {filtered.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-12">항목이 없습니다</p>
        ) : (
          filtered.map(item => (
            <FixedItemRow key={item.id} item={item} onEdit={onEdit} />
          ))
        )}
      </div>
      <div className="border-t border-gray-200 bg-white px-4 py-3 flex justify-between items-center flex-shrink-0">
        <span className="text-sm text-gray-500">활성 항목 합계</span>
        <span className="text-base font-bold text-indigo-600">{formatAmount(activeTotal)}원</span>
      </div>
    </div>
  )
}
