import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import bcrypt from 'bcryptjs'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { currentPassword, newPassword } = await req.json()
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: '현재/새 비밀번호를 입력해 주세요.' }, { status: 400 })
  }

  const { data: member } = await supabase
    .from('members')
    .select('password_hash')
    .eq('id', session.user.id)
    .single()

  if (!member) return NextResponse.json({ error: '계정을 찾을 수 없습니다.' }, { status: 404 })

  const valid = await bcrypt.compare(currentPassword, member.password_hash)
  if (!valid) return NextResponse.json({ error: '현재 비밀번호가 올바르지 않습니다.' }, { status: 400 })

  const newHash = await bcrypt.hash(newPassword, 10)
  await supabase.from('members').update({ password_hash: newHash }).eq('id', session.user.id)

  return NextResponse.json({ ok: true })
}
