import type { ReactNode } from 'react'
import BottomNav from '@/components/layout/BottomNav'
import MonthSelector from '@/components/layout/MonthSelector'

interface Props {
  children: ReactNode
  params: Promise<{ familyId: string }>
}

export default async function FamilyLayout({ children, params }: Props) {
  const { familyId } = await params
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <MonthSelector />
      <main className="flex-1 overflow-y-auto pb-16">
        {children}
      </main>
      <BottomNav familyId={familyId} />
    </div>
  )
}
