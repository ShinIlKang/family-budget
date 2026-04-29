import type { Asset } from '@/types'
import { formatAmount } from '@/lib/utils'

interface Props {
  asset: Asset
  onEdit: (asset: Asset) => void
}

export default function AssetRow({ asset, onEdit }: Props) {
  return (
    <div
      className="flex items-center justify-between py-3 px-4 border-b border-gray-100 active:bg-gray-50 cursor-pointer"
      onClick={() => onEdit(asset)}
    >
      <div>
        <p className="text-sm font-medium text-gray-800">{asset.name}</p>
        <p className="text-xs text-gray-400">{asset.category}</p>
        {asset.linked_billing_day && (
          <p className="text-xs text-gray-400">매월 {asset.linked_billing_day}일</p>
        )}
      </div>
      <p className="text-sm font-semibold text-emerald-600">
        {formatAmount(asset.current_balance ?? asset.initial_balance)}원
      </p>
    </div>
  )
}
