'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useMonthStore } from '@/lib/monthStore'
import { getMonthlySummary, getTransactions, getBudgetsWithUsage, getCategories, seedDefaultCategories, getFixedItemsSummary, getAssetsSummary } from '@/lib/queries'
import type { BudgetWithUsage, Transaction, AssetCategory } from '@/types'
import SummaryCards from '@/components/dashboard/SummaryCards'
import BudgetOverview from '@/components/dashboard/BudgetOverview'
import RecentTransactions from '@/components/dashboard/RecentTransactions'
import FixedItemsSummaryCard from '@/components/dashboard/FixedItemsSummaryCard'
import AssetSummaryCard from '@/components/dashboard/AssetSummaryCard'

export default function DashboardPage() {
  const { familyId } = useParams<{ familyId: string }>()
  const { current } = useMonthStore()
  const [summary, setSummary] = useState({ income: 0, expense: 0 })
  const [fixedSummary, setFixedSummary] = useState({ total: 0, activeCount: 0 })
  const [budgets, setBudgets] = useState<BudgetWithUsage[]>([])
  const [recentTxns, setRecentTxns] = useState<Transaction[]>([])
  const [assetSummary, setAssetSummary] = useState<{ total: number; byCategory: Record<AssetCategory, number> }>({
    total: 0,
    byCategory: { 금융: 0, 투자: 0, 보증금: 0 },
  })

  const load = useCallback(async () => {
    const cats = await getCategories(familyId)
    if (cats.length === 0) {
      await seedDefaultCategories(familyId)
    }
    const [sum, bdg, txns, fixedSum, assetSum] = await Promise.all([
      getMonthlySummary(familyId, current),
      getBudgetsWithUsage(familyId, current),
      getTransactions(familyId, current),
      getFixedItemsSummary(familyId),
      getAssetsSummary(familyId),
    ])
    setSummary(sum)
    setBudgets(bdg)
    setRecentTxns(txns)
    setFixedSummary(fixedSum)
    setAssetSummary(assetSum)
  }, [familyId, current])

  useEffect(() => { load() }, [load])

  return (
    <div>
      <SummaryCards income={summary.income} expense={summary.expense} />
      <FixedItemsSummaryCard
        familyId={familyId}
        total={fixedSummary.total}
        activeCount={fixedSummary.activeCount}
      />
      <AssetSummaryCard
        familyId={familyId}
        total={assetSummary.total}
        byCategory={assetSummary.byCategory}
      />
      <BudgetOverview budgets={budgets} />
      <RecentTransactions transactions={recentTxns} />
    </div>
  )
}
