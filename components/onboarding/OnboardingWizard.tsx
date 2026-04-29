// components/onboarding/OnboardingWizard.tsx
'use client'
import { useState } from 'react'
import Step1Assets from './Step1Assets'
import Step2FixedItems from './Step2FixedItems'
import Step3LinkAssets from './Step3LinkAssets'
import Step4Budgets from './Step4Budgets'

interface Props {
  familyId: string
}

const STEP_LABELS = ['자산 현황 등록', '고정비 입력', '자산 연결', '예산 설정']

export default function OnboardingWizard({ familyId }: Props) {
  const [step, setStep] = useState(1)

  return (
    <div className="flex flex-col h-full">
      {/* 진행 표시 */}
      <div className="px-4 pt-2 pb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-gray-400">Step {step} / 4</p>
          <p className="text-xs font-medium text-indigo-600">{STEP_LABELS[step - 1]}</p>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4].map(s => (
            <div
              key={s}
              className={`flex-1 h-1 rounded-full transition-colors ${s <= step ? 'bg-indigo-600' : 'bg-gray-200'}`}
            />
          ))}
        </div>
      </div>

      {/* 스텝 콘텐츠 */}
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {step === 1 && <Step1Assets familyId={familyId} onNext={() => setStep(2)} />}
        {step === 2 && <Step2FixedItems familyId={familyId} onNext={() => setStep(3)} onBack={() => setStep(1)} />}
        {step === 3 && <Step3LinkAssets familyId={familyId} onNext={() => setStep(4)} onBack={() => setStep(2)} />}
        {step === 4 && <Step4Budgets familyId={familyId} onBack={() => setStep(3)} />}
      </div>
    </div>
  )
}
