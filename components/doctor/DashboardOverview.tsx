'use client';

import { useState } from 'react';
import { Users, Brain, AlertTriangle, Calendar, MessageSquare } from 'lucide-react';
import StatCard from './StatCard';
import { useDoctorState } from './DoctorStateContext';
import { useSession } from 'next-auth/react';

export default function DashboardOverview({ setActiveTab }: { setActiveTab?: (tab: string) => void }) {
  const [isOnline, setIsOnline] = useState(true);
  const { patients, appointments, predictions, notifications } = useDoctorState();
  const { data: session } = useSession();

  const doctorName = session?.user?.name ?? 'Doctor';
  const doctorAvatar = session?.user?.image ??
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(doctorName)}`;

  const todayStr = new Date().toISOString().split('T')[0];
  const todayAppointments = appointments.filter(a => a.date === todayStr);
  const todayPredictions = predictions.filter(p => {
    // predictions don't have a date field in context, show total pending
    return p.status === 'Pending';
  });
  const highRiskPatients = patients.filter(p => p.risk === 'High');
  const unreadNotifs = notifications.filter(n => !n.read);

  const stats = [
    { title: 'Total Patients', value: patients.length.toString(), change: '', icon: Users, color: 'blue', trend: 'up' as const },
    { title: 'Pending Predictions', value: todayPredictions.length.toString(), change: '', icon: Brain, color: 'purple', trend: 'up' as const },
    { title: 'High-Risk Patients', value: highRiskPatients.length.toString(), change: '', icon: AlertTriangle, color: 'red', trend: 'down' as const },
    { title: "Today's Appointments", value: todayAppointments.length.toString(), change: '', icon: Calendar, color: 'green', trend: 'up' as const },
  ];

  return (
    <div className="p-8">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome back, {doctorName}</h1>
          <p className="text-gray-600">Here&apos;s what&apos;s happening with your patients today</p>
        </div>
        <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-full shadow-sm border border-gray-100">
          <img
            src={doctorAvatar}
            alt={doctorName}
            className="w-10 h-10 rounded-full"
          />
          <div>
            <p className="font-semibold text-gray-900 text-sm">{doctorName}</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsOnline(!isOnline)}
                className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'} animate-pulse`}
                aria-label={`Toggle status: Currently ${isOnline ? 'online' : 'offline'}`}
                title={`Toggle status: Currently ${isOnline ? 'online' : 'offline'}`}
              />
              <span className="text-xs text-gray-500">{isOnline ? 'Online' : 'Offline'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Patients</h2>
          <div className="space-y-4">
            {patients.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6">No patients assigned yet.</p>
            ) : patients.slice(0, 3).map((patient, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-transparent rounded-xl hover:shadow-md transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <img
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${patient.avatar || patient.name}`}
                    alt={patient.name}
                    className="w-12 h-12 rounded-full"
                  />
                  <div>
                    <p className="font-semibold text-gray-900">{patient.name}</p>
                    <p className="text-sm text-gray-600">{patient.age > 0 ? `${patient.age} years` : 'Age unknown'}{patient.disease ? ` • ${patient.disease}` : ''}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${patient.risk === 'High' ? 'bg-red-100 text-red-700' : patient.risk === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                    {patient.risk} Risk
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            {[
              { label: 'New Prescription', icon: '📝', color: 'blue', tab: 'prescriptions' },
              { label: 'Schedule Appointment', icon: '📅', color: 'green', tab: 'appointments' },
              { label: 'Review AI Predictions', icon: '🤖', color: 'purple', tab: 'ai-predictions' },
              { label: 'AI Clinical Chat', icon: '💬', color: 'indigo', tab: 'ai-chat' },
            ].map((action, index) => (
              <button
                type="button"
                key={index}
                onClick={() => setActiveTab?.(action.tab)}
                className={`w-full flex items-center gap-3 p-4 bg-gradient-to-r from-${action.color}-50 to-transparent rounded-xl hover:shadow-md transition-all duration-200`}
              >
                <span className="text-2xl">{action.icon}</span>
                <span className="font-medium text-gray-900">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Brain className="w-6 h-6 text-purple-600" />
          Recent AI Predictions Feed
        </h2>
        <div className="space-y-4">
          {predictions.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">No predictions yet. Run one from AI Prediction Review.</p>
          ) : predictions.slice(0, 5).map((prediction, index) => (
            <div key={index} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:shadow-md transition">
              <div className="flex items-center gap-4">
                <div className={`w-2 h-12 rounded-full ${prediction.confidence >= 85 ? 'bg-red-500' : prediction.confidence >= 65 ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                <div>
                  <p className="font-semibold text-gray-900">{prediction.patient}</p>
                  <p className="text-sm text-gray-600">Predicted: <span className="font-medium text-purple-600">{prediction.disease}</span> ({prediction.confidence}% confidence)</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${prediction.status === 'Approved' ? 'bg-green-100 text-green-700' : prediction.status === 'Modified' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {prediction.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
