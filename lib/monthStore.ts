import { create } from 'zustand'
import type { MonthYear } from '@/types'

interface MonthStore {
  current: MonthYear
  setCurrent: (my: MonthYear) => void
}

const now = new Date()

export const useMonthStore = create<MonthStore>(set => ({
  current: { year: now.getFullYear(), month: now.getMonth() + 1 },
  setCurrent: (current) => set({ current }),
}))
