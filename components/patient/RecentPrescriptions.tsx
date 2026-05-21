'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pill, ChevronRight, Loader2 } from 'lucide-react';
import { usePatientState } from './PatientStateContext';

interface Prescription {
  id: string;
  medicines: { name: string; dosage?: string; frequency?: string }[];
  notes: string;
  issuedDate: string;
  doctorName: string;
}

export default function RecentPrescriptions() {
  const router = useRouter();
  const { notifications } = usePatientState();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);

  const prescriptionNotifCount = notifications.filter(
    n => !n.read && n.type === 'prescription',
  ).length;

  const loadPrescriptions = () => {
    fetch('/api/patient/prescriptions')
      .then(r => r.ok ? r.json() : { prescriptions: [] })
      .then(d => setPrescriptions((d.prescriptions ?? []).slice(0, 3)))
      .catch(() => setPrescriptions([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPrescriptions();
  }, []);

  // Refetch when a new prescription notification arrives
  useEffect(() => {
    if (prescriptionNotifCount === 0) return;
    fetch('/api/patient/prescriptions')
      .then(r => r.ok ? r.json() : { prescriptions: [] })
      .then(d => setPrescriptions((d.prescriptions ?? []).slice(0, 3)))
      .catch(() => {});
  }, [prescriptionNotifCount]);

  if (loading) {
    return (
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 flex justify-center">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        </div>
      </section>
    );
  }

  if (prescriptions.length === 0) return null;

  return (
    <section className="py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Pill className="w-5 h-5 text-purple-600" />
            <h2 className="text-xl font-bold text-gray-900">Recent Prescriptions</h2>
            {prescriptionNotifCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-semibold">
                {prescriptionNotifCount} new
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => router.push('/patient-dashboard/records?tab=prescriptions')}
            className="flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            View all
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {prescriptions.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => router.push('/patient-dashboard/records?tab=prescriptions')}
              className="text-left bg-white rounded-2xl border border-purple-100 shadow-sm p-5 hover:shadow-md hover:border-purple-200 transition-all"
            >
              <p className="font-bold text-gray-900 mb-1">
                {p.medicines.length} medicine{p.medicines.length !== 1 ? 's' : ''}
              </p>
              <p className="text-sm text-gray-500 mb-2">
                Dr. {p.doctorName} · {p.issuedDate}
              </p>
              <p className="text-sm text-gray-700 line-clamp-2">
                {p.medicines.map(m => m.name).join(', ')}
              </p>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
