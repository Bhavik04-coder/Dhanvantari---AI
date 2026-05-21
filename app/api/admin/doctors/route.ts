import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { supabaseServer } from '@/lib/supabaseServer'

// Guard: only admin role can call these endpoints
async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return null

  const sessionRole = (session.user as any).role

  // Env-based admin: role is set in JWT, no Supabase row exists
  if (
    sessionRole === 'admin' &&
    session.user.email.toLowerCase() === (process.env.ADMIN_EMAIL ?? '').toLowerCase()
  ) {
    return { id: 'admin', role: 'admin' }
  }

  // Supabase-based admin (future use)
  const { data } = await supabaseServer
    .from('users')
    .select('id, role')
    .eq('email', session.user.email)
    .single()
  if (!data || data.role !== 'admin') return null
  return data
}

// GET /api/admin/doctors?status=pending
// Returns doctors filtered by verification_status (default: all pending)
export async function GET(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const status = req.nextUrl.searchParams.get('status') ?? 'pending'

  const { data: doctors, error } = await supabaseServer
    .from('doctors')
    .select(`
      id,
      user_id,
      specialization,
      license_number,
      medical_council,
      registration_number,
      registration_year,
      verification_status,
      rejection_reason,
      verified_at,
      created_at,
      users ( full_name, email, avatar_url )
    `)
    .eq('verification_status', status)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ doctors: doctors ?? [] })
}

// PATCH /api/admin/doctors
// Body: { doctorId: string, action: 'approve' | 'reject', reason?: string }
export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { doctorId, action, reason } = body

  if (!doctorId || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (action === 'approve') {
    const { error } = await supabaseServer
      .from('doctors')
      .update({
        verification_status: 'verified',
        verified_at: new Date().toISOString(),
        rejection_reason: null,
      })
      .eq('id', doctorId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Notify the doctor
    const { data: doc } = await supabaseServer
      .from('doctors')
      .select('user_id')
      .eq('id', doctorId)
      .single()

    if (doc?.user_id) {
      await supabaseServer.from('notifications').insert({
        user_id: doc.user_id,
        title: 'Medical Registration Verified âœ“',
        message: 'Your medical registration has been verified. Your profile now shows a Verified badge.',
        type: 'system',
      })
    }

    return NextResponse.json({ success: true, status: 'verified' })
  }

  if (action === 'reject') {
    if (!reason?.trim()) {
      return NextResponse.json({ error: 'A rejection reason is required.' }, { status: 400 })
    }

    const { error } = await supabaseServer
      .from('doctors')
      .update({
        verification_status: 'rejected',
        rejection_reason: reason.trim(),
        verified_at: null,
      })
      .eq('id', doctorId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Notify the doctor
    const { data: doc } = await supabaseServer
      .from('doctors')
      .select('user_id')
      .eq('id', doctorId)
      .single()

    if (doc?.user_id) {
      await supabaseServer.from('notifications').insert({
        user_id: doc.user_id,
        title: 'Verification Update',
        message: `Your medical registration could not be verified. Reason: ${reason.trim()}. Please update your details in your profile.`,
        type: 'alert',
      })
    }

    return NextResponse.json({ success: true, status: 'rejected' })
  }
}
