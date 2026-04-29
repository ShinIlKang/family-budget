'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { getAssetsWithBalance, autoAccumulateAssets, createAsset, updateAsset, deleteAsset, getFixedItems } from '@/lib/queries'
import type { Asset, FixedItem } from '@/types'
import AssetList from '@/components/assets/AssetList'
import AssetForm from '@/components/assets/AssetForm'
import Modal from '@/components/ui/Modal'
import FAB from '@/components/ui/FAB'

export default function AssetsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [assets, setAssets] = useState<Asset[]>([])
  const [fixedItems, setFixedItems] = useState<FixedItem[]>([])
  const [editing, setEditing] = useState<Asset | null | undefined>(undefined)

  const load = useCallback(async () => {
    if (!session?.user.id) return
    await autoAccumulateAssets(session.user.id)
    const [a, f] = await Promise.all([getAssetsWithBalance(), getFixedItems()])
    setAssets(a)
    setFixedItems(f)
  }, [session])

  useEffect(() => { load() }, [load])

  async function handleSubmit(data: Pick<Asset, 'name' | 'category' | 'initial_balance' | 'linked_fixed_item_id'>) {
    if (!session?.user.id) return
    if (editing === null) {
      await createAsset(data, session.user.id)
    } else if (editing) {
      await updateAsset(editing.id, data, session.user.id)
    }
    setEditing(undefined)
    await load()
  }

  async function handleDelete() {
    if (!editing) return
    await deleteAsset(editing.id)
    setEditing(undefined)
    await load()
  }

  return (
    <div className="flex flex-col min-h-screen pb-20">
      <div className="bg-emerald-600 text-white px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-emerald-200 text-xl">←</button>
        <h1 className="text-lg font-semibold">총 자산 현황</h1>
      </div>
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <AssetList assets={assets} onEdit={a => setEditing(a)} />
      </div>
      <FAB onClick={() => setEditing(null)} />
      <Modal isOpen={editing !== undefined} onClose={() => setEditing(undefined)} title={editing ? '자산 수정' : '자산 추가'}>
        {editing !== undefined && (
          <AssetForm initial={editing ?? null} fixedItems={fixedItems} onSubmit={handleSubmit} onCancel={() => setEditing(undefined)} onDelete={editing ? handleDelete : undefined} />
        )}
      </Modal>
    </div>
  )
}
