'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useMonthStore } from '@/lib/monthStore'
import { getTransactions, createTransaction, updateTransaction, deleteTransaction, getCategories, seedDefaultCategories, getAssetsWithBalance, addManualLedgerEntry } from '@/lib/queries'
import type { Transaction, Category, Asset } from '@/types'
import TransactionList from '@/components/transactions/TransactionList'
import TransactionForm from '@/components/transactions/TransactionForm'
import Modal from '@/components/ui/Modal'
import FAB from '@/components/ui/FAB'

export default function TransactionsPage() {
  const { familyId } = useParams<{ familyId: string }>()
  const { current } = useMonthStore()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)

  const load = useCallback(async () => {
    const [txns, cats, a] = await Promise.all([
      getTransactions(familyId, current),
      getCategories(familyId),
      getAssetsWithBalance(familyId),
    ])
    if (cats.length === 0) {
      await seedDefaultCategories(familyId)
      setCategories(await getCategories(familyId))
    } else {
      setCategories(cats)
    }
    setTransactions(txns)
    setAssets(a)
  }, [familyId, current])

  useEffect(() => { load() }, [load])

  async function handleSubmit(
    data: Pick<Transaction, 'type' | 'amount' | 'category_id' | 'memo' | 'date'>,
    assetId?: string
  ) {
    let txn: Transaction
    if (editing) {
      txn = await updateTransaction(editing.id, data)
    } else {
      txn = await createTransaction(familyId, data)
    }
    if (assetId) {
      await addManualLedgerEntry(assetId, data.amount, txn.id, data.memo ?? undefined)
    }
    setIsFormOpen(false)
    setEditing(null)
    await load()
  }

  async function handleDelete(id: string) {
    if (!confirm('삭제하시겠습니까?')) return
    await deleteTransaction(id)
    await load()
  }

  function openAdd() { setEditing(null); setIsFormOpen(true) }
  function openEdit(t: Transaction) { setEditing(t); setIsFormOpen(true) }

  return (
    <>
      <TransactionList
        transactions={transactions}
        onEdit={openEdit}
        onDelete={handleDelete}
      />
      <FAB onClick={openAdd} />
      <Modal
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditing(null) }}
        title={editing ? '내역 수정' : '내역 추가'}
      >
        <TransactionForm
          categories={categories}
          assets={assets}
          initial={editing}
          onSubmit={handleSubmit}
          onCancel={() => { setIsFormOpen(false); setEditing(null) }}
        />
      </Modal>
    </>
  )
}
