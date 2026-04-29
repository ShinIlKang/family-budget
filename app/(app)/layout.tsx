import type { ReactNode } from 'react'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getSettings } from '@/lib/queries'
import BottomNav from '@/components/layout/BottomNav'
import MonthSelector from '@/components/layout/MonthSelector'

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  const settings = await getSettings()
  if (!settings?.onboarding_completed) {
    redirect(session.user.isMaster ? '/onboarding' : '/pending')
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <MonthSelector />
      <main className="flex-1 overflow-y-auto pb-16">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
