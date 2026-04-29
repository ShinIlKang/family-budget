'use client'
import { useState, useEffect, useCallback } from 'react'
import type { BudgetWithUsage, Category } from '@/types'
import { getBudgetsWithUsage, upsertBudget, getCategories, seedDefaultCategories, updateFamily } from '@/lib/queries'
import { useMonthStore } from '@/lib/monthStore'
import BudgetCard from '@/components/budgets/BudgetCard'
import BudgetForm from '@/components/budgets/BudgetForm'
import Modal from '@/components/ui/Modal'
import { useRouter } from 'next/navigation'

interface Props {
  familyId: string
  onBack: () => void
}

export default function Step4Budgets({ familyId, onBack }: Props) {
  const { current } = useMonthStore()
  const router = useRouter()
  const [budgets, setBudgets] = useState<BudgetWithUsage[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [editing, setEditing] = useState<BudgetWithUsage | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    try {
      let cats = await getCategories(familyId)
      if (cats.length === 0) {
        await seedDefaultCategories(familyId)
        cats = await getCategories(familyId)
      }
      setCategories(cats)
      setBudgets(await getBudgetsWithUsage(familyId, current))
    } catch (e) {
      console.error('예산 로드 실패:', e)
    }
  }, [familyId, current])

  useEffect(() => { load() }, [load])

  async function handleSave(amount: number) {
    if (!editing) return
    try {
      await upsertBudget(familyId, editing.category_id, current, amount)
      setEditing(null)
      await load()
    } catch (e) {
      console.error('예산 저장 실패:', e)
    }
  }

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

  async function handleComplete() {
    setLoading(true)
    try {
      await updateFamily(familyId, { onboarding_completed: true })
      router.replace(`/${familyId}`)
    } catch (e) {
      console.error('온보딩 완료 실패:', e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-500">카테고리별 월 예산을 설정하세요. 나중에 수정할 수 있습니다.</p>

      <div className="flex flex-col gap-2">
        {allItems.map(item => (
          <BudgetCard key={item.category_id} budget={item} onEdit={item => setEditing(item)} />
        ))}
      </div>

      <div className="flex gap-2 mt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-600 font-medium"
        >
          이전
        </button>
        <button
          type="button"
          onClick={handleComplete}
          disabled={loading}
          className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-medium disabled:opacity-50"
        >
          {loading ? '저장 중...' : '완료'}
        </button>
      </div>

      <Modal isOpen={editing !== null} onClose={() => setEditing(null)} title="예산 설정">
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
