'use client'
import { useState } from 'react'
import { formatAmountInput } from '@/lib/utils'

interface Props {
  categoryName: string
  categoryIcon: string
  currentAmount: number
  onSubmit: (amount: number) => Promise<void>
  onCancel: () => void
}

export default function BudgetForm({ categoryName, categoryIcon, currentAmount, onSubmit, onCancel }: Props) {
  const [amount, setAmount] = useState(currentAmount > 0 ? formatAmountInput(String(currentAmount)) : '')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = parseInt(amount.replace(/,/g, ''))
    if (isNaN(parsed) || parsed <= 0) return
    setLoading(true)
    await onSubmit(parsed)
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="text-center">
        <span className="text-3xl">{categoryIcon}</span>
        <p className="text-gray-600 mt-1">{categoryName} 예산</p>
      </div>
      <input
        type="text"
        inputMode="numeric"
        placeholder="예산 금액 (원)"
        value={amount}
        onChange={e => setAmount(formatAmountInput(e.target.value))}
        className="border border-gray-300 rounded-lg px-3 py-2 text-center text-lg"
        required
        autoFocus
      />
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="flex-1 py-2 border border-gray-300 rounded-lg">취소</button>
        <button type="submit" disabled={loading} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50">
          {loading ? '저장 중...' : '저장'}
        </button>
      </div>
    </form>
  )
}
