'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import type { FixedItem } from '@/types'
import { getFixedItems, createFixedItem, updateFixedItem, deleteFixedItem } from '@/lib/queries'
import { formatAmount } from '@/lib/utils'
import FixedItemForm from '@/components/fixed-items/FixedItemForm'
import Modal from '@/components/ui/Modal'

interface Props {
  onNext: () => void
  onBack: () => void
}

export default function Step2FixedItems({ onNext, onBack }: Props) {
  const { data: session } = useSession()
  const [items, setItems] = useState<FixedItem[]>([])
  const [editing, setEditing] = useState<FixedItem | null | undefined>(undefined)

  const load = useCallback(async () => {
    try {
      const now = new Date()
      setItems(await getFixedItems(now.getFullYear(), now.getMonth() + 1))
    } catch (e) {
      console.error('고정비 로드 실패:', e)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSubmit(data: Omit<FixedItem, 'id' | 'created_by' | 'updated_by' | 'created_at' | 'year' | 'month'>) {
    try {
      const now = new Date()
      if (editing === null) {
        await createFixedItem({ ...data, year: now.getFullYear(), month: now.getMonth() + 1 }, session?.user.id ?? '')
      } else if (editing) {
        await updateFixedItem(editing.id, { ...data, year: editing.year, month: editing.month }, session?.user.id ?? '')
      }
      setEditing(undefined)
      await load()
    } catch (e) {
      console.error('고정비 저장 실패:', e)
    }
  }

  async function handleDelete() {
    if (!editing) return
    try {
      await deleteFixedItem(editing.id)
      setEditing(undefined)
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
          onClick={() => setEditing(null)}
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
            <button
              key={item.id}
              type="button"
              onClick={() => setEditing(item)}
              className="flex items-center justify-between py-3 px-1 border-b border-gray-100 text-left active:bg-gray-50"
            >
              <div>
                <p className="text-sm font-medium">{item.name}</p>
                <p className="text-xs text-gray-400">
                  {item.group_name}{item.billing_day ? ` · 매월 ${item.billing_day}일` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-gray-700">{formatAmount(item.amount)}원</p>
                <span className="text-xs text-gray-300">›</span>
              </div>
            </button>
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

      <Modal
        isOpen={editing !== undefined}
        onClose={() => setEditing(undefined)}
        title={editing ? '고정비 수정' : '고정비 추가'}
      >
        {editing !== undefined && (
          <FixedItemForm
            initial={editing ?? null}
            onSubmit={handleSubmit}
            onCancel={() => setEditing(undefined)}
            onDelete={editing ? handleDelete : undefined}
          />
        )}
      </Modal>
    </div>
  )
}
