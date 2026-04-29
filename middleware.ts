import { auth } from '@/auth'
import { NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/login', '/signup', '/find-id']

export default auth(async function middleware(req) {
  const { pathname } = req.nextUrl
  const session = req.auth
  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p))

  // 비로그인 → 공개 경로 허용, 나머지는 로그인으로
  if (!session) {
    if (isPublic) return NextResponse.next()
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // 로그인 상태에서 공개 경로 → 홈으로
  if (isPublic) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
