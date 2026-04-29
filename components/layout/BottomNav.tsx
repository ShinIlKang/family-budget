'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/',             label: '홈',     icon: '🏠' },
  { href: '/transactions', label: '내역',   icon: '📋' },
  { href: '/budgets',      label: '예산',   icon: '🎯' },
  { href: '/fixed-items',  label: '고정비', icon: '📌' },
  { href: '/assets',       label: '자산',   icon: '💰' },
  { href: '/stats',        label: '통계',   icon: '📈' },
  { href: '/profile',      label: '내 정보', icon: '👤' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-50">
      {tabs.map(tab => {
        const isActive = tab.href === '/'
          ? pathname === '/'
          : pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex-1 flex flex-col items-center py-2 text-[10px] gap-1 ${
              isActive ? 'text-indigo-600' : 'text-gray-500'
            }`}
          >
            <span className="text-xl">{tab.icon}</span>
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
