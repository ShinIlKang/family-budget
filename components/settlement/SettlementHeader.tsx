import type { MonthYear } from '@/types'

const STEP_LABELS = ['월급 입력', '고정비용 확인', '저축/투자 확인', '예산 배분']

interface Props {
  settlementMonth: MonthYear
  step: number
}

export default function SettlementHeader({ settlementMonth, step }: Props) {
  return (
    <>
      <p className="text-base font-bold text-gray-800 mb-1">
        {settlementMonth.year}년 {settlementMonth.month}월 정산
      </p>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-400">Step {step} / 4</p>
        <p className="text-xs font-medium text-indigo-600">{STEP_LABELS[step - 1]}</p>
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4].map(s => (
          <div key={s} className={`flex-1 h-1 rounded-full transition-colors ${s <= step ? 'bg-indigo-600' : 'bg-gray-200'}`} />
        ))}
      </div>
    </>
  )
}
