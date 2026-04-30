'use client'
import { usePathname } from 'next/navigation'
import { useMonthStore } from '@/lib/monthStore'
import { addMonths, formatMonthYear } from '@/lib/utils'

const HIDDEN_PATHS = ['/assets']

export default function MonthSelector() {
  const pathname = usePathname()
  const { current, setCurrent } = useMonthStore()

  if (HIDDEN_PATHS.includes(pathname)) return null

  return (
    <header className="sticky top-0 bg-white border-b border-gray-200 z-40 px-4 py-3 flex items-center justify-between">
      <button
        onClick={() => setCurrent(addMonths(current, -1))}
        className="p-2 rounded-full hover:bg-gray-100"
        aria-label="이전 달"
      >
        ‹
      </button>
      <span className="font-semibold text-gray-800">{formatMonthYear(current)}</span>
      <button
        onClick={() => setCurrent(addMonths(current, 1))}
        className="p-2 rounded-full hover:bg-gray-100"
        aria-label="다음 달"
      >
        ›
      </button>
    </header>
  )
}
