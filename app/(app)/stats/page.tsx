'use client'
import { useEffect, useState } from 'react'
import { useMonthStore } from '@/lib/monthStore'
import { getMonthlyStats, getTransactions, getCategories, getFixedItems, getMonthlyFixedTotals } from '@/lib/queries'
import type { MonthYear, Transaction, Category, FixedItem } from '@/types'
import MonthlyBarChart from '@/components/stats/MonthlyBarChart'
import CategoryPieChart from '@/components/stats/CategoryPieChart'
import FixedItemsGroupChart from '@/components/stats/FixedItemsGroupChart'
import FixedMonthlyTrendChart from '@/components/stats/FixedMonthlyTrendChart'

export default function StatsPage() {
  const { current } = useMonthStore()
  const [monthlyData, setMonthlyData] = useState<Array<MonthYear & { income: number; expense: number }>>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [fixedItems, setFixedItems] = useState<FixedItem[]>([])
  const [fixedTrend, setFixedTrend] = useState<Array<MonthYear & { total: number }>>([])

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
      getFixedItems(current.year, current.month),
      getMonthlyFixedTotals(months),
    ]).then(([stats, txns, cats, fixed, trend]) => {
      setMonthlyData(stats)
      setTransactions(txns)
      setCategories(cats)
      setFixedItems(fixed)
      setFixedTrend(trend)
    })
  }, [current])

  return (
    <div className="p-4 flex flex-col gap-6">
      <MonthlyBarChart data={monthlyData} />
      <CategoryPieChart transactions={transactions} categories={categories} />
      <FixedItemsGroupChart items={fixedItems} />
      <FixedMonthlyTrendChart data={fixedTrend} currentMonth={current} />
    </div>
  )
}
