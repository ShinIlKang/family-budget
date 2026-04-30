import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { supabase } from '@/lib/supabase'

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

// GET: 초대 코드 목록 (master 전용)
export async function GET() {
  const session = await auth()
  if (!session?.user?.isMaster) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data } = await supabase
    .from('invite_codes')
    .select('*')
    .order('created_at', { ascending: false })

  return NextResponse.json(data ?? [])
}

// POST: 초대 코드 생성 (master 전용)
export async function POST() {
  const session = await auth()
  if (!session?.user?.isMaster) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const code = generateCode()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('invite_codes')
    .insert({ code, created_by: session.user.id, expires_at: expiresAt })
    .select()
    .single()

  if (error) return NextResponse.json({ error: '생성 실패' }, { status: 500 })
  return NextResponse.json(data)
}
