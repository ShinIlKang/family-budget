'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const result = await signIn('credentials', { username, password, redirect: false })
    setLoading(false)
    if (result?.error) {
      setError('아이디 또는 비밀번호가 올바르지 않습니다.')
    } else {
      router.replace('/')
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 items-center justify-center px-6">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow p-6 flex flex-col gap-5">
        <div>
          <h1 className="text-xl font-bold text-gray-800">로그인</h1>
          <p className="text-sm text-gray-400 mt-1">가족 가계부에 오신 것을 환영합니다</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input type="text" placeholder="아이디" value={username} onChange={e => setUsername(e.target.value)} className="border border-gray-300 rounded-xl px-4 py-3 text-sm" autoComplete="username" required />
          <input type="password" placeholder="비밀번호" value={password} onChange={e => setPassword(e.target.value)} className="border border-gray-300 rounded-xl px-4 py-3 text-sm" autoComplete="current-password" required />
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <button type="submit" disabled={loading} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium disabled:opacity-50">
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
        <div className="flex justify-between text-xs text-gray-400">
          <Link href="/find-id" className="underline">아이디 찾기</Link>
          <Link href="/signup" className="underline">회원가입</Link>
        </div>
      </div>
    </div>
  )
}
