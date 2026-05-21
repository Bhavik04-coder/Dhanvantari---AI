import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabaseServer'
import AdminDashboard from './AdminDashboard'

export default async function AdminPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect('/login')

  const sessionRole = (session.user as any).role

  // Admin credentials are env-only (not in Supabase), so trust the JWT role directly.
  // For any other role claim, verify against Supabase to prevent spoofing.
  if (sessionRole === 'admin') {
    // Double-check the email matches the env-configured admin email
    if (session.user.email.toLowerCase() !== (process.env.ADMIN_EMAIL ?? '').toLowerCase()) {
      redirect('/')
    }
    return <AdminDashboard />
  }

  // Server-side role check for Supabase users — never trust client-only guards
  const { data: user } = await supabaseServer
    .from('users')
    .select('role')
    .eq('email', session.user.email)
    .single()

  if (!user || user.role !== 'admin') redirect('/')

  return <AdminDashboard />
}
