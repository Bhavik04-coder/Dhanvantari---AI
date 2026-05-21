import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { supabaseServer } from '@/lib/supabaseServer'
import { createCalendarEvent, getValidAccessToken } from '@/lib/googleCalendar'

async function getPatientRow(email: string) {
  const { data } = await supabaseServer
    .from('users').select('id, role, full_name, email').eq('email', email).single()
  if (!data || data.role !== 'patient') return null

  // appointments.patient_id references patients(id), not users(id)
  const { data: patientRow } = await supabaseServer
    .from('patients').select('id').eq('user_id', data.id).single()

  return { ...data, patientRowId: patientRow?.id ?? null }
}

// GET /api/patient/appointments
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const patient = await getPatientRow(session.user.email)
  if (!patient) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (!patient.patientRowId)
    return NextResponse.json({ appointments: [] })

  const { data, error } = await supabaseServer
    .from('appointments')
    .select('*')
    .eq('patient_id', patient.patientRowId)
    .order('appointment_date', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const appointments = (data ?? []).map((a: Record<string, unknown>) => ({
    id: a.id,
    doctorName: (a.doctor_name as string) ?? 'Doctor',
    date: a.appointment_date,
    time: a.appointment_time,
    type: a.type,
    mode: a.mode,
    status: a.status,
    reason: (a.reason as string) ?? '',
    initiatedBy: a.initiated_by,
    meetLink: (a.meet_link as string) ?? null,
    calendarEventId: (a.calendar_event_id as string) ?? null,
    calendarEventLink: (a.calendar_event_link as string) ?? null,
  }))

  return NextResponse.json({ appointments })
}

// POST /api/patient/appointments — patient books a consultation
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const patient = await getPatientRow(session.user.email)
  if (!patient) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { doctorName, doctorId, date, time, type, mode, reason } = body

  if (!date || !time) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

  if (!patient.patientRowId)
    return NextResponse.json({ error: 'Patient profile not found. Please complete your profile first.' }, { status: 400 })

  // Try to get doctor email for calendar invite and resolve doctors.id
  let doctorEmail: string | null = null
  let doctorGoogleAccessToken: string | null = null
  let doctorGoogleRefreshToken: string | null = null
  let doctorRowId: string | null = null // doctors.id for FK
  if (doctorId) {
    const { data: du } = await supabaseServer
      .from('users')
      .select('email, google_access_token, google_refresh_token')
      .eq('id', doctorId)
      .single()
    doctorEmail              = du?.email              ?? null
    doctorGoogleAccessToken  = du?.google_access_token  ?? null
    doctorGoogleRefreshToken = du?.google_refresh_token ?? null

    // Resolve doctors.id from users.id
    const { data: doctorRow } = await supabaseServer
      .from('doctors')
      .select('id')
      .eq('user_id', doctorId)
      .single()
    doctorRowId = doctorRow?.id ?? null
  }

  let calendarEventId: string | null = null
  let calendarEventLink: string | null = null

  const patientAccessToken = (session as any).access_token
  if (patientAccessToken) {
    try {
      const attendees = [patient.email, doctorEmail].filter(Boolean) as string[]
      const calResult = await createCalendarEvent(patientAccessToken, {
        summary: `${type ?? 'Consultation'} Request — Dr. ${doctorName ?? 'Doctor'}`,
        description: `Appointment request submitted by ${patient.full_name ?? 'Patient'}.\nMode: ${mode ?? 'Online'}\nReason: ${reason ?? 'Not specified'}\n\nNote: Pending doctor confirmation.`,
        date,
        time,
        durationMins: 30,
        attendeeEmails: attendees,
      })
      calendarEventId   = calResult.eventId
      calendarEventLink = calResult.eventLink
    } catch (calErr) {
      console.error('[calendar] Failed to create patient calendar event:', calErr)
    }
  }

  let doctorCalendarEventId: string | null = null
  let doctorCalendarEventLink: string | null = null

  const validDoctorToken = await getValidAccessToken(doctorGoogleAccessToken, doctorGoogleRefreshToken)
  if (validDoctorToken) {
    try {
      const attendees = [doctorEmail, patient.email].filter(Boolean) as string[]
      const calResult = await createCalendarEvent(validDoctorToken, {
        summary: `Pending: ${type ?? 'Consultation'} — ${patient.full_name ?? 'Patient'}`,
        description: `Appointment request from ${patient.full_name ?? 'Patient'}.\nMode: ${mode ?? 'Online'}\nReason: ${reason ?? 'Not specified'}\n\nStatus: Pending your confirmation.`,
        date,
        time,
        durationMins: 30,
        attendeeEmails: attendees,
      })
      doctorCalendarEventId   = calResult.eventId
      doctorCalendarEventLink = calResult.eventLink
      if (validDoctorToken !== doctorGoogleAccessToken && doctorId) {
        await supabaseServer
          .from('users')
          .update({ google_access_token: validDoctorToken })
          .eq('id', doctorId)
      }
    } catch (calErr) {
      console.error('[calendar] Failed to create doctor calendar event:', calErr)
    }
  }

  const { data, error } = await supabaseServer
    .from('appointments')
    .insert({
      doctor_id:    doctorRowId ?? null,  // Use doctors.id (FK)
      doctor_name:  doctorName ?? null,
      patient_id:   patient.patientRowId,
      patient_name: patient.full_name ?? session.user.email,
      appointment_date: date,
      appointment_time: time,
      type:         type ?? 'Consultation',
      mode:         mode ?? 'Online',
      status:       'Pending',
      reason:       reason ?? '',
      meet_link:    null,
      calendar_event_id:           calendarEventId,
      calendar_event_link:         calendarEventLink,
      doctor_calendar_event_id:    doctorCalendarEventId,
      doctor_calendar_event_link:  doctorCalendarEventLink,
      initiated_by: 'patient',
    })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify the doctor - CRITICAL: Use users.id not doctors.id
  if (doctorId) {
    const parts: string[] = [
      `${patient.full_name ?? 'A patient'} has requested a ${type ?? 'Consultation'} on ${date} at ${time} (${mode ?? 'Online'}).`,
    ]
    if (reason) parts.push(`Reason: ${reason}`)
    if (doctorCalendarEventLink) parts.push(`Calendar event added to your Google Calendar: ${doctorCalendarEventLink}`)

    // doctorId here is users.id, which is what doctor_notifications.doctor_id expects
    const { error: notifError } = await supabaseServer.from('doctor_notifications').insert({
      doctor_id: doctorId,
      title: 'New Appointment Request',
      message: parts.join(' '),
      type: 'appointment',
    })

    if (notifError) {
      console.error('[notification] Failed to notify doctor:', notifError)
    }
  }

  return NextResponse.json({
    appointment: data,
    calendarEventLink,
    doctorCalendarEventLink,
  })
}

// DELETE /api/patient/appointments — delete/cancel an appointment
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const patient = await getPatientRow(session.user.email)
  if (!patient || !patient.patientRowId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const appointmentId = searchParams.get('id')

  if (!appointmentId) return NextResponse.json({ error: 'Appointment ID required' }, { status: 400 })

  // Verify the appointment belongs to this patient
  const { data: appointment } = await supabaseServer
    .from('appointments')
    .select('id, status, patient_id, doctor_id')
    .eq('id', appointmentId)
    .eq('patient_id', patient.patientRowId)
    .single()

  if (!appointment) return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })

  // Only allow deletion of pending appointments
  if (appointment.status !== 'Pending') {
    return NextResponse.json({ 
      error: 'Only pending appointments can be cancelled' 
    }, { status: 400 })
  }

  // Update status to Cancelled instead of deleting (better for records)
  const { error } = await supabaseServer
    .from('appointments')
    .update({ status: 'Cancelled' })
    .eq('id', appointmentId)
    .eq('patient_id', patient.patientRowId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify the doctor about cancellation
  if (appointment.doctor_id) {
    // Get doctor's user_id from doctors table
    const { data: doctorRow } = await supabaseServer
      .from('doctors')
      .select('user_id')
      .eq('id', appointment.doctor_id)
      .single()

    if (doctorRow?.user_id) {
      await supabaseServer.from('doctor_notifications').insert({
        doctor_id: doctorRow.user_id,
        title: 'Appointment Cancelled',
        message: `${patient.full_name ?? 'A patient'} has cancelled their appointment.`,
        type: 'appointment',
      })
    }
  }

  return NextResponse.json({ success: true, message: 'Appointment cancelled successfully' })
}
