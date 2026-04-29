import type { MonthYear } from '@/types'

export function formatAmount(amount: number): string {
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export function formatAmountInput(value: string): string {
  const digits = value.replace(/[^0-9]/g, '')
  if (!digits) return ''
  return Number(digits).toLocaleString('ko-KR')
}

export function formatDate(dateStr: string): string {
  const [, month, day] = dateStr.split('-')
  return `${parseInt(month)}월 ${parseInt(day)}일`
}

export function getMonthRange(year: number, month: number): { start: string; end: string } {
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { start, end }
}

export function addMonths(my: MonthYear, delta: number): MonthYear {
  const date = new Date(my.year, my.month - 1 + delta)
  return { year: date.getFullYear(), month: date.getMonth() + 1 }
}

export function formatMonthYear(my: MonthYear): string {
  return `${my.year}년 ${my.month}월`
}
