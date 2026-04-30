'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { updateSettings } from '@/lib/queries'
import Step1Assets from './Step1Assets'

export default function OnboardingWizard() {
  const { data: session } = useSession()
  const router = useRouter()

  async function handleComplete() {
    await updateSettings(session?.user.id ?? '', { onboarding_completed: true })
    router.replace('/settlement')
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-2 pb-4">
        <p className="text-xs font-medium text-indigo-600">자산 현황 등록</p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        <Step1Assets onNext={handleComplete} />
      </div>
    </div>
  )
}
