'use client'
import { useState, useEffect, useCallback } from 'react'
import type { FixedItem } from '@/types'
import { getFixedItems, createFixedItem, deleteFixedItem } from '@/lib/queries'
import { formatAmount } from '@/lib/utils'
import FixedItemForm from '@/components/fixed-items/FixedItemForm'
import Modal from '@/components/ui/Modal'

interface Props {
  familyId: string
  onNext: () => void
  onBack: () => void
}

export default function Step2FixedItems({ familyId, onNext, onBack }: Props) {
  const [items, setItems] = useState<FixedItem[]>([])
  const [isFormOpen, setIsFormOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      setItems(await getFixedItems(familyId))
    } catch (e) {
      console.error('고정비 로드 실패:', e)
    }
  }, [familyId])

  useEffect(() => { load() }, [load])

  async function handleSubmit(data: Omit<FixedItem, 'id' | 'family_id' | 'created_at'>) {
    try {
      await createFixedItem(familyId, data)
      setIsFormOpen(false)
      await load()
    } catch (e) {
      console.error('고정비 저장 실패:', e)
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteFixedItem(id)
      await load()
    } catch (e) {
      console.error('고정비 삭제 실패:', e)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">{items.length}개 항목 등록됨</p>
        <button
          type="button"
          onClick={() => setIsFormOpen(true)}
          className="text-sm text-indigo-600 font-medium"
        >
          + 추가
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">고정비 항목을 추가해주세요</p>
      ) : (
        <div className="flex flex-col">
          {items.map(item => (
            <div
              key={item.id}
              className="flex items-center justify-between py-3 px-1 border-b border-gray-100"
            >
              <div>
                <p className="text-sm font-medium">{item.name}</p>
                <p className="text-xs text-gray-400">
                  {item.group_name}{item.billing_day ? ` · 매월 ${item.billing_day}일` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-sm font-semibold text-gray-700">{formatAmount(item.amount)}원</p>
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  className="text-red-400 text-sm"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 mt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-600 font-medium"
        >
          이전
        </button>
        <button
          type="button"
          onClick={onNext}
          className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-medium"
        >
          다음
        </button>
      </div>

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title="고정비 추가">
        {isFormOpen && (
          <FixedItemForm
            initial={null}
            onSubmit={handleSubmit}
            onCancel={() => setIsFormOpen(false)}
            onDelete={undefined}
          />
        )}
      </Modal>
    </div>
  )
}
