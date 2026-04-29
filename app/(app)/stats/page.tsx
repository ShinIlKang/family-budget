'use client'
import { useEffect, useState } from 'react'
import { useMonthStore } from '@/lib/monthStore'
import { getMonthlyStats, getTransactions, getCategories } from '@/lib/queries'
import type { MonthYear, Transaction, Category } from '@/types'
import MonthlyBarChart from '@/components/stats/MonthlyBarChart'
import CategoryPieChart from '@/components/stats/CategoryPieChart'

export default function StatsPage() {
  const { current } = useMonthStore()
  const [monthlyData, setMonthlyData] = useState<Array<MonthYear & { income: number; expense: number }>>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    const months: MonthYear[] = []
    for (let i = 5; i >= 0; i--) {
      let { year, month } = current
      month -= i
      while (month <= 0) { month += 12; year-- }
      months.push({ year, month })
    }
    Promise.all([
      getMonthlyStats(months),
      getTransactions(current),
      getCategories(),
    ]).then(([stats, txns, cats]) => {
      setMonthlyData(stats)
      setTransactions(txns)
      setCategories(cats)
    })
  }, [current])

  return (
    <div className="p-4 flex flex-col gap-6">
      <MonthlyBarChart data={monthlyData} />
      <CategoryPieChart transactions={transactions} categories={categories} />
    </div>
  )
}
