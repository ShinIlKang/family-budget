'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useMonthStore } from '@/lib/monthStore'
import { getBudgetsWithUsage, upsertBudget, getCategories, seedDefaultCategories } from '@/lib/queries'
import { DEFAULT_BUDGET_CATEGORY_COUNT } from '@/types'
import type { BudgetWithUsage, Category } from '@/types'
import BudgetCard from '@/components/budgets/BudgetCard'
import BudgetForm from '@/components/budgets/BudgetForm'
import Modal from '@/components/ui/Modal'

export default function BudgetsPage() {
  const { data: session } = useSession()
  const { current } = useMonthStore()
  const [budgets, setBudgets] = useState<BudgetWithUsage[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [editing, setEditing] = useState<BudgetWithUsage | null>(null)

  const load = useCallback(async () => {
    let cats = await getCategories()
    if (cats.length < DEFAULT_BUDGET_CATEGORY_COUNT && session?.user.id) {
      cats = await seedDefaultCategories(session.user.id)
    }
    setCategories(cats)
    setBudgets(await getBudgetsWithUsage(current))
  }, [current, session])

  useEffect(() => { load() }, [load])

  async function handleSave(amount: number) {
    if (!editing || !session?.user.id) return
    await upsertBudget(editing.category_id, current, amount, session.user.id)
    setEditing(null)
    await load()
  }

  const allItems = categories.map(cat => {
    const existing = budgets.find(b => b.category_id === cat.id)
    return existing ?? {
      id: '', category_id: cat.id, amount: 0,
      year: current.year, month: current.month,
      used: 0, category: cat,
      created_by: session?.user.id ?? '',
      updated_by: null,
    } as BudgetWithUsage
  })

  return (
    <div className="p-4">
      {allItems.map(item => (
        <BudgetCard key={item.category_id} budget={item} onEdit={setEditing} />
      ))}
      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="예산 설정">
        {editing && (
          <BudgetForm categoryName={editing.category.name} categoryIcon={editing.category.icon} currentAmount={editing.amount} onSubmit={handleSave} onCancel={() => setEditing(null)} />
        )}
      </Modal>
    </div>
  )
}
