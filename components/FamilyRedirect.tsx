'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { nanoid } from 'nanoid'

export default function FamilyRedirect() {
  const router = useRouter()

  useEffect(() => {
    let familyId = localStorage.getItem('familyId')
    if (!familyId) {
      familyId = nanoid(12)
      localStorage.setItem('familyId', familyId)
    }
    router.replace(`/${familyId}`)
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-500">로딩 중...</p>
    </div>
  )
}
