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

// 급여 기준 월 범위: N월 = N/24 ~ (N+1)/23
export function getMonthRange(year: number, month: number): { start: string; end: string } {
  const start = `${year}-${String(month).padStart(2, '0')}-24`
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  const end = `${nextYear}-${String(nextMonth).padStart(2, '0')}-23`
  return { start, end }
}

// 날짜가 속하는 정산 월 계산 (24일 이전 → 전달, 24일 이후 → 당월)
export function getSettlementMonth(date: Date = new Date()): MonthYear {
  if (date.getDate() >= 24) {
    return { year: date.getFullYear(), month: date.getMonth() + 1 }
  }
  const prev = new Date(date.getFullYear(), date.getMonth() - 1, 1)
  return { year: prev.getFullYear(), month: prev.getMonth() + 1 }
}

export function addMonths(my: MonthYear, delta: number): MonthYear {
  const date = new Date(my.year, my.month - 1 + delta)
  return { year: date.getFullYear(), month: date.getMonth() + 1 }
}

export function formatMonthYear(my: MonthYear): string {
  return `${my.year}년 ${my.month}월`
}
