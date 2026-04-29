'use client'
import { useRouter } from 'next/navigation'
import { formatAmount } from '@/lib/utils'
import type { AssetCategory } from '@/types'

interface Props {
  familyId: string
  total: number
  byCategory: Record<AssetCategory, number>
}

export default function AssetSummaryCard({ familyId, total, byCategory }: Props) {
  const router = useRouter()
  return (
    <div
      className="mx-4 mt-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4 cursor-pointer active:bg-emerald-100"
      onClick={() => router.push(`/${familyId}/assets`)}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">💰</span>
          <p className="text-xs text-emerald-700 font-medium">총 자산</p>
        </div>
        <p className="text-xs text-emerald-500">관리하기 →</p>
      </div>
      <p className="text-xl font-bold text-emerald-800 mb-2">{formatAmount(total)}원</p>
      <div className="flex gap-3 text-xs text-emerald-600">
        <span>금융 {formatAmount(byCategory['금융'])}</span>
        <span>투자 {formatAmount(byCategory['투자'])}</span>
        <span>보증금 {formatAmount(byCategory['보증금'])}</span>
      </div>
    </div>
  )
}
