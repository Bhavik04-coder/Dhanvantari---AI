import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { supabaseServer } from '@/lib/supabaseServer'

// lab_tests schema:
//   doctor_id  UUID    → doctors.id
//   patient_id INTEGER → patients.id

async function getDoctorRow(email: string) {
  const { data } = await supabaseServer
    .from('users').select('id, role, full_name').eq('email', email).single()
  if (!data || data.role !== 'doctor') return null

  let { data: doctorRow } = await supabaseServer
    .from('doctors').select('id').eq('user_id', data.id).maybeSingle()

  if (!doctorRow) {
    const { data: created, error: createError } = await supabaseServer
      .from('doctors')
      .insert({ user_id: data.id, verification_status: 'unverified' })
      .select('id')
      .single()
    if (createError) {
      console.error('[getDoctorRow] auto-create failed:', createError.message)
    }
    doctorRow = created ?? null
  }

  return { ...data, doctorRowId: doctorRow?.id ?? null }
}

/** patients.id (integer) → users.id for notifications */
async function resolvePatientUserId(patientIntId: number | null): Promise<string | null> {
  if (!patientIntId) return null
  const { data } = await supabaseServer
    .from('patients').select('user_id').eq('id', patientIntId).maybeSingle()
  return data?.user_id ? String(data.user_id) : null
}

const fmt = (ts: string | null) =>
  ts ? new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

// GET /api/doctor/lab-tests
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const doctor = await getDoctorRow(session.user.email)
  if (!doctor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!doctor.doctorRowId) return NextResponse.json({ tests: [] })

  const { data, error } = await supabaseServer
    .from('lab_tests')
    .select('*')
    .eq('doctor_id', doctor.doctorRowId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const tests = (data ?? []).map(t => ({
    id: t.id,
    patientId: t.patient_id,
    patientName: t.patient_name,
    testName: t.test_name,
    requestedByDoctorId: doctor.doctorRowId,
    requestedByDoctorName: doctor.full_name ?? 'Doctor',
    requestDate: fmt(t.request_date ?? t.created_at),
    orderedDate: fmt(t.request_date ?? t.created_at),
    status: t.status,
    priority: t.priority,
    diagnosisReason: t.diagnosis_reason ?? '',
    reason: t.diagnosis_reason ?? '',
    labValues: Array.isArray(t.lab_values) ? t.lab_values : [],
    initiatedBy: t.initiated_by ?? 'doctor',
    price: t.price ?? null,
  }))

  return NextResponse.json({ tests })
}

// POST /api/doctor/lab-tests — create new test request
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const doctor = await getDoctorRow(session.user.email)
  if (!doctor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (!doctor.doctorRowId) {
    return NextResponse.json(
      { error: 'Doctor profile not found. Please complete your doctor registration first.' },
      { status: 400 },
    )
  }

  const body = await req.json()
  const { patientId, patientName, testName, priority, reason } = body

  if (!patientName || !testName)
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  if (!patientId)
    return NextResponse.json({ error: 'Please select a patient with a linked account.' }, { status: 400 })

  // Resolve patients.id (integer) from patient's users.id (UUID)
  const { data: patientRow } = await supabaseServer
    .from('patients').select('id').eq('user_id', patientId).maybeSingle()

  if (!patientRow?.id) {
    return NextResponse.json(
      { error: 'Patient profile not found. Ask the patient to complete registration first.' },
      { status: 400 },
    )
  }

  const patientIntId = Number(patientRow.id)
  const id = `TR-${Math.floor(1000 + Math.random() * 9000)}`

  const { data, error } = await supabaseServer
    .from('lab_tests')
    .insert({
      id,
      doctor_id: doctor.doctorRowId,  // UUID → doctors.id
      patient_id: patientIntId,        // integer → patients.id
      patient_name: patientName,
      test_name: testName,
      priority: priority ?? 'Normal',
      diagnosis_reason: reason ?? '',
      status: 'Pending',
      lab_values: [],
      initiated_by: 'doctor',
      request_date: new Date().toISOString().split('T')[0],
    })
    .select()
    .single()

  if (error) {
    console.error('[lab-tests POST] insert error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Notify patient
  await supabaseServer.from('patient_notifications').insert({
    patient_id: patientId,
    doctor_id: doctor.id,
    title: 'Lab Test Requested',
    message: `Dr. ${doctor.full_name ?? 'Your doctor'} has requested a ${testName} test for you. Priority: ${priority ?? 'Normal'}.`,
    type: 'result',
  })

  return NextResponse.json({
    test: {
      id: data.id,
      patientId: data.patient_id,
      patientName: data.patient_name,
      testName: data.test_name,
      requestedByDoctorId: doctor.doctorRowId,
      requestedByDoctorName: doctor.full_name ?? 'Doctor',
      requestDate: fmt(data.request_date ?? data.created_at),
      orderedDate: fmt(data.request_date ?? data.created_at),
      status: data.status,
      priority: data.priority,
      diagnosisReason: data.diagnosis_reason ?? '',
      reason: data.diagnosis_reason ?? '',
      labValues: [],
    },
  })
}

// PATCH /api/doctor/lab-tests — update status / add lab values
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const doctor = await getDoctorRow(session.user.email)
  if (!doctor || !doctor.doctorRowId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, status, labValues } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if (status) updates.status = status
  if (labValues) updates.lab_values = labValues

  const { data: existing } = await supabaseServer
    .from('lab_tests').select('patient_id, test_name').eq('id', id).single()

  const { error } = await supabaseServer
    .from('lab_tests')
    .update(updates)
    .eq('id', id)
    .eq('doctor_id', doctor.doctorRowId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (status === 'Completed' && existing) {
    const patientUserId = await resolvePatientUserId(existing.patient_id)
    if (patientUserId) {
      await supabaseServer.from('patient_notifications').insert({
        patient_id: patientUserId,
        doctor_id: doctor.id,
        title: 'Lab Results Available',
        message: `Your ${existing.test_name} results are now available. Please check your health records.`,
        type: 'result',
      })
    }
  }

  return NextResponse.json({ success: true })
}
