'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { MonthYear, Settlement } from '@/types'
import { getSettlementForMonth, getLastSettlement } from '@/lib/queries'
import { getSettlementMonth } from '@/lib/utils'
import SettlementHeader from './SettlementHeader'
import SettlementStep1Salary from './SettlementStep1Salary'
import SettlementStep2Fixed from './SettlementStep2Fixed'
import SettlementStep3Investment from './SettlementStep3Investment'
import SettlementStep4Budget from './SettlementStep4Budget'

export default function SettlementWizard() {
  const router = useRouter()
  const [settlementMonth] = useState<MonthYear>(getSettlementMonth)
  const [lastSettlement, setLastSettlement] = useState<Settlement | null>(null)
  const [alreadyDone, setAlreadyDone] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const [step, setStep] = useState(1)
  const [salary, setSalary] = useState(0)
  const [fixedTotal, setFixedTotal] = useState(0)
  const [investmentTotal, setInvestmentTotal] = useState(0)

  useEffect(() => {
    async function init() {
      const [current, last] = await Promise.all([
        getSettlementForMonth(settlementMonth),
        getLastSettlement(),
      ])
      if (current?.completed_at) {
        setAlreadyDone(true)
      } else {
        setLastSettlement(last)
      }
      setLoaded(true)
    }
    init()
  }, [settlementMonth])

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <p className="text-sm text-gray-400">로딩 중...</p>
      </div>
    )
  }

  if (alreadyDone) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 py-20 px-4">
        <p className="text-lg font-semibold">이미 완료된 정산입니다</p>
        <p className="text-sm text-gray-500">{settlementMonth.year}년 {settlementMonth.month}월 정산이 완료되었습니다.</p>
        <button onClick={() => router.replace('/')} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium">
          홈으로
        </button>
      </div>
    )
  }

  // Step 2/3은 자체 sticky 헤더를 포함하므로 wizard 헤더를 따로 렌더하지 않음
  const showWizardHeader = step === 1 || step === 4

  return (
    <div className="flex flex-col">
      {showWizardHeader && (
        <div className="px-4 pt-4 pb-4">
          <SettlementHeader settlementMonth={settlementMonth} step={step} />
        </div>
      )}

      <div className={showWizardHeader ? 'px-4 pb-6' : 'pb-6'}>
        {step === 1 && (
          <SettlementStep1Salary
            lastSettlement={lastSettlement}
            onNext={s => { setSalary(s); setStep(2) }}
          />
        )}
        {step === 2 && (
          <SettlementStep2Fixed
            settlementMonth={settlementMonth}
            salary={salary}
            onNext={t => { setFixedTotal(t); setStep(3) }}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <SettlementStep3Investment
            settlementMonth={settlementMonth}
            salary={salary}
            fixedTotal={fixedTotal}
            onNext={t => { setInvestmentTotal(t); setStep(4) }}
            onBack={() => setStep(2)}
          />
        )}
        {step === 4 && (
          <SettlementStep4Budget
            settlementMonth={settlementMonth}
            salary={salary}
            fixedTotal={fixedTotal}
            investmentTotal={investmentTotal}
            lastSettlement={lastSettlement}
            onBack={() => setStep(3)}
          />
        )}
      </div>
    </div>
  )
}
