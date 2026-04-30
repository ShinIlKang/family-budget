import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getSettings } from '@/lib/queries'
import SettlementWizard from '@/components/settlement/SettlementWizard'

export default async function SettlementPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const settings = await getSettings()
  if (!settings?.onboarding_completed) {
    redirect(session.user.isMaster ? '/onboarding' : '/pending')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SettlementWizard />
    </div>
  )
}
