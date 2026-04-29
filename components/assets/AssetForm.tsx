'use client'
import { useState } from 'react'
import type { Asset, AssetCategory, FixedItem } from '@/types'
import { ASSET_CATEGORIES } from '@/types'

interface Props {
  initial: Asset | null
  fixedItems: FixedItem[]
  onSubmit: (data: Pick<Asset, 'name' | 'category' | 'initial_balance' | 'linked_fixed_item_id'>) => Promise<void>
  onCancel: () => void
  onDelete: (() => Promise<void>) | undefined
}

export default function AssetForm({ initial, fixedItems, onSubmit, onCancel, onDelete }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [category, setCategory] = useState<AssetCategory>(initial?.category ?? '금융')
  const [balance, setBalance] = useState(initial ? String(initial.initial_balance) : '')
  const [linkedId, setLinkedId] = useState(initial?.linked_fixed_item_id ?? '')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = parseInt(balance.replace(/,/g, ''))
    if (!name.trim() || isNaN(parsed) || parsed < 0) return
    setLoading(true)
    try {
      await onSubmit({
        name: name.trim(),
        category,
        initial_balance: parsed,
        linked_fixed_item_id: linkedId || null,
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!onDelete) return
    if (!confirm('이 항목을 삭제하시겠습니까?')) return
    setLoading(true)
    try { await onDelete() } finally { setLoading(false) }
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
      <select
        value={category}
        onChange={e => setCategory(e.target.value as AssetCategory)}
        className="border border-gray-300 rounded-lg px-3 py-2"
      >
        {ASSET_CATEGORIES.map(c => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      <input
        type="number"
        placeholder="현재 잔액 (원)"
        value={balance}
        onChange={e => setBalance(e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2"
        required
        min={0}
      />
      <select
        value={linkedId}
        onChange={e => setLinkedId(e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2"
      >
        <option value="">연결 고정비 없음</option>
        {fixedItems.filter(f => f.is_active).map(f => (
          <option key={f.id} value={f.id}>
            {f.name} ({f.billing_day ? `매월 ${f.billing_day}일` : '납부일 없음'})
          </option>
        ))}
      </select>
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
