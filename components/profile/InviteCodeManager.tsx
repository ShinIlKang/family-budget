'use client'
import { useState, useEffect } from 'react'

interface InviteCode {
  code: string
  expires_at: string
  used_at: string | null
}

export default function InviteCodeManager() {
  const [codes, setCodes] = useState<InviteCode[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/invite-codes').then(r => r.json()).then(setCodes)
  }, [])

  async function generate() {
    setLoading(true)
    const res = await fetch('/api/invite-codes', { method: 'POST' })
    const newCode = await res.json()
    setCodes(prev => [newCode, ...prev])
    setLoading(false)
  }

  const active = codes.filter(c => !c.used_at && new Date(c.expires_at) > new Date())
  const expired = codes.filter(c => c.used_at || new Date(c.expires_at) <= new Date())

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">초대 코드 관리</p>
        <button onClick={generate} disabled={loading} className="text-sm text-indigo-600 font-medium disabled:opacity-50">+ 생성</button>
      </div>
      {active.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-gray-400">사용 가능 (24시간)</p>
          {active.map(c => (
            <div key={c.code} className="flex items-center justify-between bg-indigo-50 rounded-lg px-3 py-2">
              <span className="font-mono text-sm font-bold text-indigo-700">{c.code}</span>
              <button onClick={() => navigator.clipboard.writeText(c.code)} className="text-xs text-indigo-600">복사</button>
            </div>
          ))}
        </div>
      )}
      {expired.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-xs text-gray-400">사용됨 / 만료</p>
          {expired.map(c => (
            <div key={c.code} className="flex items-center justify-between px-3 py-1">
              <span className="font-mono text-sm text-gray-400 line-through">{c.code}</span>
              <span className="text-xs text-gray-400">{c.used_at ? '사용됨' : '만료'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
