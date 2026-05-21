import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { supabaseServer } from '@/lib/supabaseServer'
import {
  doctorAppointmentFilterIds,
  normalizePatientRowId,
  resolvePatientRowIdsToUserIds,
} from '@/lib/patientResolve'

type PatientPayload = {
  id: number
  userId: string
  name: string
  age: number
  avatar: string
  gender: string
  blood_group: string
  chronic_conditions: string[]
  symptoms: string
  disease: string
  confidence: number
  risk: 'High' | 'Medium' | 'Low'
}

function buildPatient(
  u: { id: string; full_name?: string | null; email?: string; avatar_url?: string | null },
  detail: {
    date_of_birth?: string | null
    gender?: string | null
    blood_group?: string | null
    chronic_conditions?: string[] | null
  } | undefined,
  latestPred: { disease?: string; confidence?: number; symptoms?: string[] } | undefined,
  idx: number,
): PatientPayload {
  const dob = detail?.date_of_birth
  const age = dob ? Math.floor((Date.now() - new Date(dob).getTime()) / 3.156e10) : 0
  const confidence = latestPred?.confidence ?? 0
  const risk: 'High' | 'Medium' | 'Low' =
    confidence >= 80 ? 'High' : confidence >= 50 ? 'Medium' : 'Low'

  return {
    id: idx + 1,
    userId: u.id,
    name: u.full_name ?? u.email ?? 'Patient',
    age,
    avatar: u.full_name ?? '',
    gender: detail?.gender ?? '',
    blood_group: detail?.blood_group ?? '',
    chronic_conditions: detail?.chronic_conditions ?? [],
    symptoms: (latestPred?.symptoms ?? []).join(', '),
    disease: latestPred?.disease ?? '',
    confidence,
    risk,
  }
}

// GET /api/doctor/patients — linked patients + confirmed appointment patients
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userRow } = await supabaseServer
    .from('users').select('id, role').eq('email', session.user.email).single()

  if (!userRow || userRow.role !== 'doctor')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: doctorRow } = await supabaseServer
    .from('doctors')
    .select('id')
    .eq('user_id', userRow.id)
    .single()

  const doctorFilterIds = doctorAppointmentFilterIds(userRow.id, doctorRow?.id)

  // Collect patient user IDs from doctor_patients junction
  const { data: links } = await supabaseServer
    .from('doctor_patients')
    .select('patient_id')
    .eq('doctor_id', userRow.id)

  const patientUserIds = new Set<string>((links ?? []).map(l => l.patient_id as string))

  // Also include patients from confirmed appointments
  const { data: appointments } = await supabaseServer
    .from('appointments')
    .select('patient_id, patient_name, status')
    .in('doctor_id', doctorFilterIds)

  const confirmedAppointments = (appointments ?? []).filter(
    a => String(a.status).toLowerCase() === 'confirmed',
  )

  const rowToUser = await resolvePatientRowIdsToUserIds(
    confirmedAppointments.map(a => a.patient_id),
  )

  Object.values(rowToUser).forEach(uid => patientUserIds.add(uid))

  // Appointments with patient_name only (no patient_id) — match by name
  const namesWithoutId = confirmedAppointments
    .filter(a => !normalizePatientRowId(a.patient_id) && a.patient_name)
    .map(a => a.patient_name as string)

  if (namesWithoutId.length > 0) {
    const { data: byName } = await supabaseServer
      .from('users')
      .select('id, full_name')
      .in('full_name', namesWithoutId)
      .eq('role', 'patient')

    ;(byName ?? []).forEach(u => patientUserIds.add(u.id))
  }

  if (patientUserIds.size === 0) return NextResponse.json({ patients: [] })

  const patientIds = [...patientUserIds]

  const [usersRes, detailsRes, predictionsRes] = await Promise.all([
    supabaseServer.from('users').select('id, full_name, avatar_url, email').in('id', patientIds),
    supabaseServer.from('patients').select('user_id, date_of_birth, gender, blood_group, chronic_conditions').in('user_id', patientIds),
    supabaseServer
      .from('ai_predictions')
      .select('patient_id, disease, confidence, symptoms, status')
      .in('patient_id', patientIds)
      .order('created_at', { ascending: false }),
  ])

  const patientUsers = usersRes.data ?? []
  const patientDetails = detailsRes.data ?? []
  const predictions = predictionsRes.data ?? []

  const detailsMap = new Map(patientDetails.map(d => [d.user_id, d]))
  const predictionsMap = new Map<string, (typeof predictions)[0]>()
  for (const p of predictions) {
    if (!predictionsMap.has(p.patient_id as string)) {
      predictionsMap.set(p.patient_id as string, p)
    }
  }

  const patients = patientUsers.map((u, idx) =>
    buildPatient(u, detailsMap.get(u.id), predictionsMap.get(u.id), idx),
  )

  return NextResponse.json({ patients })
}
