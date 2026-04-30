'use client'
import { useRouter } from 'next/navigation'
import { formatAmount } from '@/lib/utils'

interface Props {
  total: number
  activeCount: number
}

export default function FixedItemsSummaryCard({ total, activeCount }: Props) {
  const router = useRouter()
  return (
    <div
      className="mx-4 mt-3 bg-amber-50 border border-amber-200 rounded-xl p-4 cursor-pointer active:bg-amber-100"
      onClick={() => router.push('/fixed-items')}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">📌</span>
          <div>
            <p className="text-xs text-amber-700 font-medium">이번달 고정비</p>
            <p className="text-xs text-amber-500">{activeCount}개 항목</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-amber-800">{formatAmount(total)}원</p>
          <p className="text-xs text-amber-500">관리하기 →</p>
        </div>
      </div>
    </div>
  )
}
