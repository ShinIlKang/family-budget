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

export default function FixedItemList({ items, onEdit }: Props) {
  const [openGroups, setOpenGroups] = useState<Set<FixedItemGroup>>(
    new Set(FIXED_ITEM_GROUPS)
  )

  const activeTotal = items.filter(i => i.is_active).reduce((s, i) => s + i.amount, 0)

  function toggleGroup(group: FixedItemGroup) {
    setOpenGroups(prev => {
      const next = new Set(prev)
      if (next.has(group)) next.delete(group)
      else next.add(group)
      return next
    })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        {FIXED_ITEM_GROUPS.map(group => {
          const groupItems = items.filter(i => i.group_name === group)
          if (groupItems.length === 0) return null

          const groupTotal = groupItems.filter(i => i.is_active).reduce((s, i) => s + i.amount, 0)
          const isOpen = openGroups.has(group)

          return (
            <div key={group}>
              <button
                type="button"
                onClick={() => toggleGroup(group)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100 active:bg-gray-100"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-700">{group}</span>
                  <span className="text-xs text-gray-400">{groupItems.length}개</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-indigo-600">{formatAmount(groupTotal)}원</span>
                  <span className="text-xs text-gray-400">{isOpen ? '▲' : '▼'}</span>
                </div>
              </button>
              {isOpen && (
                <div className="bg-white">
                  {groupItems.map(item => (
                    <FixedItemRow key={item.id} item={item} onEdit={onEdit} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div className="border-t border-gray-200 bg-white px-4 pr-20 py-3 flex justify-between items-center flex-shrink-0">
        <span className="text-sm text-gray-500">활성 항목 합계</span>
        <span className="text-base font-bold text-indigo-600">{formatAmount(activeTotal)}원</span>
      </div>
    </div>
  )
}
