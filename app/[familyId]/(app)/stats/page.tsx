'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useMonthStore } from '@/lib/monthStore'
import { getMonthlyStats, getTransactions, getCategories } from '@/lib/queries'
import { addMonths } from '@/lib/utils'
import type { Transaction, Category, MonthYear } from '@/types'
import MonthlyBarChart from '@/components/stats/MonthlyBarChart'
import CategoryPieChart from '@/components/stats/CategoryPieChart'

interface MonthStat extends MonthYear { income: number; expense: number }

export default function StatsPage() {
  const { familyId } = useParams<{ familyId: string }>()
  const { current } = useMonthStore()
  const [monthlyStats, setMonthlyStats] = useState<MonthStat[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])

  const load = useCallback(async () => {
    const last6 = Array.from({ length: 6 }, (_, i) => addMonths(current, -(5 - i)))
    const [stats, txns, cats] = await Promise.all([
      getMonthlyStats(familyId, last6),
      getTransactions(familyId, current),
      getCategories(familyId),
    ])
    setMonthlyStats(stats)
    setTransactions(txns)
    setCategories(cats)
  }, [familyId, current])

  useEffect(() => { load() }, [load])

  return (
    <div className="p-4">
      <MonthlyBarChart data={monthlyStats} />
      <CategoryPieChart transactions={transactions} categories={categories} />
    </div>
  )
}
