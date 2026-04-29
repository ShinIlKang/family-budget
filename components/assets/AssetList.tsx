'use client'
import type { Asset, AssetCategory } from '@/types'
import { formatAmount } from '@/lib/utils'
import AssetRow from './AssetRow'

interface Props {
  assets: Asset[]
  onEdit: (asset: Asset) => void
}

const CATEGORY_COLORS: Record<AssetCategory, { bg: string; text: string; label: string }> = {
  금융: { bg: 'bg-blue-50', text: 'text-blue-700', label: '금융' },
  투자: { bg: 'bg-yellow-50', text: 'text-yellow-700', label: '투자' },
  보증금: { bg: 'bg-purple-50', text: 'text-purple-700', label: '보증금' },
}

export default function AssetList({ assets, onEdit }: Props) {
  const total = assets.reduce((s, a) => s + (a.current_balance ?? a.initial_balance), 0)

  const byCategory = (['금융', '투자', '보증금'] as AssetCategory[]).map(cat => ({
    cat,
    amount: assets
      .filter(a => a.category === cat)
      .reduce((s, a) => s + (a.current_balance ?? a.initial_balance), 0),
  }))

  return (
    <div className="flex flex-col">
      {/* 총 자산 카드 */}
      <div className="mx-4 mt-4 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl p-5 text-white">
        <p className="text-sm opacity-80">총 자산</p>
        <p className="text-3xl font-bold mt-1">{formatAmount(total)}원</p>
      </div>

      {/* 카테고리 소계 카드 */}
      <div className="flex gap-3 mx-4 mt-3">
        {byCategory.map(({ cat, amount }) => {
          const style = CATEGORY_COLORS[cat]
          return (
            <div key={cat} className={`flex-1 ${style.bg} rounded-xl p-3`}>
              <p className={`text-xs font-medium ${style.text}`}>{style.label}</p>
              <p className={`text-sm font-bold ${style.text} mt-1`}>{formatAmount(amount)}</p>
            </div>
          )
        })}
      </div>

      {/* 항목 목록 */}
      <div className="mt-4 bg-white">
        {assets.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-12">자산 항목이 없습니다</p>
        ) : (
          assets.map(a => <AssetRow key={a.id} asset={a} onEdit={onEdit} />)
        )}
      </div>
    </div>
  )
}
