'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { getFixedItems, createFixedItem, updateFixedItem, deleteFixedItem } from '@/lib/queries'
import type { FixedItem } from '@/types'
import FixedItemList from '@/components/fixed-items/FixedItemList'
import FixedItemForm from '@/components/fixed-items/FixedItemForm'
import Modal from '@/components/ui/Modal'
import FAB from '@/components/ui/FAB'

export default function FixedItemsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [items, setItems] = useState<FixedItem[]>([])
  const [editing, setEditing] = useState<FixedItem | null | undefined>(undefined)

  const load = useCallback(async () => { setItems(await getFixedItems()) }, [])

  useEffect(() => { load() }, [load])

  async function handleSubmit(data: Omit<FixedItem, 'id' | 'created_by' | 'updated_by' | 'created_at'>) {
    if (!session?.user.id) return
    if (editing === null) {
      await createFixedItem(data, session.user.id)
    } else if (editing) {
      await updateFixedItem(editing.id, data, session.user.id)
    }
    setEditing(undefined)
    await load()
  }

  async function handleDelete() {
    if (!editing) return
    await deleteFixedItem(editing.id)
    setEditing(undefined)
    await load()
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="bg-indigo-600 text-white px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-indigo-200 text-xl">←</button>
        <h1 className="text-lg font-semibold">고정비 관리</h1>
      </div>
      <div className="flex-1 overflow-hidden">
        <FixedItemList items={items} onEdit={item => setEditing(item)} />
      </div>
      <FAB onClick={() => setEditing(null)} />
      <Modal isOpen={editing !== undefined} onClose={() => setEditing(undefined)} title={editing ? '고정비 수정' : '고정비 추가'}>
        {editing !== undefined && (
          <FixedItemForm initial={editing ?? null} onSubmit={handleSubmit} onCancel={() => setEditing(undefined)} onDelete={editing ? handleDelete : undefined} />
        )}
      </Modal>
    </div>
  )
}
