'use client'
import { useState } from 'react'
import { formatAmount, formatAmountInput } from '@/lib/utils'
import type { Settlement } from '@/types'

interface Props {
  lastSettlement: Settlement | null
  onNext: (salary: number) => void
}

export default function SettlementStep1Salary({ lastSettlement, onNext }: Props) {
  const [value, setValue] = useState(
    lastSettlement ? formatAmount(lastSettlement.salary) : ''
  )

  function handleNext() {
    const salary = parseInt(value.replace(/,/g, ''))
    if (!salary || salary <= 0) return
    onNext(salary)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">이번 달 월급</p>
        {lastSettlement && (
          <p className="text-xs text-gray-400 mb-2">
            지난 달: {formatAmount(lastSettlement.salary)}원
          </p>
        )}
        <div className="relative">
          <input
            type="text"
            inputMode="numeric"
            placeholder="월급을 입력하세요"
            value={value}
            onChange={e => setValue(formatAmountInput(e.target.value))}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-lg font-semibold pr-8"
            autoFocus
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">원</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleNext}
        disabled={!value}
        className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium disabled:opacity-40"
      >
        다음
      </button>
    </div>
  )
}
