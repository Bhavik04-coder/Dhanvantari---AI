import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { supabaseServer } from '@/lib/supabaseServer'
import { ensurePatientRowId } from '@/lib/patientResolve'

async function getPatientRow(email: string) {
  const { data: userRow } = await supabaseServer
    .from('users').select('id, role, full_name').eq('email', email).single()
  if (!userRow || userRow.role !== 'patient') return null

  const { data: patientRow } = await supabaseServer
    .from('patients').select('id').eq('user_id', userRow.id).single()

  return { ...userRow, patientId: patientRow?.id ?? null }
}

// POST /api/patient/lab-bookings â€” patient books lab tests
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const patient = await getPatientRow(session.user.email)
  if (!patient) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { tests } = body // array of { name, price }

  if (!tests || tests.length === 0)
    return NextResponse.json({ error: 'No tests provided' }, { status: 400 })

  const patientRowId = await ensurePatientRowId(
    patient.id,
    patient.full_name ?? session.user.email ?? undefined,
  )
  if (!patientRowId) {
    return NextResponse.json({ error: 'Patient profile could not be created.' }, { status: 400 })
  }

  const bookingId = `LAB-${Date.now()}`
  const total = tests.reduce((sum: number, t: { price?: number }) => sum + (t.price ?? 0), 0)

  // Insert pathology booking
  const { data: booking, error: bookingError } = await supabaseServer
    .from('pathology_bookings')
    .insert({
      id: bookingId,
      patient_id: patientRowId,
      total,
      status: 'pending',
      full_name: patient.full_name ?? session.user.email,
    })
    .select()
    .single()

  if (bookingError) return NextResponse.json({ error: bookingError.message }, { status: 500 })

  // Insert booking items
  const items = tests.map((t: { name: string; price?: number }) => ({
    booking_id: bookingId,
    test_name: t.name,
    price: t.price ?? 0,
    type: 'test',
  }))

  await supabaseServer.from('pathology_booking_items').insert(items)

  // Notify assigned doctors via notifications table
  if (patient.patientId) {
    const { data: doctorLinks } = await supabaseServer
      .from('appointments')
      .select('doctor_id')
      .eq('patient_id', patient.patientId)
      .limit(5)

    if (doctorLinks && doctorLinks.length > 0) {
      const testNames = tests.map((t: { name: string }) => t.name).join(', ')
      const uniqueDoctorIds = [...new Set(doctorLinks.map((l: { doctor_id: string }) => l.doctor_id))]

      // Get doctor user_ids
      const { data: doctorUsers } = await supabaseServer
        .from('doctors')
        .select('user_id')
        .in('id', uniqueDoctorIds)

      if (doctorUsers && doctorUsers.length > 0) {
        const notifications = doctorUsers.map((d: { user_id: string }) => ({
          user_id: d.user_id,
          title: 'Patient Booked Lab Tests',
          message: `${patient.full_name ?? 'A patient'} has self-booked lab tests: ${testNames}.`,
          type: 'result' as const,
        }))
        await supabaseServer.from('notifications').insert(notifications)
      }
    }
  }

  return NextResponse.json({ booking })
}

// GET /api/patient/lab-bookings â€” fetch patient's own lab bookings
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const patient = await getPatientRow(session.user.email)
  if (!patient || !patient.patientId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabaseServer
    .from('pathology_bookings')
    .select('*, pathology_booking_items(*)')
    .eq('patient_id', patient.patientId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ bookings: data ?? [] })
}

// DELETE /api/patient/lab-bookings — delete a lab booking
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const patient = await getPatientRow(session.user.email)
  if (!patient || !patient.patientId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const bookingId = searchParams.get('id')

  if (!bookingId) return NextResponse.json({ error: 'Booking ID required' }, { status: 400 })

  // Verify the booking belongs to this patient
  const { data: booking } = await supabaseServer
    .from('pathology_bookings')
    .select('id, status, patient_id')
    .eq('id', bookingId)
    .eq('patient_id', patient.patientId)
    .single()

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  // Only allow deletion of pending bookings
  if (booking.status !== 'pending') {
    return NextResponse.json({ 
      error: 'Only pending bookings can be deleted' 
    }, { status: 400 })
  }

  // Delete booking items first (foreign key constraint)
  await supabaseServer
    .from('pathology_booking_items')
    .delete()
    .eq('booking_id', bookingId)

  // Delete the booking
  const { error } = await supabaseServer
    .from('pathology_bookings')
    .delete()
    .eq('id', bookingId)
    .eq('patient_id', patient.patientId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, message: 'Booking deleted successfully' })
}
