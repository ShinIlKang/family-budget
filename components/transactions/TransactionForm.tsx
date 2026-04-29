'use client'
import { useState } from 'react'
import type { Transaction, Category, Asset } from '@/types'

interface Props {
  categories: Category[]
  assets: Asset[]
  initial?: Transaction | null
  onSubmit: (
    data: Pick<Transaction, 'type' | 'amount' | 'category_id' | 'memo' | 'date'>,
    assetId?: string
  ) => Promise<void>
  onCancel: () => void
}

export default function TransactionForm({ categories, assets, initial, onSubmit, onCancel }: Props) {
  const today = new Date().toISOString().split('T')[0]
  const [type, setType] = useState<'income' | 'expense'>(initial?.type ?? 'expense')
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '')
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? '')
  const [memo, setMemo] = useState(initial?.memo ?? '')
  const [date, setDate] = useState(initial?.date ?? today)
  const [linkAsset, setLinkAsset] = useState(false)
  const [assetId, setAssetId] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = parseInt(amount.replace(/,/g, ''))
    if (isNaN(parsed) || parsed <= 0) return
    setLoading(true)
    try {
      await onSubmit(
        { type, amount: parsed, category_id: categoryId || null, memo: memo || null, date },
        linkAsset && assetId ? assetId : undefined
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex gap-2">
        {(['expense', 'income'] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
              type === t
                ? t === 'expense' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {t === 'expense' ? '지출' : '수입'}
          </button>
        ))}
      </div>
      <input
        type="date"
        value={date}
        onChange={e => setDate(e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2"
        required
      />
      <input
        type="number"
        placeholder="금액 (원)"
        value={amount}
        onChange={e => setAmount(e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2"
        required
        min={1}
      />
      <select
        value={categoryId}
        onChange={e => setCategoryId(e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2"
      >
        <option value="">카테고리 선택</option>
        {categories.map(c => (
          <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
        ))}
      </select>
      <input
        type="text"
        placeholder="메모 (선택)"
        value={memo}
        onChange={e => setMemo(e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2"
        maxLength={100}
      />

      {assets.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
            <p className="text-sm font-medium text-gray-700">자산에 추가납입</p>
            <button
              type="button"
              onClick={() => setLinkAsset(v => !v)}
              className={`relative w-10 h-6 rounded-full transition-colors ${linkAsset ? 'bg-indigo-600' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${linkAsset ? 'translate-x-5' : 'translate-x-1'}`} />
            </button>
          </div>
          {linkAsset && (
            <select
              value={assetId}
              onChange={e => setAssetId(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2"
              required
            >
              <option value="">자산 항목 선택</option>
              {assets.map(a => (
                <option key={a.id} value={a.id}>{a.name} ({a.category})</option>
              ))}
            </select>
          )}
        </div>
      )}

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
    </form>
  )
}
