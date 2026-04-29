'use client'
import { signOut } from 'next-auth/react'

export default function PendingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 items-center justify-center px-6 text-center">
      <div className="text-4xl mb-4">🔒</div>
      <h1 className="text-xl font-bold text-gray-800 mb-2">아직 사용할 수 없어요</h1>
      <p className="text-sm text-gray-500 mb-6">
        관리자가 초기 설정을 완료한 후 사용할 수 있습니다.<br />
        설정이 완료되면 다시 접속해 주세요.
      </p>
      <button onClick={() => signOut({ callbackUrl: '/login' })} className="text-sm text-gray-400 underline">
        로그아웃
      </button>
    </div>
  )
}
