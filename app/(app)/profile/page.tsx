'use client'

import { useEffect, useState } from 'react'
import { signOut, useSession } from 'next-auth/react'
import InviteCodeManager from '@/components/profile/InviteCodeManager'
import { getMemberCreatedData } from '@/lib/queries'
import { formatAmount } from '@/lib/utils'

interface CreatedData {
  transactions: Array<{ id: string; type: string; amount: number; date: string; memo: string | null }>
  assets: Array<{ id: string; name: string; category: string; initial_balance: number }>
  fixedItems: Array<{ id: string; name: string; amount: number; group_name: string }>
}

type ProfileTab = 'transactions' | 'assets' | 'fixedItems'

export default function ProfilePage() {
  const { data: session } = useSession()
  const [createdData, setCreatedData] = useState<CreatedData | null>(null)
  const [tab, setTab] = useState<ProfileTab>('transactions')

  useEffect(() => {
    if (!session?.user.id || session.user.isMaster) return

    let active = true
    getMemberCreatedData(session.user.id).then(data => {
      if (active) setCreatedData(data)
    })

    return () => {
      active = false
    }
  }, [session?.user.id, session?.user.isMaster])

  if (!session) return null

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-20">
      <div className="bg-indigo-600 px-4 py-5 text-white">
        <h1 className="text-lg font-bold">내 정보</h1>
        <p className="mt-1 text-sm text-indigo-200">
          {session.user.name} · {session.user.role}
        </p>
      </div>

      <div className="mx-4 mt-4 rounded-2xl bg-white p-4 shadow-sm">
        {!session.user.isMaster && (
          <div className="mb-3">
            <p className="text-xs text-gray-400">아이디</p>
            <p className="text-sm font-medium">{session.user.username}</p>
          </div>
        )}
        <PasswordResetForm />
      </div>

      {session.user.isMaster && (
        <div className="mx-4 mt-3 rounded-2xl bg-white p-4 shadow-sm">
          <InviteCodeManager />
        </div>
      )}

      {!session.user.isMaster && createdData && (
        <div className="mx-4 mt-3 rounded-2xl bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-medium text-gray-700">내가 입력한 데이터</p>
          <div className="mb-3 flex gap-2">
            {(['transactions', 'assets', 'fixedItems'] as const).map(item => (
              <button
                key={item}
                type="button"
                onClick={() => setTab(item)}
                className={`rounded-full px-3 py-1 text-xs ${
                  tab === item ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {item === 'transactions' ? '거래내역' : item === 'assets' ? '자산' : '고정비'}
              </button>
            ))}
          </div>

          {tab === 'transactions' && (
            <div className="space-y-1">
              {createdData.transactions.map(item => (
                <div key={item.id} className="flex justify-between py-1 text-sm">
                  <span className="text-gray-600">
                    {item.date} {item.memo ?? ''}
                  </span>
                  <span className={item.type === 'income' ? 'text-blue-600' : 'text-red-500'}>
                    {formatAmount(item.amount)}원
                  </span>
                </div>
              ))}
            </div>
          )}

          {tab === 'assets' && (
            <div className="space-y-1">
              {createdData.assets.map(item => (
                <div key={item.id} className="flex justify-between py-1 text-sm">
                  <span className="text-gray-600">
                    {item.name} ({item.category})
                  </span>
                  <span className="text-emerald-600">{formatAmount(item.initial_balance)}원</span>
                </div>
              ))}
            </div>
          )}

          {tab === 'fixedItems' && (
            <div className="space-y-1">
              {createdData.fixedItems.map(item => (
                <div key={item.id} className="flex justify-between py-1 text-sm">
                  <span className="text-gray-600">
                    {item.name} ({item.group_name})
                  </span>
                  <span className="text-gray-700">{formatAmount(item.amount)}원</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => signOut({ callbackUrl: '/login' })}
        className="mx-4 mt-4 rounded-xl border border-gray-200 py-3 text-center text-sm text-gray-500"
      >
        로그아웃
      </button>
    </div>
  )
}

function PasswordResetForm() {
  const { data: session } = useSession()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!session?.user.id) return

    setLoading(true)
    setMessage(null)

    const response = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    })
    const data = await response.json()

    setLoading(false)
    setMessage(response.ok ? '비밀번호가 변경되었습니다.' : (data.error ?? '오류가 발생했습니다.'))

    if (response.ok) {
      setCurrentPassword('')
      setNewPassword('')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <p className="text-xs font-medium text-gray-400">비밀번호 재설정</p>
      <input
        type="password"
        placeholder="현재 비밀번호"
        value={currentPassword}
        onChange={event => setCurrentPassword(event.target.value)}
        className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        required
      />
      <input
        type="password"
        placeholder="새 비밀번호"
        value={newPassword}
        onChange={event => setNewPassword(event.target.value)}
        className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        required
      />
      {message && (
        <p className={`text-xs ${message.includes('변경') ? 'text-green-600' : 'text-red-500'}`}>
          {message}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-gray-100 py-2 text-sm font-medium text-gray-700 disabled:opacity-50"
      >
        {loading ? '변경 중...' : '변경'}
      </button>
    </form>
  )
}
