import type { Metadata } from 'next';
import { PatientStateProvider } from '@/components/patient/PatientStateContext';
import AppointmentStatusToast from '@/components/patient/AppointmentStatusToast';

export const metadata: Metadata = {
  title: 'Patient Dashboard',
  description: 'Manage your health, appointments, orders, and AI predictions from your personal dashboard.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <PatientStateProvider>
      {children}
      {/* Global toast — fires whenever a doctor accepts/cancels an appointment */}
      <AppointmentStatusToast />
    </PatientStateProvider>
  );
}
