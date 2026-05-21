'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRealtimeNotifications, type RealtimeNotification } from '@/hooks/useRealtimeNotifications';
import { useRealtimeAppointments, type RealtimeAppointment } from '@/hooks/useRealtimeAppointments';

// --- Type Definitions ---
export type Patient = {
  id: number;
  userId?: string;
  name: string;
  age: number;
  gender?: string;
  blood_group?: string;
  symptoms: string;
  disease: string;
  confidence: number;
  risk: 'High' | 'Medium' | 'Low';
  avatar: string;
};

export type Appointment = {
  id: string;
  patientName: string;
  patientId?: string | null;      // patients.id (FK in appointments table)
  patientUserId?: string | null;  // users.id — matches Patient.userId
  time: string;
  date: string;
  type: string;
  mode: 'Online' | 'Offline';
  status: 'Confirmed' | 'Pending' | 'Cancelled';
  avatar: string;
  reason?: string;
  initiatedBy?: string;
  meetLink?: string | null;
};

export type Prediction = {
  id: string;
  patient: string;
  disease: string;
  confidence: number;
  symptoms: string[];
  explanation: string;
  status: 'Pending' | 'Approved' | 'Modified';
  initiatedBy?: 'doctor' | 'patient';
};

export type LabResult = {
  id: number;
  patient: string;
  test: string;
  date: string;
  status: 'Completed' | 'Pending';
  result: string;
};

export type TestRequest = {
  id: string;
  patientId: string | null;
  patientName: string;
  testName: string;
  requestedByDoctorId: number;
  requestedByDoctorName: string;
  requestDate: string;
  orderedDate?: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  priority: 'Normal' | 'High' | 'Urgent';
  diagnosisReason: string;
  reason?: string;
  result?: string;
  initiatedBy?: 'doctor' | 'patient';
  price?: number | null;
  labValues?: {
    name: string;
    value: string;
    unit: string;
    referenceRange: string;
    status: 'Normal' | 'Abnormal' | 'Critical';
  }[];
};

export type Notification = {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'alert' | 'appointment' | 'system' | 'result';
  read: boolean;
};

export type PatientMetric = {
  id: string;
  patientId: string | null;
  date: string;
  heartRate: number;
  bloodPressure: { systolic: number; diastolic: number };
  glucose: number;
  temperature: number;
};

// --- Context ---
interface DoctorContextType {
  patients: Patient[];
  setPatients: React.Dispatch<React.SetStateAction<Patient[]>>;
  appointments: Appointment[];
  setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
  predictions: Prediction[];
  setPredictions: React.Dispatch<React.SetStateAction<Prediction[]>>;
  labResults: LabResult[];
  setLabResults: React.Dispatch<React.SetStateAction<LabResult[]>>;
  testRequests: TestRequest[];
  setTestRequests: React.Dispatch<React.SetStateAction<TestRequest[]>>;
  notifications: Notification[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  metrics: PatientMetric[];
  setMetrics: React.Dispatch<React.SetStateAction<PatientMetric[]>>;
  loading: boolean;
  unreadCount: number;
  addNotification: (noti: Omit<Notification, 'id' | 'read' | 'time'>) => Promise<void>;
  getTestsByDoctor: (doctorId: number) => TestRequest[];
  refreshAll: () => Promise<void>;
}

const DoctorStateContext = createContext<DoctorContextType | undefined>(undefined);

export function DoctorStateProvider({ children }: { children: ReactNode }) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [labResults, setLabResults] = useState<LabResult[]>([]);
  const [testRequests, setTestRequests] = useState<TestRequest[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [metrics, setMetrics] = useState<PatientMetric[]>([]);
  const [loading, setLoading] = useState(true);
  // doctorUserId is users.id — used for realtime notification filter
  const [doctorUserId, setDoctorUserId] = useState<string | null>(null);
  // doctorRowId is doctors.id — used for realtime appointment filter
  const [doctorRowId, setDoctorRowId] = useState<string | null>(null);

  // ── Realtime: new notifications pushed from DB ──────────────────────────
  useRealtimeNotifications({
    table: 'doctor_notifications',
    userId: doctorUserId,
    onNew: useCallback((n: RealtimeNotification) => {
      setNotifications(prev => {
        if (prev.some(x => x.id === n.id)) return prev;
        const mapped: Notification = {
          id:      n.id,
          title:   n.title,
          message: n.message,
          type:    (n.type as Notification['type']) ?? 'system',
          read:    false,
          time:    n.time,
        };
        return [mapped, ...prev];
      });
    }, []),
  });

  // ── Realtime: appointment inserts/updates ───────────────────────────────
  useRealtimeAppointments({
    role: 'doctor',
    rowId: doctorRowId,
    onUpdate: useCallback((apt: RealtimeAppointment, eventType: 'INSERT' | 'UPDATE') => {
      setAppointments(prev => {
        if (eventType === 'INSERT') {
          if (prev.some(x => x.id === apt.id)) return prev;
          const mapped: Appointment = {
            id:            apt.id,
            patientName:   apt.patientName ?? 'Patient',
            patientId:     apt.patientId ?? null,
            patientUserId: null, // resolved on next full fetch
            date:          apt.date,
            time:          apt.time,
            type:          apt.type,
            mode:          apt.mode,
            status:        apt.status,
            reason:        apt.reason,
            initiatedBy:   apt.initiatedBy,
            meetLink:      apt.meetLink ?? null,
            avatar:        (apt.patientName ?? 'P').split(' ')[0],
          };
          return [mapped, ...prev];
        }
        // UPDATE — patch the existing entry
        return prev.map(x =>
          x.id === apt.id
            ? { ...x, status: apt.status, meetLink: apt.meetLink ?? x.meetLink }
            : x,
        );
      });
    }, []),
  });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const responses = await Promise.all([
        fetch('/api/doctor/patients'),
        fetch('/api/doctor/appointments'),
        fetch('/api/doctor/predictions'),
        fetch('/api/doctor/lab-tests'),
        fetch('/api/doctor/vitals'),
        fetch('/api/doctor/notifications'),
        fetch('/api/user/profile'),
      ]);

      const [pData, aData, prData, tData, vData, nData, meData] = await Promise.all(
        responses.map(res => res.ok ? res.json() : Promise.resolve({}))
      );

      if (pData.patients) setPatients(pData.patients);
      if (aData.appointments) setAppointments(aData.appointments.map((a: any) => ({
        ...a,
        patientUserId: a.patientUserId ?? null,
      })));
      if (prData.predictions) setPredictions(prData.predictions);
      if (tData.tests) setTestRequests(tData.tests);
      if (vData.metrics) setMetrics(vData.metrics);
      if (nData.notifications) setNotifications(nData.notifications);
      if (meData.userId) setDoctorUserId(meData.userId);
      if (meData.doctorRowId) setDoctorRowId(meData.doctorRowId);
    } catch (err) {
      console.error('Failed to load doctor data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const addNotification = useCallback(async (noti: Omit<Notification, 'id' | 'read' | 'time'>) => {
    // Optimistic update
    const temp: Notification = { ...noti, id: `temp-${Date.now()}`, read: false, time: 'Just now' };
    setNotifications(prev => [temp, ...prev]);

    // Persist to DB
    try {
      await fetch('/api/doctor/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(noti),
      });
    } catch { /* non-critical */ }
  }, []);

  const getTestsByDoctor = useCallback((_doctorId: number) => testRequests, [testRequests]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <DoctorStateContext.Provider value={{
      patients, setPatients,
      appointments, setAppointments,
      predictions, setPredictions,
      labResults, setLabResults,
      testRequests, setTestRequests,
      notifications, setNotifications,
      metrics, setMetrics,
      loading,
      unreadCount,
      addNotification,
      getTestsByDoctor,
      refreshAll: fetchAll,
    }}>
      {children}
    </DoctorStateContext.Provider>
  );
}

export function useDoctorState() {
  const context = useContext(DoctorStateContext);
  if (context === undefined) throw new Error('useDoctorState must be used within a DoctorStateProvider');
  return context;
}
