'use client'
import { useState } from 'react'
import type { AssetCategory } from '@/types'
import { ASSET_CATEGORIES } from '@/types'
import { formatAmount } from '@/lib/utils'
import { updateFamily, createAsset } from '@/lib/queries'

interface Props {
  familyId: string
  onNext: () => void
}

interface AssetInput {
  name: string
  category: AssetCategory
  initial_balance: string
}

export default function Step1Assets({ familyId, onNext }: Props) {
  const [income, setIncome] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [assetName, setAssetName] = useState('')
  const [assetCategory, setAssetCategory] = useState<AssetCategory>('금융')
  const [assetBalance, setAssetBalance] = useState('')
  const [addedAssets, setAddedAssets] = useState<AssetInput[]>([])
  const [loading, setLoading] = useState(false)

  function addAsset() {
    const bal = parseInt(assetBalance.replace(/,/g, ''))
    if (!assetName.trim() || isNaN(bal) || bal < 0) return
    setAddedAssets(prev => [...prev, { name: assetName.trim(), category: assetCategory, initial_balance: assetBalance }])
    setAssetName('')
    setAssetBalance('')
    setAssetCategory('금융')
    setShowForm(false)
  }

  async function handleNext() {
    const parsedIncome = parseInt(income.replace(/,/g, ''))
    if (isNaN(parsedIncome) || parsedIncome < 0) return
    setLoading(true)
    try {
      await updateFamily(familyId, { monthly_income: parsedIncome })
      for (const a of addedAssets) {
        await createAsset(familyId, {
          name: a.name,
          category: a.category,
          initial_balance: parseInt(a.initial_balance.replace(/,/g, '')),
          linked_fixed_item_id: null,
        })
      }
      onNext()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm font-medium text-gray-700 mb-1">월 근로소득</p>
        <input
          type="number"
          placeholder="월 수입 (원)"
          value={income}
          onChange={e => setIncome(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
          min={0}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-700">자산 항목</p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="text-sm text-indigo-600 font-medium"
          >
            + 추가
          </button>
        </div>

        {showForm && (
          <div className="bg-gray-50 rounded-xl p-4 mb-3 flex flex-col gap-3">
            <input
              type="text"
              placeholder="항목 이름 (예: 적금 A은행)"
              value={assetName}
              onChange={e => setAssetName(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              autoFocus
            />
            <select
              value={assetCategory}
              onChange={e => setAssetCategory(e.target.value as AssetCategory)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              {ASSET_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input
              type="number"
              placeholder="현재 잔액 (원)"
              value={assetBalance}
              onChange={e => setAssetBalance(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              min={0}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600"
              >
                취소
              </button>
              <button
                type="button"
                onClick={addAsset}
                className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm"
              >
                추가
              </button>
            </div>
          </div>
        )}

        {addedAssets.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">아직 등록된 자산이 없습니다</p>
        ) : (
          <div className="flex flex-col gap-2">
            {addedAssets.map((a, i) => (
              <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{a.name}</p>
                  <p className="text-xs text-gray-400">{a.category}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-semibold text-emerald-600">{formatAmount(parseInt(a.initial_balance) || 0)}원</p>
                  <button
                    type="button"
                    onClick={() => setAddedAssets(prev => prev.filter((_, j) => j !== i))}
                    className="text-red-400 text-sm"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleNext}
        disabled={loading}
        className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium disabled:opacity-50"
      >
        {loading ? '저장 중...' : '다음'}
      </button>
    </div>
  )
}
