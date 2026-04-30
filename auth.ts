import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { supabase } from '@/lib/supabase'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: 'Username' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const username = credentials?.username as string
        const password = credentials?.password as string
        if (!username || !password) return null

        const { data: member, error } = await supabase
          .from('members')
          .select('id, username, password_hash, name, role, is_master')
          .eq('username', username)
          .single()

        if (error || !member) return null
        const valid = await bcrypt.compare(password, member.password_hash)
        if (!valid) return null

        return {
          id: member.id,
          name: member.name,
          username: member.username,
          role: member.role,
          isMaster: member.is_master,
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string
        token.username = (user as { username: string }).username
        token.role = (user as { role: string }).role
        token.isMaster = (user as { isMaster: boolean }).isMaster
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.id as string
      session.user.username = token.username as string
      session.user.role = token.role as string
      session.user.isMaster = token.isMaster as boolean
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: { strategy: 'jwt' },
})
