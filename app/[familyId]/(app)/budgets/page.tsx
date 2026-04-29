'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useMonthStore } from '@/lib/monthStore'
import { getBudgetsWithUsage, upsertBudget, getCategories, seedDefaultCategories } from '@/lib/queries'
import type { BudgetWithUsage, Category } from '@/types'
import BudgetCard from '@/components/budgets/BudgetCard'
import BudgetForm from '@/components/budgets/BudgetForm'
import Modal from '@/components/ui/Modal'

export default function BudgetsPage() {
  const { familyId } = useParams<{ familyId: string }>()
  const { current } = useMonthStore()
  const [budgets, setBudgets] = useState<BudgetWithUsage[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [editing, setEditing] = useState<BudgetWithUsage | null>(null)

  const load = useCallback(async () => {
    let cats = await getCategories(familyId)
    if (cats.length === 0) {
      await seedDefaultCategories(familyId)
      cats = await getCategories(familyId)
    }
    setCategories(cats)
    setBudgets(await getBudgetsWithUsage(familyId, current))
  }, [familyId, current])

  useEffect(() => { load() }, [load])

  async function handleSave(amount: number) {
    if (!editing) return
    await upsertBudget(familyId, editing.category_id, current, amount)
    setEditing(null)
    await load()
  }

  // 카테고리 목록 기준으로 전체 항목 구성 (예산 미설정 카테고리도 포함)
  const allItems = categories.map(cat => {
    const existing = budgets.find(b => b.category_id === cat.id)
    return existing ?? {
      id: '',
      family_id: familyId,
      category_id: cat.id,
      amount: 0,
      year: current.year,
      month: current.month,
      used: 0,
      category: cat,
    } as BudgetWithUsage
  })

  return (
    <div className="p-4">
      {allItems.map(item => (
        <BudgetCard key={item.category_id} budget={item} onEdit={setEditing} />
      ))}
      <Modal
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        title="예산 설정"
      >
        {editing && (
          <BudgetForm
            categoryName={editing.category.name}
            categoryIcon={editing.category.icon}
            currentAmount={editing.amount}
            onSubmit={handleSave}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>
    </div>
  )
}
