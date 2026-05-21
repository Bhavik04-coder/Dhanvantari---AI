import { supabaseServer } from '@/lib/supabaseServer'

/** Normalize patients.id from DB (UUID string). */
export function normalizePatientRowId(id: unknown): string | null {
  if (id == null || id === '') return null
  const s = String(id).trim()
  return s.length > 0 ? s : null
}

/**
 * Batch-resolve patients.id → users.id.
 * appointments.patient_id references patients(id) (UUID), not users.id.
 */
export async function resolvePatientRowIdsToUserIds(
  patientRowIds: unknown[],
): Promise<Record<string, string>> {
  const ids = [...new Set(patientRowIds.map(normalizePatientRowId).filter((id): id is string => id != null))]
  if (ids.length === 0) return {}

  const { data } = await supabaseServer
    .from('patients')
    .select('id, user_id')
    .in('id', ids)

  const map: Record<string, string> = {}
  for (const row of data ?? []) {
    if (row.id && row.user_id) {
      map[String(row.id)] = String(row.user_id)
    }
  }
  return map
}

/** Doctor FK values used in appointments (doctors.id or legacy users.id). */
export function doctorAppointmentFilterIds(doctorUserId: string, doctorRowId?: string | null): string[] {
  return [...new Set([doctorRowId, doctorUserId].filter((id): id is string => Boolean(id)))]
}

/** Ensure patients row exists (required for pathology_bookings FK). */
export async function ensurePatientRowId(userUuid: string, displayName?: string): Promise<string | null> {
  const { data: existing } = await supabaseServer
    .from('patients')
    .select('id')
    .eq('user_id', userUuid)
    .maybeSingle()

  if (existing?.id) return String(existing.id)

  const { data: user } = await supabaseServer
    .from('users')
    .select('full_name, email')
    .eq('id', userUuid)
    .maybeSingle()

  const name = displayName || user?.full_name || user?.email || 'Patient'
  const parts = name.trim().split(/\s+/)

  const { data, error } = await supabaseServer
    .from('patients')
    .insert({
      user_id: userUuid,
      first_name: parts[0] ?? 'Patient',
      last_name: parts.slice(1).join(' ') || 'User',
    })
    .select('id')
    .single()

  if (error) {
    const retry = await supabaseServer
      .from('patients')
      .select('id')
      .eq('user_id', userUuid)
      .maybeSingle()
    return retry.data?.id ? String(retry.data.id) : null
  }

  return data?.id ? String(data.id) : null
}
