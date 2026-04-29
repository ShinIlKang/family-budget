'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const ROLES = ['엄마', '아빠', '아들', '딸', '기타']

export default function SignupPage() {
  const router = useRouter()
  const [form, setForm] = useState({ username: '', password: '', name: '', phone: '', role: '엄마', inviteCode: '' })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) {
      setError(data.error ?? '회원가입 중 오류가 발생했습니다.')
    } else {
      router.replace('/login')
    }
  }

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 items-center justify-center px-6">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow p-6 flex flex-col gap-5">
        <div>
          <h1 className="text-xl font-bold text-gray-800">회원가입</h1>
          <p className="text-sm text-gray-400 mt-1">초대 코드가 필요합니다</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input type="text" placeholder="초대 코드" value={form.inviteCode} onChange={set('inviteCode')} className="border border-gray-300 rounded-xl px-4 py-3 text-sm" required />
          <input type="text" placeholder="아이디" value={form.username} onChange={set('username')} className="border border-gray-300 rounded-xl px-4 py-3 text-sm" required />
          <input type="password" placeholder="비밀번호" value={form.password} onChange={set('password')} className="border border-gray-300 rounded-xl px-4 py-3 text-sm" required />
          <input type="text" placeholder="이름" value={form.name} onChange={set('name')} className="border border-gray-300 rounded-xl px-4 py-3 text-sm" required />
          <input type="tel" placeholder="전화번호 (아이디 찾기에 사용)" value={form.phone} onChange={set('phone')} className="border border-gray-300 rounded-xl px-4 py-3 text-sm" />
          <select value={form.role} onChange={set('role')} className="border border-gray-300 rounded-xl px-4 py-3 text-sm">
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <button type="submit" disabled={loading} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium disabled:opacity-50">
            {loading ? '가입 중...' : '가입하기'}
          </button>
        </form>
        <Link href="/login" className="text-xs text-gray-400 underline text-center">이미 계정이 있으신가요?</Link>
      </div>
    </div>
  )
}
