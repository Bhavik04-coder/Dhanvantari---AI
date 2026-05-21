import { supabaseServer } from '@/lib/supabaseServer'

// lab_tests schema:
//   doctor_id  UUID    → doctors.id
//   patient_id INTEGER → patients.id

/** Resolve doctor full name from doctors.id (UUID) via a single join */
async function resolveDoctorName(doctorId: string | null | undefined): Promise<string | null> {
  if (!doctorId) return null

  const { data } = await supabaseServer
    .from('doctors')
    .select('users!user_id(full_name)')
    .eq('id', doctorId)
    .maybeSingle()

  const user = (data as { users?: { full_name?: string } | null } | null)?.users
  return user?.full_name ?? null
}

/**
 * Fetch lab tests for a patient.
 * patientRowId is the integer patients.id (as a string from the DB).
 */
export async function fetchLabTestsForPatient(
  _patientUserId: string,
  patientRowId: string | null,
) {
  if (!patientRowId) return { data: [], error: null }

  const { data, error } = await supabaseServer
    .from('lab_tests')
    .select('*')
    .eq('patient_id', Number(patientRowId))
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[fetchLabTestsForPatient] query error:', error.message)
    return { data: [], error }
  }

  const rows = data ?? []

  const withDoctors = await Promise.all(
    rows.map(async (t) => ({
      ...t,
      doctor: { full_name: await resolveDoctorName(t.doctor_id as string) },
    })),
  )

  return { data: withDoctors, error: null }
}
