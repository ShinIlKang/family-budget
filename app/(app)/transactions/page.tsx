'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useMonthStore } from '@/lib/monthStore'
import { getTransactions, createTransaction, updateTransaction, deleteTransaction, getCategories, seedDefaultCategories, getAssetsWithBalance, addManualLedgerEntry } from '@/lib/queries'
import { DEFAULT_BUDGET_CATEGORY_COUNT } from '@/types'
import type { Transaction, Category, Asset } from '@/types'
import TransactionList from '@/components/transactions/TransactionList'
import TransactionForm from '@/components/transactions/TransactionForm'
import Modal from '@/components/ui/Modal'
import FAB from '@/components/ui/FAB'

export default function TransactionsPage() {
  const { data: session } = useSession()
  const { current } = useMonthStore()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)

  const load = useCallback(async () => {
    const [txns, cats, a] = await Promise.all([
      getTransactions(current),
      getCategories(),
      getAssetsWithBalance(),
    ])
    if (cats.length < DEFAULT_BUDGET_CATEGORY_COUNT && session?.user.id) {
      setCategories(await seedDefaultCategories(session.user.id))
    } else {
      setCategories(cats)
    }
    setTransactions(txns)
    setAssets(a)
  }, [current, session])

  useEffect(() => { load() }, [load])

  async function handleSubmit(
    data: Pick<Transaction, 'type' | 'amount' | 'category_id' | 'memo' | 'date'>,
    assetId?: string
  ) {
    if (!session?.user.id) return
    let txn: Transaction
    if (editing) {
      txn = await updateTransaction(editing.id, data, session.user.id)
    } else {
      txn = await createTransaction(data, session.user.id)
    }
    if (assetId) {
      await addManualLedgerEntry(assetId, data.amount, txn.id, session.user.id, data.memo ?? undefined)
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

  return (
    <>
      <TransactionList transactions={transactions} onEdit={t => { setEditing(t); setIsFormOpen(true) }} onDelete={handleDelete} />
      <FAB onClick={() => { setEditing(null); setIsFormOpen(true) }} />
      <Modal isOpen={isFormOpen} onClose={() => { setIsFormOpen(false); setEditing(null) }} title={editing ? '내역 수정' : '내역 추가'}>
        <TransactionForm categories={categories} assets={assets} initial={editing} onSubmit={handleSubmit} onCancel={() => { setIsFormOpen(false); setEditing(null) }} />
      </Modal>
    </>
  )
}
