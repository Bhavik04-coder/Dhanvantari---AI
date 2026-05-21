'use client';

/**
 * AppointmentStatusToast
 *
 * Listens to real-time appointment status changes via PatientStateContext
 * and shows a toast whenever a doctor confirms or cancels a request.
 *
 * Mount this once inside PatientStateProvider (e.g. patient-dashboard layout).
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { CheckCircle2, XCircle, X, Calendar, Video } from 'lucide-react';
import { usePatientStateSafe } from '@/components/patient/PatientStateContext';
import type { PatientAppointment } from '@/components/patient/PatientStateContext';

interface Toast {
  id: string;
  appointment: PatientAppointment;
  prevStatus: 'Pending' | 'Confirmed' | 'Cancelled';
  newStatus: 'Confirmed' | 'Cancelled';
}

export default function AppointmentStatusToast() {
  const { appointments } = usePatientStateSafe();
  const prevAppointmentsRef = useRef<PatientAppointment[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Watch for status changes
  useEffect(() => {
    const prev = prevAppointmentsRef.current;

    appointments.forEach(apt => {
      const old = prev.find(p => p.id === apt.id);
      if (!old) return; // new appointment — no status change yet

      const statusChanged =
        old.status !== apt.status &&
        (apt.status === 'Confirmed' || apt.status === 'Cancelled');

      if (statusChanged) {
        const toast: Toast = {
          id: `${apt.id}-${apt.status}-${Date.now()}`,
          appointment: apt,
          prevStatus: old.status,
          newStatus: apt.status as 'Confirmed' | 'Cancelled',
        };
        setToasts(prev => [...prev, toast]);

        // Auto-dismiss after 6 seconds
        setTimeout(() => dismiss(toast.id), 6000);
      }
    });

    prevAppointmentsRef.current = appointments;
  }, [appointments, dismiss]);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-label="Appointment notifications"
      className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full"
    >
      {toasts.map(toast => (
        <ToastCard key={toast.id} toast={toast} onDismiss={dismiss} />
      ))}
    </div>
  );
}

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const isConfirmed = toast.newStatus === 'Confirmed';
  const apt = toast.appointment;

  return (
    <div
      className={`relative flex items-start gap-4 p-4 rounded-2xl shadow-2xl border backdrop-blur-md animate-slide-up ${
        isConfirmed
          ? 'bg-green-50 border-green-200'
          : 'bg-red-50 border-red-200'
      }`}
      role="alert"
    >
      {/* Icon */}
      <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
        isConfirmed ? 'bg-green-100' : 'bg-red-100'
      }`}>
        {isConfirmed
          ? <CheckCircle2 className="w-5 h-5 text-green-600" />
          : <XCircle className="w-5 h-5 text-red-600" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`font-bold text-sm ${isConfirmed ? 'text-green-800' : 'text-red-800'}`}>
          Appointment {isConfirmed ? 'Confirmed' : 'Cancelled'}
        </p>
        <p className="text-xs text-gray-600 mt-0.5">
          Dr. {apt.doctorName} — {new Date(apt.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {formatTime(apt.time)}
        </p>

        {isConfirmed && apt.mode === 'Online' && apt.meetLink && (
          <a
            href={apt.meetLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition-colors"
          >
            <Video className="w-3.5 h-3.5" />
            Join Google Meet
          </a>
        )}

        {isConfirmed && apt.mode === 'Offline' && (
          <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 bg-green-100 text-green-700 text-xs font-semibold rounded-lg">
            <Calendar className="w-3.5 h-3.5" />
            In-person visit confirmed
          </div>
        )}
      </div>

      {/* Dismiss */}
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="shrink-0 p-1 rounded-full hover:bg-black/10 transition-colors text-gray-400 hover:text-gray-700"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Progress bar */}
      <div className={`absolute bottom-0 left-0 h-1 rounded-b-2xl ${isConfirmed ? 'bg-green-400' : 'bg-red-400'} animate-shrink-width`} />
    </div>
  );
}

function formatTime(time: string): string {
  try {
    const [h, m] = time.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    return `${hour % 12 || 12}:${m} ${ampm}`;
  } catch {
    return time;
  }
}
