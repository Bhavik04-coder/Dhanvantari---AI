import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { supabaseServer } from '@/lib/supabaseServer'
import { savePrescription } from '@/lib/prescriptionService'

async function getDoctorRow(email: string) {
  const { data } = await supabaseServer
    .from('users').select('id, role, full_name').eq('email', email).single()
  if (!data || data.role !== 'doctor') return null
  return data
}

// GET /api/doctor/prescriptions
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const doctor = await getDoctorRow(session.user.email)
  if (!doctor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: doctorProfile } = await supabaseServer
    .from('doctors')
    .select('id')
    .eq('user_id', doctor.id)
    .single()

  const doctorIds = [doctor.id, doctorProfile?.id].filter(Boolean) as string[]

  const { data, error } = await supabaseServer
    .from('prescriptions')
    .select('*')
    .in('doctor_id', doctorIds)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ prescriptions: data ?? [] })
}

// POST /api/doctor/prescriptions — issue a prescription and notify patient
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const doctor = await getDoctorRow(session.user.email)
  if (!doctor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { patientId, patientName, medicines, notes, forwardedToPharmacy } = body

  if (!patientName || !medicines?.length)
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

  if (!patientId)
    return NextResponse.json(
      { error: 'Patient account required. Select a patient with a linked profile (from appointments).' },
      { status: 400 },
    )

  const { prescription, error } = await savePrescription({
    doctorUserId: doctor.id,
    doctorName: doctor.full_name ?? 'Your doctor',
    patientUserId: patientId,
    patientName,
    medicines,
    notes: notes ?? '',
    forwardedToPharmacy: forwardedToPharmacy ?? false,
  })

  if (error) return NextResponse.json({ error }, { status: 500 })

  return NextResponse.json({ prescription })
}
