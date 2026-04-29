'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { nanoid } from 'nanoid'
import { getOrCreateFamily } from '@/lib/queries'

export default function FamilyRedirect() {
  const router = useRouter()

  useEffect(() => {
    async function init() {
      let familyId = localStorage.getItem('familyId')
      if (!familyId) {
        familyId = nanoid(12)
        localStorage.setItem('familyId', familyId)
      }
      const family = await getOrCreateFamily(familyId)
      if (family.onboarding_completed) {
        router.replace(`/${familyId}`)
      } else {
        router.replace(`/${familyId}/onboarding`)
      }
    }
    init().catch(err => console.error('FamilyRedirect init 실패:', err))
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-500">로딩 중...</p>
    </div>
  )
}
