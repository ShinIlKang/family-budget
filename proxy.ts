import { auth } from '@/auth'
import { NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/login', '/signup', '/find-id']

export default auth(async function proxy(req) {
  const { pathname } = req.nextUrl
  const session = req.auth
  const isPublic = PUBLIC_PATHS.some(path => pathname.startsWith(path))

  if (!session) {
    if (isPublic) return NextResponse.next()
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (isPublic) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
