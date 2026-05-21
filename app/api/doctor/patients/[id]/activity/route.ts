import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { supabaseServer } from '@/lib/supabaseServer'
import { normalizePatientRowId } from '@/lib/patientResolve'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const patientUserId = params.id

  const [doctorRes, patientRowRes, userRes] = await Promise.all([
    supabaseServer.from('users').select('id, role').eq('email', session.user.email).single(),
    supabaseServer.from('patients').select('id').eq('user_id', patientUserId).maybeSingle(),
    supabaseServer.from('users').select('full_name, email').eq('id', patientUserId).maybeSingle(),
  ])

  const userRow = doctorRes.data
  if (!userRow || userRow.role !== 'doctor') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const patientTableId = normalizePatientRowId(patientRowRes.data?.id)
  const patientDisplayName = userRes.data?.full_name ?? userRes.data?.email ?? ''

  const [medRes, apptRes, predRes] = await Promise.all([
    supabaseServer
      .from('medicine_orders')
      .select('*')
      .eq('patient_id', patientUserId)
      .order('created_at', { ascending: false }),

    patientTableId
      ? supabaseServer
          .from('appointments')
          .select('*')
          .eq('patient_id', patientTableId)
          .order('appointment_date', { ascending: false })
      : Promise.resolve({ data: [], error: null }),

    supabaseServer
      .from('ai_predictions')
      .select('*')
      .eq('patient_id', patientUserId)
      .order('created_at', { ascending: false }),
  ])

  const labSeen = new Set<string>()
  const labRows: Record<string, unknown>[] = []

  if (patientTableId) {
    const { data } = await supabaseServer
      .from('pathology_bookings')
      .select('*, pathology_booking_items(*)')
      .eq('patient_id', patientTableId)
      .order('created_at', { ascending: false })
    for (const b of (data ?? []) as Record<string, unknown>[]) {
      const id = String(b.id)
      if (!labSeen.has(id)) {
        labSeen.add(id)
        labRows.push(b)
      }
    }
  }

  if (patientDisplayName) {
    const { data } = await supabaseServer
      .from('pathology_bookings')
      .select('*, pathology_booking_items(*)')
      .ilike('full_name', `%${patientDisplayName.trim()}%`)
      .order('created_at', { ascending: false })
    for (const b of (data ?? []) as Record<string, unknown>[]) {
      const id = String(b.id)
      if (!labSeen.has(id)) {
        labSeen.add(id)
        labRows.push(b)
      }
    }
  }

  const normalizeItems = (raw: unknown) => {
    if (!Array.isArray(raw)) return []
    return raw.map((item: Record<string, unknown>) => ({
      name: (item.name ?? item.medicine_name ?? item.test_name ?? 'Item') as string,
      price: item.price as number | undefined,
      quantity: item.quantity as number | undefined,
    }))
  }

  const medicineOrders = (medRes.data ?? []).map(o => ({
    id: o.id,
    type: 'medicine' as const,
    date: o.created_at,
    status: o.status,
    total: o.total,
    items: normalizeItems(o.items),
    details: {
      address: o.delivery_address ?? o.address,
      payment: o.payment_method,
    },
  }))

  const labBookings = labRows.map(b => ({
    id: b.id,
    type: 'pathology' as const,
    date: b.created_at,
    status: b.status,
    total: b.total,
    items: ((b.pathology_booking_items as Record<string, unknown>[]) ?? []).map(i => ({
      name: i.test_name as string,
      price: i.price as number,
    })),
    details: {
      preferredDate: b.preferred_date,
      preferredTime: b.preferred_time,
      address: [b.address_line1, b.city].filter(Boolean).join(', '),
    },
  }))

  const appointments = (apptRes.data ?? []).map(a => ({
    id: a.id,
    type: 'appointment' as const,
    date: a.appointment_date,
    status: a.status,
    title: a.type,
    details: {
      time: a.appointment_time,
      mode: a.mode,
      doctor: a.doctor_name,
      reason: a.reason,
    },
  }))

  const predictions = (predRes.data ?? []).map(p => ({
    id: p.id,
    type: 'prediction' as const,
    date: p.created_at,
    status: p.status,
    title: p.disease,
    details: {
      confidence: p.confidence,
      symptoms: p.symptoms,
      explanation: p.explanation,
      initiatedBy: p.initiated_by,
    },
  }))

  const activities = [...medicineOrders, ...labBookings, ...appointments, ...predictions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )

  return NextResponse.json({
    activities,
    summary: {
      medicineOrders: medicineOrders.length,
      pathologyBookings: labBookings.length,
    },
  })
}
