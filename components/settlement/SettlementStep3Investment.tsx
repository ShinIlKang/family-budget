'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import type { FixedItem, MonthYear } from '@/types'
import { getFixedItems, createFixedItem } from '@/lib/queries'
import { formatAmount, formatAmountInput } from '@/lib/utils'
import SettlementHeader from './SettlementHeader'

interface Props {
  settlementMonth: MonthYear
  salary: number
  fixedTotal: number
  onNext: (investmentTotal: number) => void
  onBack: () => void
}

export default function SettlementStep3Investment({ settlementMonth, salary, fixedTotal, onNext, onBack }: Props) {
  const { data: session } = useSession()
  const [items, setItems] = useState<FixedItem[]>([])
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const all = await getFixedItems(settlementMonth.year, settlementMonth.month)
    setItems(all.filter(i => i.group_name === '저축/투자' && i.is_active))
  }, [settlementMonth])

  useEffect(() => { load() }, [load])

  const total = items.reduce((s, i) => s + i.amount, 0)
  const afterFixed = salary - fixedTotal

  async function handleAdd() {
    const amt = parseInt(amount.replace(/,/g, ''))
    if (!name.trim() || !amt || amt <= 0) return
    setSaving(true)
    try {
      await createFixedItem(
        { name: name.trim(), amount: amt, group_name: '저축/투자', billing_day: null, payment_method: null, memo: null, is_active: true, year: settlementMonth.year, month: settlementMonth.month },
        session?.user.id ?? ''
      )
      setName('')
      setAmount('')
      setShowForm(false)
      await load()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col">
      {/* sticky: 헤더 + 요약 + 항목 헤더 */}
      <div className="sticky top-0 z-10 bg-gray-50 px-4 pt-4 pb-3">
        <div className="mb-4">
          <SettlementHeader settlementMonth={settlementMonth} step={3} />
        </div>

        <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 text-sm mb-3">
          <div className="flex justify-between text-gray-500">
            <span>고정비 차감 후</span><span>{formatAmount(afterFixed)}원</span>
          </div>
          <div className="flex justify-between font-medium text-blue-500 mt-1">
            <span>저축/투자</span><span>- {formatAmount(total)}원</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700">저축/투자 항목 ({items.length}개)</p>
          <button type="button" onClick={() => setShowForm(v => !v)} className="text-sm text-indigo-600 font-medium">
            {showForm ? '닫기' : '+ 추가'}
          </button>
        </div>
      </div>

      {/* 추가 폼 */}
      {showForm && (
        <div className="bg-gray-50 mx-4 rounded-xl p-4 flex flex-col gap-3 mb-2">
          <input
            type="text"
            placeholder="항목 이름 (예: A은행 적금)"
            value={name}
            onChange={e => setName(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            autoFocus
          />
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              placeholder="금액"
              value={amount}
              onChange={e => setAmount(formatAmountInput(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm pr-6"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">원</span>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600">취소</button>
            <button type="button" onClick={handleAdd} disabled={saving} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50">추가</button>
          </div>
        </div>
      )}

      {/* 항목 목록 */}
      <div className="px-4">
        {items.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">저축/투자 항목이 없습니다</p>
        ) : (
          <div className="flex flex-col divide-y divide-gray-100">
            {items.map(item => (
              <div key={item.id} className="flex items-center justify-between py-3">
                <p className="text-sm font-medium">{item.name}</p>
                <p className="text-sm font-semibold text-blue-600">{formatAmount(item.amount)}원</p>
              </div>
            ))}
            <div className="flex justify-between pt-3 font-semibold text-sm">
              <span className="text-gray-500">합계</span>
              <span>{formatAmount(total)}원</span>
            </div>
          </div>
        )}

        <div className="flex gap-2 mt-6 pb-6">
          <button type="button" onClick={onBack} className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-600 font-medium">이전</button>
          <button type="button" onClick={() => onNext(total)} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-medium">다음</button>
        </div>
      </div>
    </div>
  )
}
