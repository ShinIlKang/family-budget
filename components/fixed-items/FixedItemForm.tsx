'use client'
import { useState } from 'react'
import type { FixedItem, FixedItemGroup } from '@/types'
import { FIXED_ITEM_GROUPS } from '@/types'
import { formatAmountInput } from '@/lib/utils'

interface Props {
  initial: FixedItem | null
  onSubmit: (data: Omit<FixedItem, 'id' | 'family_id' | 'created_at'>) => Promise<void>
  onCancel: () => void
  onDelete: (() => Promise<void>) | undefined
}

export default function FixedItemForm({ initial, onSubmit, onCancel, onDelete }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [amount, setAmount] = useState(initial ? formatAmountInput(String(initial.amount)) : '')
  const [groupName, setGroupName] = useState<FixedItemGroup>(initial?.group_name ?? '구독/서비스')
  const [billingDay, setBillingDay] = useState(initial?.billing_day ? String(initial.billing_day) : '')
  const [memo, setMemo] = useState(initial?.memo ?? '')
  const [isActive, setIsActive] = useState(initial?.is_active ?? true)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = parseInt(amount.replace(/,/g, ''))
    if (!name.trim() || isNaN(parsed) || parsed <= 0) return
    setLoading(true)
    try {
      await onSubmit({
        name: name.trim(),
        amount: parsed,
        group_name: groupName,
        billing_day: billingDay ? parseInt(billingDay) : null,
        memo: memo.trim() || null,
        is_active: isActive,
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!onDelete) return
    if (!confirm('이 항목을 삭제하시겠습니까?')) return
    setLoading(true)
    try {
      await onDelete()
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <input
        type="text"
        placeholder="항목 이름"
        value={name}
        onChange={e => setName(e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2"
        required
        autoFocus
      />
      <input
        type="text"
        inputMode="numeric"
        placeholder="금액 (원)"
        value={amount}
        onChange={e => setAmount(formatAmountInput(e.target.value))}
        className="border border-gray-300 rounded-lg px-3 py-2"
        required
      />
      <select
        value={groupName}
        onChange={e => setGroupName(e.target.value as FixedItemGroup)}
        className="border border-gray-300 rounded-lg px-3 py-2"
      >
        {FIXED_ITEM_GROUPS.map(g => (
          <option key={g} value={g}>{g}</option>
        ))}
      </select>
      <select
        value={billingDay}
        onChange={e => setBillingDay(e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2"
      >
        <option value="">납부일 선택 (선택)</option>
        {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
          <option key={d} value={d}>매월 {d}일</option>
        ))}
      </select>
      <textarea
        placeholder="메모 (선택)"
        value={memo}
        onChange={e => setMemo(e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2 resize-none"
        rows={2}
        maxLength={100}
      />
      <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
        <div>
          <p className="text-sm font-medium text-gray-700">활성 상태</p>
          <p className="text-xs text-gray-400">비활성 시 집계에서 제외</p>
        </div>
        <button
          type="button"
          onClick={() => setIsActive(v => !v)}
          className={`relative w-10 h-6 rounded-full transition-colors ${isActive ? 'bg-indigo-600' : 'bg-gray-300'}`}
          aria-label="활성 토글"
        >
          <span
            className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${isActive ? 'translate-x-5' : 'translate-x-1'}`}
          />
        </button>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-600"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50"
        >
          {loading ? '저장 중...' : initial ? '수정' : '저장'}
        </button>
      </div>
      {onDelete && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={loading}
          className="w-full py-2 text-red-500 text-sm border border-red-200 rounded-lg disabled:opacity-50"
        >
          삭제
        </button>
      )}
    </form>
  )
}
