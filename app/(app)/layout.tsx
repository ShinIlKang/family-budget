import type { ReactNode } from 'react'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getSettings, getSettlementForMonth } from '@/lib/queries'
import { getSettlementMonth } from '@/lib/utils'
import BottomNav from '@/components/layout/BottomNav'
import MonthSelector from '@/components/layout/MonthSelector'

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  const settings = await getSettings()
  if (!settings?.onboarding_completed) {
    redirect(session.user.isMaster ? '/onboarding' : '/pending')
  }

  const currentMonth = getSettlementMonth()
  const settlement = await getSettlementForMonth(currentMonth)
  if (!settlement?.completed_at) {
    redirect('/settlement')
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <MonthSelector />
      <main className="flex-1 min-h-0 overflow-y-auto pb-16">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
