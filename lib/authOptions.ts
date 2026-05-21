import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { supabaseServer } from '@/lib/supabaseServer'
import { refreshGoogleAccessToken } from '@/lib/googleCalendar'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/calendar.events',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email:               { label: 'Email',               type: 'email' },
        password:            { label: 'Password',            type: 'password' },
        name:                { label: 'Name',                type: 'text' },
        role:                { label: 'Role',                type: 'text' },
        isSignUp:            { label: 'Is Sign Up',          type: 'text' },
        medicalCouncil:      { label: 'Medical Council',     type: 'text' },
        registrationNumber:  { label: 'Registration Number', type: 'text' },
        registrationYear:    { label: 'Registration Year',   type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const email = credentials.email.toLowerCase().trim()

        // ── Admin login — no Supabase, credentials from env ──────────────
        if (
          credentials.role === 'admin' &&
          email === (process.env.ADMIN_EMAIL ?? '').toLowerCase() &&
          credentials.password === process.env.ADMIN_PASSWORD
        ) {
          return {
            id: 'admin',
            email,
            name: 'Admin',
            role: 'admin',
          }
        }

        const role = (credentials.role === 'doctor' ? 'doctor' : 'patient') as 'doctor' | 'patient'

        const { data: existing } = await supabaseServer
          .from('users')
          .select('id, email, full_name, avatar_url, role, password_hash')
          .eq('email', email)
          .single()

        if (credentials.isSignUp === 'true') {
          if (existing) {
            throw new Error('An account with this email already exists. Please sign in.')
          }

          const password_hash = await bcrypt.hash(credentials.password, 12)

          const { data: newUser, error } = await supabaseServer
            .from('users')
            .insert({
              email,
              full_name: credentials.name ?? email.split('@')[0],
              role,
              password_hash,
            })
            .select('id, email, full_name, avatar_url, role')
            .single()

          if (error || !newUser) throw new Error('Failed to create account. Please try again.')

          if (role === 'patient') {
            const nameParts = (newUser.full_name ?? '').split(' ')
            await supabaseServer.from('patients').insert({
              user_id: newUser.id,
              first_name: nameParts[0] ?? '',
              last_name: nameParts.slice(1).join(' ') ?? '',
            })
          } else {
            const regNumber = credentials.registrationNumber?.trim().toUpperCase() ?? null
            const council   = credentials.medicalCouncil?.trim() ?? null
            const regYear   = credentials.registrationYear ? parseInt(credentials.registrationYear) || null : null

            await supabaseServer.from('doctors').insert({
              user_id:             newUser.id,
              medical_council:     council,
              registration_number: regNumber,
              registration_year:   regYear,
              verification_status: regNumber && council ? 'pending' : 'unverified',
            })
          }

          return { id: newUser.id, email: newUser.email, name: newUser.full_name, role: newUser.role }
        } else {
          if (!existing) throw new Error('No account found with this email. Please sign up first.')

          if (existing.role !== role) {
            const correctRole = existing.role === 'doctor' ? 'Doctor' : 'Patient'
            throw new Error(
              `This account is registered as a ${correctRole}. Please select "${correctRole}" and try again.`
            )
          }

          const storedHash = existing.password_hash
          if (!storedHash) {
            throw new Error('This account uses Google sign-in. Please use the Google button.')
          }

          let passwordValid = await bcrypt.compare(credentials.password, storedHash)

          if (!passwordValid && !storedHash.startsWith('$2')) {
            const legacyHash = Buffer.from(credentials.password).toString('base64')
            if (legacyHash === storedHash) {
              passwordValid = true
              const newHash = await bcrypt.hash(credentials.password, 12)
              await supabaseServer
                .from('users')
                .update({ password_hash: newHash })
                .eq('id', existing.id)
            }
          }

          if (!passwordValid) throw new Error('Incorrect password. Please try again.')

          return {
            id: existing.id,
            email: existing.email,
            name: existing.full_name,
            image: existing.avatar_url,
            role: existing.role,
          }
        }
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        if (!user.email) return true
        const { data: existing } = await supabaseServer
          .from('users')
          .select('id, role')
          .eq('email', user.email)
          .single()

        if (!existing) {
          const role = 'patient'
          const { data: newUser } = await supabaseServer
            .from('users')
            .insert({
              email: user.email,
              full_name: user.name ?? null,
              avatar_url: user.image ?? null,
              role,
              google_access_token:  account.access_token  ?? null,
              google_refresh_token: account.refresh_token ?? null,
            })
            .select('id, role')
            .single()

          if (newUser) {
            const nameParts = (user.name ?? '').split(' ')
            await supabaseServer.from('patients').insert({
              user_id: newUser.id,
              first_name: nameParts[0] ?? '',
              last_name: nameParts.slice(1).join(' ') ?? '',
            })
            ;(user as any).role = role
            ;(user as any).id = newUser.id
          }
        } else {
          await supabaseServer.from('users').update({
            full_name: user.name ?? null,
            avatar_url: user.image ?? null,
            google_access_token:  account.access_token  ?? null,
            ...(account.refresh_token ? { google_refresh_token: account.refresh_token } : {}),
          }).eq('id', existing.id)
          ;(user as any).role = existing.role
          ;(user as any).id = existing.id
        }
      }
      return true
    },
    async jwt({ token, user, account, trigger }) {
      if (user) {
        token.name = user.name ?? token.name
        token.email = user.email ?? token.email
        token.picture = user.image ?? token.picture
        token.role = (user as any).role ?? 'patient'
        token.userId = user.id
      }
      if (account?.access_token) {
        token.access_token = account.access_token
        token.access_token_expires = Date.now() + 55 * 60 * 1000
      }
      if (account?.refresh_token) {
        token.refresh_token = account.refresh_token
      }
      if (trigger === 'update') {
        const { data } = await supabaseServer
          .from('users')
          .select('role, full_name, avatar_url, google_access_token, google_refresh_token')
          .eq('email', token.email as string)
          .single()
        if (data) {
          token.role = data.role
          token.name = data.full_name ?? token.name
          token.picture = data.avatar_url ?? token.picture
          token.access_token = data.google_access_token ?? token.access_token
          token.refresh_token = data.google_refresh_token ?? token.refresh_token
        }
      }

      const expiresAt = token.access_token_expires as number | undefined
      const isExpired = expiresAt ? Date.now() > expiresAt : false

      if (isExpired && token.refresh_token) {
        const newAccessToken = await refreshGoogleAccessToken(token.refresh_token as string)
        if (newAccessToken) {
          token.access_token = newAccessToken
          token.access_token_expires = Date.now() + 55 * 60 * 1000
          await supabaseServer
            .from('users')
            .update({ google_access_token: newAccessToken })
            .eq('email', token.email as string)
        }
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.name = token.name ?? session.user.name
        session.user.email = token.email ?? session.user.email
        session.user.image = (token.picture as string) ?? session.user.image
        ;(session.user as any).role = token.role
        ;(session.user as any).id = token.userId
      }
      ;(session as any).access_token  = token.access_token
      ;(session as any).refresh_token = token.refresh_token
      return session
    },
  },
  session: { strategy: 'jwt' },
}
