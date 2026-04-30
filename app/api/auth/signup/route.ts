import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { username, password, name, phone, role, inviteCode } = await req.json()

  if (!username || !password || !name || !role || !inviteCode) {
    return NextResponse.json({ error: '필수 항목을 모두 입력해 주세요.' }, { status: 400 })
  }

  // 온보딩 완료 확인
  const { data: settings } = await supabase
    .from('settings')
    .select('onboarding_completed')
    .single()
  if (!settings?.onboarding_completed) {
    return NextResponse.json({ error: '아직 초기 설정이 완료되지 않았습니다.' }, { status: 403 })
  }

  // 초대 코드 확인
  const { data: code } = await supabase
    .from('invite_codes')
    .select('*')
    .eq('code', inviteCode)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()
  if (!code) {
    return NextResponse.json({ error: '유효하지 않은 초대 코드입니다.' }, { status: 400 })
  }

  // username 중복 확인
  const { data: existing } = await supabase
    .from('members')
    .select('id')
    .eq('username', username)
    .single()
  if (existing) {
    return NextResponse.json({ error: '이미 사용 중인 아이디입니다.' }, { status: 400 })
  }

  const password_hash = await bcrypt.hash(password, 10)

  const { error: insertErr } = await supabase
    .from('members')
    .insert({ username, password_hash, name, phone: phone || null, role, is_master: false })
  if (insertErr) {
    return NextResponse.json({ error: '회원가입 중 오류가 발생했습니다.' }, { status: 500 })
  }

  // 초대 코드 사용 처리
  await supabase
    .from('invite_codes')
    .update({ used_at: new Date().toISOString() })
    .eq('code', inviteCode)

  return NextResponse.json({ ok: true })
}
