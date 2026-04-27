'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useMonthStore } from '@/lib/monthStore'
import { getTransactions, createTransaction, updateTransaction, deleteTransaction, getCategories, seedDefaultCategories } from '@/lib/queries'
import type { Transaction, Category } from '@/types'
import TransactionList from '@/components/transactions/TransactionList'
import TransactionForm from '@/components/transactions/TransactionForm'
import Modal from '@/components/ui/Modal'
import FAB from '@/components/ui/FAB'

export default function TransactionsPage() {
  const { familyId } = useParams<{ familyId: string }>()
  const { current } = useMonthStore()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)

  const load = useCallback(async () => {
    const [txns, cats] = await Promise.all([
      getTransactions(familyId, current),
      getCategories(familyId),
    ])
    if (cats.length === 0) {
      await seedDefaultCategories(familyId)
      setCategories(await getCategories(familyId))
    } else {
      setCategories(cats)
    }
    setTransactions(txns)
  }, [familyId, current])

  useEffect(() => { load() }, [load])

  async function handleSubmit(data: Pick<Transaction, 'type' | 'amount' | 'category_id' | 'memo' | 'date'>) {
    if (editing) {
      await updateTransaction(editing.id, data)
    } else {
      await createTransaction(familyId, data)
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
          initial={editing}
          onSubmit={handleSubmit}
          onCancel={() => { setIsFormOpen(false); setEditing(null) }}
        />
      </Modal>
    </>
  )
}
