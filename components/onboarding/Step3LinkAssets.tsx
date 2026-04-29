'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import type { FixedItem, Asset } from '@/types'
import { getFixedItems, getAssetsWithBalance, updateAsset } from '@/lib/queries'
import { formatAmount } from '@/lib/utils'

interface Props {
  onNext: () => void
  onBack: () => void
}

export default function Step3LinkAssets({ onNext, onBack }: Props) {
  const { data: session } = useSession()
  const [fixedItems, setFixedItems] = useState<FixedItem[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  // assetId → fixedItemId mapping (빈 문자열 = 연결 안 함)
  const [links, setLinks] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    try {
      const [fi, a] = await Promise.all([
        getFixedItems(),
        getAssetsWithBalance(),
      ])
      setFixedItems(fi.filter(f => f.is_active))
      setAssets(a)
      const initial: Record<string, string> = {}
      for (const asset of a) {
        initial[asset.id] = asset.linked_fixed_item_id ?? ''
      }
      setLinks(initial)
    } catch (e) {
      console.error('데이터 로드 실패:', e)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleNext() {
    setLoading(true)
    try {
      await Promise.all(
        Object.entries(links).map(([assetId, fixedItemId]) =>
          updateAsset(assetId, { linked_fixed_item_id: fixedItemId || null }, session?.user.id ?? '')
        )
      )
      onNext()
    } catch (e) {
      console.error('연결 저장 실패:', e)
    } finally {
      setLoading(false)
    }
  }

  if (assets.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-gray-400 text-center py-8">등록된 자산 항목이 없습니다</p>
        <div className="flex gap-2">
          <button type="button" onClick={onBack} className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-600 font-medium">이전</button>
          <button type="button" onClick={onNext} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-medium">다음</button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-500">각 자산 항목에 자동으로 적립할 고정비를 연결하세요.</p>

      <div className="flex flex-col gap-3">
        {assets.map(asset => (
          <div key={asset.id} className="bg-gray-50 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-medium">{asset.name}</p>
                <p className="text-xs text-gray-400">{asset.category} · {formatAmount(asset.initial_balance)}원</p>
              </div>
            </div>
            <select
              value={links[asset.id] ?? ''}
              onChange={e => setLinks(prev => ({ ...prev, [asset.id]: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">연결 안 함</option>
              {fixedItems.map(f => (
                <option key={f.id} value={f.id}>
                  {f.name} — {formatAmount(f.amount)}원{f.billing_day ? ` (매월 ${f.billing_day}일)` : ''}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-600 font-medium"
        >
          이전
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={loading}
          className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-medium disabled:opacity-50"
        >
          {loading ? '저장 중...' : '다음'}
        </button>
      </div>
    </div>
  )
}
