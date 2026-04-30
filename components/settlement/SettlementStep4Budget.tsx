'use client'
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import type { MonthYear, Settlement } from '@/types'
import { getCategories, seedDefaultCategories, upsertBudget, completeSettlement } from '@/lib/queries'
import { formatAmount, formatAmountInput } from '@/lib/utils'

interface Props {
  settlementMonth: MonthYear
  salary: number
  fixedTotal: number
  investmentTotal: number
  lastSettlement: Settlement | null
  onBack: () => void
}

export default function SettlementStep4Budget({
  settlementMonth,
  salary,
  fixedTotal,
  investmentTotal,
  lastSettlement,
  onBack,
}: Props) {
  const { data: session } = useSession()
  const router = useRouter()

  const defaultEvent = lastSettlement?.event_budget ?? 100000
  const defaultMedical = lastSettlement?.medical_budget ?? 200000

  const [eventBudget, setEventBudget] = useState(formatAmount(defaultEvent))
  const [medicalBudget, setMedicalBudget] = useState(formatAmount(defaultMedical))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const remaining = salary - fixedTotal - investmentTotal
  const eventAmt = parseInt(eventBudget.replace(/,/g, '')) || 0
  const medicalAmt = parseInt(medicalBudget.replace(/,/g, '')) || 0
  const livingBudget = remaining - eventAmt - medicalAmt

  async function handleComplete() {
    if (livingBudget < 0) {
      setError('예산 합계가 잔여 금액을 초과합니다.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const userId = session?.user.id ?? ''
      let cats = await getCategories()
      if (cats.length === 0) cats = await seedDefaultCategories(userId)

      for (const cat of cats) {
        let amount = 0
        if (cat.name === '생활비') amount = livingBudget
        else if (cat.name === '의료') amount = medicalAmt
        else if (cat.name === '경조사비') amount = eventAmt
        await upsertBudget(cat.id, settlementMonth, amount, userId)
      }

      await completeSettlement(
        settlementMonth,
        {
          salary,
          fixed_total: fixedTotal,
          investment_total: investmentTotal,
          event_budget: eventAmt,
          medical_budget: medicalAmt,
          living_budget: livingBudget,
        },
        userId
      )

      router.replace('/')
    } catch (e) {
      console.error('정산 완료 실패:', e)
      setError('저장 중 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-gray-50 rounded-xl p-4 flex flex-col gap-2 text-sm">
        <div className="flex justify-between text-gray-500">
          <span>월급</span><span>{formatAmount(salary)}원</span>
        </div>
        <div className="flex justify-between text-red-400">
          <span>고정비용</span><span>- {formatAmount(fixedTotal)}원</span>
        </div>
        <div className="flex justify-between text-blue-400">
          <span>저축/투자</span><span>- {formatAmount(investmentTotal)}원</span>
        </div>
        <div className="border-t border-gray-200 pt-2 flex justify-between font-semibold">
          <span>예산 배분 가능</span><span>{formatAmount(remaining)}원</span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2">
            <span>🎁</span>
            <span className="text-sm font-medium">경조사비</span>
          </div>
          <div className="relative w-36">
            <input
              type="text"
              inputMode="numeric"
              value={eventBudget}
              onChange={e => setEventBudget(formatAmountInput(e.target.value))}
              className="w-full text-right pr-5 text-sm font-semibold border-b border-gray-300 bg-transparent py-1 focus:outline-none"
            />
            <span className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 text-xs">원</span>
          </div>
        </div>

        <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2">
            <span>💊</span>
            <span className="text-sm font-medium">의료비</span>
          </div>
          <div className="relative w-36">
            <input
              type="text"
              inputMode="numeric"
              value={medicalBudget}
              onChange={e => setMedicalBudget(formatAmountInput(e.target.value))}
              className="w-full text-right pr-5 text-sm font-semibold border-b border-gray-300 bg-transparent py-1 focus:outline-none"
            />
            <span className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 text-xs">원</span>
          </div>
        </div>

        <div className="flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2">
            <span>🧺</span>
            <span className="text-sm font-medium text-indigo-800">생활비</span>
          </div>
          <span className={`text-sm font-bold ${livingBudget < 0 ? 'text-red-500' : 'text-indigo-700'}`}>
            {formatAmount(livingBudget)}원
          </span>
        </div>
      </div>

      {error && <p className="text-sm text-red-500 text-center">{error}</p>}

      <div className="flex gap-2 mt-2">
        <button type="button" onClick={onBack} className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-600 font-medium">이전</button>
        <button
          type="button"
          onClick={handleComplete}
          disabled={saving || livingBudget < 0}
          className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-medium disabled:opacity-40"
        >
          {saving ? '저장 중...' : '정산 완료'}
        </button>
      </div>
    </div>
  )
}
