'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function FindIdPage() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
    const res = await fetch('/api/auth/find-id', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) {
      setError(data.error ?? '오류가 발생했습니다.')
    } else {
      setResult(data.username)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 items-center justify-center px-6">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow p-6 flex flex-col gap-5">
        <h1 className="text-xl font-bold text-gray-800">아이디 찾기</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input type="text" placeholder="이름" value={name} onChange={e => setName(e.target.value)} className="border border-gray-300 rounded-xl px-4 py-3 text-sm" required />
          <input type="tel" placeholder="전화번호" value={phone} onChange={e => setPhone(e.target.value)} className="border border-gray-300 rounded-xl px-4 py-3 text-sm" required />
          {error && <p className="text-red-500 text-xs">{error}</p>}
          {result && <p className="text-indigo-600 font-medium text-center">아이디: <strong>{result}</strong></p>}
          <button type="submit" disabled={loading} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium disabled:opacity-50">
            {loading ? '찾는 중...' : '찾기'}
          </button>
        </form>
        <Link href="/login" className="text-xs text-gray-400 underline text-center">로그인으로 돌아가기</Link>
      </div>
    </div>
  )
}
