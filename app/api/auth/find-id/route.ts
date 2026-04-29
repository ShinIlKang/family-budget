import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { name, phone } = await req.json()
  if (!name || !phone) {
    return NextResponse.json({ error: '이름과 전화번호를 입력해 주세요.' }, { status: 400 })
  }

  const { data: member } = await supabase
    .from('members')
    .select('username')
    .eq('name', name)
    .eq('phone', phone)
    .single()

  if (!member) {
    return NextResponse.json({ error: '일치하는 계정을 찾을 수 없습니다.' }, { status: 404 })
  }

  return NextResponse.json({ username: member.username })
}
