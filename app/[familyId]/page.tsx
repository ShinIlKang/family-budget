'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useMonthStore } from '@/lib/monthStore'
import { getMonthlySummary, getTransactions, getBudgetsWithUsage, getCategories, seedDefaultCategories } from '@/lib/queries'
import type { BudgetWithUsage, Transaction } from '@/types'
import SummaryCards from '@/components/dashboard/SummaryCards'
import BudgetOverview from '@/components/dashboard/BudgetOverview'
import RecentTransactions from '@/components/dashboard/RecentTransactions'

export default function DashboardPage() {
  const { familyId } = useParams<{ familyId: string }>()
  const { current } = useMonthStore()
  const [summary, setSummary] = useState({ income: 0, expense: 0 })
  const [budgets, setBudgets] = useState<BudgetWithUsage[]>([])
  const [recentTxns, setRecentTxns] = useState<Transaction[]>([])

  const load = useCallback(async () => {
    const cats = await getCategories(familyId)
    if (cats.length === 0) {
      await seedDefaultCategories(familyId)
    }
    const [sum, bdg, txns] = await Promise.all([
      getMonthlySummary(familyId, current),
      getBudgetsWithUsage(familyId, current),
      getTransactions(familyId, current),
    ])
    setSummary(sum)
    setBudgets(bdg)
    setRecentTxns(txns)
  }, [familyId, current])

  useEffect(() => { load() }, [load])

  return (
    <div>
      <SummaryCards income={summary.income} expense={summary.expense} />
      <BudgetOverview budgets={budgets} />
      <RecentTransactions transactions={recentTxns} />
    </div>
  )
}
