import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { supabaseServer } from '@/lib/supabaseServer'
import { getPrescriptionsForPatient } from '@/lib/prescriptionService'

// GET /api/patient/prescriptions — prescriptions for patient dashboard
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: userRow } = await supabaseServer
    .from('users')
    .select('id, role, full_name')
    .eq('email', session.user.email)
    .single()

  if (!userRow || userRow.role !== 'patient') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const prescriptions = await getPrescriptionsForPatient(
    userRow.id,
    userRow.full_name ?? undefined,
  )

  return NextResponse.json({ prescriptions })
}
