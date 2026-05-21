import { supabaseServer } from '@/lib/supabaseServer'
import { ensurePatientRowId } from '@/lib/patientResolve'

export type PrescriptionMedicine = {
  name: string
  dosage?: string
  frequency?: string
}

export type PrescriptionForPatient = {
  id: string
  medicines: PrescriptionMedicine[]
  notes: string
  issuedDate: string
  doctorName: string
}

async function resolvePatientRowId(userUuid: string): Promise<string | null> {
  const { data } = await supabaseServer
    .from('patients')
    .select('id')
    .eq('user_id', userUuid)
    .maybeSingle()
  return data?.id ? String(data.id) : null
}

async function resolveDoctorRowId(userUuid: string): Promise<string | null> {
  const { data } = await supabaseServer
    .from('doctors')
    .select('id')
    .eq('user_id', userUuid)
    .maybeSingle()
  return data?.id ? String(data.id) : null
}

export async function linkDoctorPatient(doctorUserId: string, patientUserId: string) {
  if (!doctorUserId || !patientUserId) return
  await supabaseServer
    .from('doctor_patients')
    .upsert(
      { doctor_id: doctorUserId, patient_id: patientUserId },
      { onConflict: 'doctor_id,patient_id', ignoreDuplicates: true },
    )
}

function formatDate(d: string | null | undefined): string {
  if (!d) return new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

async function loadMedicinesForPrescription(prescriptionId: string): Promise<PrescriptionMedicine[]> {
  const { data, error } = await supabaseServer
    .from('prescription_medicines')
    .select('medicine_name, dosage, duration')
    .eq('prescription_id', prescriptionId)

  if (error) return []

  return (data ?? []).map(m => ({
    name: m.medicine_name,
    dosage: m.dosage ?? '',
    frequency: m.duration ?? '',
  }))
}

async function resolveDoctorName(row: Record<string, unknown>): Promise<string> {
  const doctorId = row.doctor_id as string | undefined
  if (!doctorId) return 'Doctor'

  const { data: userRow } = await supabaseServer
    .from('users')
    .select('full_name')
    .eq('id', doctorId)
    .maybeSingle()
  if (userRow?.full_name) return userRow.full_name

  const { data: doctorRow } = await supabaseServer
    .from('doctors')
    .select('user_id')
    .eq('id', doctorId)
    .maybeSingle()

  if (doctorRow?.user_id) {
    const { data: linkedUser } = await supabaseServer
      .from('users')
      .select('full_name')
      .eq('id', doctorRow.user_id)
      .maybeSingle()
    if (linkedUser?.full_name) return linkedUser.full_name
  }

  return 'Doctor'
}

async function mapPrescriptionRow(row: Record<string, unknown>): Promise<PrescriptionForPatient> {
  let medicines = (row.medicines as PrescriptionMedicine[] | undefined) ?? []
  if (!Array.isArray(medicines) || medicines.length === 0) {
    medicines = row.id ? await loadMedicinesForPrescription(String(row.id)) : []
  }

  const doctorName = await resolveDoctorName(row)
  const notes =
    (row.notes as string | undefined) ??
    (row.advice as string | undefined) ??
    ''

  const issuedDate =
    (row.issued_date as string | undefined) ??
    (row.prescription_date as string | undefined) ??
    (row.created_at as string | undefined)

  return {
    id: String(row.id),
    medicines,
    notes,
    issuedDate: formatDate(issuedDate),
    doctorName,
  }
}

async function queryPrescriptions(
  column: string,
  value: string,
): Promise<Record<string, unknown>[]> {
  const { data, error } = await supabaseServer
    .from('prescriptions')
    .select('*')
    .eq(column, value)
    .order('created_at', { ascending: false })

  if (error) {
    console.error(`[prescriptions] query ${column}=`, error.message)
    return []
  }
  return (data ?? []) as Record<string, unknown>[]
}

/** Save prescription using DB schema (patients.id + doctors.id + prescription_medicines). */
export async function savePrescription(params: {
  doctorUserId: string
  doctorName: string
  patientUserId: string
  patientName: string
  medicines: PrescriptionMedicine[]
  notes?: string
  forwardedToPharmacy?: boolean
}): Promise<{ prescription: Record<string, unknown>; error?: string }> {
  const {
    doctorUserId,
    doctorName,
    patientUserId,
    patientName,
    medicines,
    notes = '',
    forwardedToPharmacy = false,
  } = params

  await linkDoctorPatient(doctorUserId, patientUserId)

  const patientRowId = await ensurePatientRowId(patientUserId, patientName)
  const doctorRowId = await resolveDoctorRowId(doctorUserId)

  if (!patientRowId) {
    return { prescription: {}, error: 'Patient profile could not be created. Please try again.' }
  }
  if (!doctorRowId) {
    return { prescription: {}, error: 'Doctor profile not found. Complete doctor registration first.' }
  }

  const today = new Date().toISOString().split('T')[0]

  const insertPayload: Record<string, unknown> = {
    doctor_id: doctorRowId,
    patient_id: patientRowId,
    patient_name: patientName,
    advice: notes,
    prescription_date: today,
    forwarded_to_pharmacy: forwardedToPharmacy,
  }

  // Optional column — run scripts/prescriptions-patient-link.sql in Supabase
  insertPayload.patient_user_id = patientUserId

  let { data: rx, error } = await supabaseServer
    .from('prescriptions')
    .insert(insertPayload)
    .select()
    .single()

  if (error?.message?.includes('patient_user_id')) {
    delete insertPayload.patient_user_id
    const retry = await supabaseServer.from('prescriptions').insert(insertPayload).select().single()
    rx = retry.data
    error = retry.error
  }

  if (error || !rx) {
    return { prescription: {}, error: error?.message ?? 'Failed to save prescription' }
  }

  const prescriptionId = String(rx.id)
  const medRows = medicines.map(m => ({
    prescription_id: prescriptionId,
    medicine_name: m.name,
    dosage: m.dosage ?? '',
    duration: m.frequency ?? '',
  }))

  if (medRows.length > 0) {
    const { error: medError } = await supabaseServer.from('prescription_medicines').insert(medRows)
    if (medError) {
      console.error('[prescriptions] medicines insert:', medError.message)
    }
  }

  await notifyPatient({ patientUserId, doctorUserId, doctorName, medicines })

  return { prescription: rx as Record<string, unknown> }
}

async function notifyPatient(params: {
  patientUserId: string
  doctorUserId: string
  doctorName: string
  medicines: PrescriptionMedicine[]
}) {
  const medicineNames = params.medicines.map(m => m.name).join(', ')
  await supabaseServer.from('patient_notifications').insert({
    patient_id: params.patientUserId,
    doctor_id: params.doctorUserId,
    title: 'New Prescription Issued',
    message: `Dr. ${params.doctorName} has issued a prescription: ${medicineNames}. View it in Health Records.`,
    type: 'prescription',
  })
}

/** Fetch all prescriptions for the logged-in patient. */
export async function getPrescriptionsForPatient(
  patientUserId: string,
  patientFullName?: string,
): Promise<PrescriptionForPatient[]> {
  const patientRowId = await resolvePatientRowId(patientUserId)
  const seen = new Set<string>()
  const rows: Record<string, unknown>[] = []

  const addRows = (list: Record<string, unknown>[]) => {
    for (const r of list) {
      const id = String(r.id)
      if (!seen.has(id)) {
        seen.add(id)
        rows.push(r)
      }
    }
  }

  // 1) Standard: patient_id = patients.id (UUID)
  if (patientRowId) {
    addRows(await queryPrescriptions('patient_id', patientRowId))
  }

  // 2) Legacy / alternate: patient_id stored as users.id
  addRows(await queryPrescriptions('patient_id', patientUserId))

  // 3) Optional column patient_user_id (after migration)
  addRows(await queryPrescriptions('patient_user_id', patientUserId))

  // 4) Match by display name on prescription
  if (patientFullName?.trim()) {
    const { data, error } = await supabaseServer
      .from('prescriptions')
      .select('*')
      .ilike('patient_name', patientFullName.trim())
      .order('created_at', { ascending: false })

    if (!error && data?.length) {
      addRows(data as Record<string, unknown>[])
    }
  }

  return Promise.all(rows.map(r => mapPrescriptionRow(r)))
}
