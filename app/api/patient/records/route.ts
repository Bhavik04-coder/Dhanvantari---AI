import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { supabaseServer } from '@/lib/supabaseServer'
import { getPrescriptionsForPatient } from '@/lib/prescriptionService'
import { fetchLabTestsForPatient } from '@/lib/labTestsService'

// GET /api/patient/records â€” fetch predictions, lab tests, vitals, prescriptions for the patient
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userRow } = await supabaseServer
    .from('users').select('id, role, full_name').eq('email', session.user.email).single()

  if (!userRow || userRow.role !== 'patient')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const patientName = userRow.full_name ?? ''

  const { data: patientRow } = await supabaseServer
    .from('patients')
    .select('id')
    .eq('user_id', userRow.id)
    .maybeSingle()
  const patientRowId = patientRow?.id ? String(patientRow.id) : null

  // Fetch predictions by patient_id or patient_name match
  const [predictionsRes, labTestsRes, vitalsRes, prescriptionsList] = await Promise.all([
    supabaseServer
      .from('ai_predictions')
      .select('*, users!doctor_id(full_name)')
      .eq('patient_id', userRow.id)
      .order('created_at', { ascending: false }),

    fetchLabTestsForPatient(userRow.id, patientRowId),

    supabaseServer
      .from('patient_vitals')
      .select('*')
      .eq('patient_id', userRow.id)
      .order('date', { ascending: false })
      .limit(10),

    getPrescriptionsForPatient(userRow.id, userRow.full_name ?? undefined),
  ])

  const predictions = (predictionsRes.data ?? []).map(p => ({
    id: p.id,
    disease: p.disease,
    confidence: p.confidence,
    symptoms: p.symptoms ?? [],
    explanation: p.explanation ?? '',
    status: p.status,
    doctorName: p.initiated_by === 'patient'
      ? 'You (Self-Check)'
      : ((p.users as { full_name?: string } | null)?.full_name ?? 'Doctor'),
    createdAt: p.created_at,
    initiatedBy: p.initiated_by ?? 'doctor',
  }))

  const labTests = (labTestsRes.data ?? []).map((t: Record<string, unknown>) => ({
    id: t.id,
    testName: t.test_name,
    status: t.status,
    priority: t.priority,
    diagnosisReason: t.diagnosis_reason ?? '',
    labValues: t.lab_values ?? [],
    requestDate: t.request_date ?? t.created_at,
    initiatedBy: t.initiated_by ?? 'doctor',
    doctorName: (t.doctor as { full_name?: string } | null)?.full_name ?? null,
    price: t.price ?? null,
  }))

  const vitals = (vitalsRes.data ?? []).map(v => ({
    id: v.id,
    date: v.date,
    heartRate: v.heart_rate,
    bloodPressure: { systolic: v.bp_systolic, diastolic: v.bp_diastolic },
    glucose: v.glucose,
    temperature: v.temperature,
  }))

  const prescriptions = prescriptionsList

  return NextResponse.json({ predictions, labTests, vitals, prescriptions, patientName })
}
