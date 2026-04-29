'use client'
import { useState, useEffect } from 'react'
import { getFixedItems, getAssetsWithBalance } from '@/lib/queries'
import Step1Assets from './Step1Assets'
import Step2FixedItems from './Step2FixedItems'
import Step3LinkAssets from './Step3LinkAssets'
import Step4Budgets from './Step4Budgets'

const STEP_LABELS = ['자산 현황 등록', '고정비 입력', '자산 연결', '예산 설정']

export default function OnboardingWizard() {
  const [step, setStep] = useState<number | null>(null)

  useEffect(() => {
    async function detectStep() {
      const [fixedItems, assets] = await Promise.all([
        getFixedItems(),
        getAssetsWithBalance(),
      ])
      if (fixedItems.length > 0) {
        setStep(3)
      } else if (assets.length > 0) {
        setStep(2)
      } else {
        setStep(1)
      }
    }
    detectStep().catch(() => setStep(1))
  }, [])

  if (step === null) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <p className="text-sm text-gray-400">로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-2 pb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-gray-400">Step {step} / 4</p>
          <p className="text-xs font-medium text-indigo-600">{STEP_LABELS[step - 1]}</p>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className={`flex-1 h-1 rounded-full transition-colors ${s <= step ? 'bg-indigo-600' : 'bg-gray-200'}`} />
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {step === 1 && <Step1Assets onNext={() => setStep(2)} />}
        {step === 2 && <Step2FixedItems onNext={() => setStep(3)} onBack={() => setStep(1)} />}
        {step === 3 && <Step3LinkAssets onNext={() => setStep(4)} onBack={() => setStep(2)} />}
        {step === 4 && <Step4Budgets onBack={() => setStep(3)} />}
      </div>
    </div>
  )
}
