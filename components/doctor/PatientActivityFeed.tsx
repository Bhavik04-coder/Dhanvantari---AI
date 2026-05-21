'use client';

import { Package, Activity, Calendar, Brain, Clock, Loader2 } from 'lucide-react';

export type PatientActivity = {
  id: string;
  type: 'medicine' | 'pathology' | 'appointment' | 'prediction' | string;
  date: string;
  status?: string;
  total?: number;
  title?: string;
  items?: { name?: string; price?: number; quantity?: number }[];
  details?: Record<string, unknown>;
};

function getActivityIcon(type: string) {
  switch (type) {
    case 'medicine': return <Package className="w-5 h-5 text-blue-500" />;
    case 'pathology': return <Activity className="w-5 h-5 text-purple-500" />;
    case 'appointment': return <Calendar className="w-5 h-5 text-teal-500" />;
    case 'prediction': return <Brain className="w-5 h-5 text-indigo-500" />;
    default: return <Clock className="w-5 h-5 text-gray-400" />;
  }
}

function statusClass(status?: string) {
  const s = (status ?? '').toLowerCase();
  if (['completed', 'delivered', 'confirmed'].includes(s)) return 'bg-green-100 text-green-700';
  if (['cancelled', 'rejected'].includes(s)) return 'bg-red-100 text-red-700';
  return 'bg-blue-100 text-blue-700';
}

function activityTitle(activity: PatientActivity) {
  if (activity.type === 'medicine') return 'Medicine Order (Patient)';
  if (activity.type === 'pathology') return 'Pathology Booking (Patient)';
  if (activity.type === 'appointment') return activity.title ?? 'Appointment';
  return activity.title ?? activity.type;
}

function activitySummary(activity: PatientActivity) {
  const items = activity.items ?? [];
  if (activity.type === 'medicine') {
    const names = items.map(i => i.name ?? 'Item').join(', ');
    return `${items.length} item${items.length !== 1 ? 's' : ''} · ₹${activity.total ?? 0}${names ? ` · ${names}` : ''}`;
  }
  if (activity.type === 'pathology') {
    return items.map(i => i.name).filter(Boolean).join(', ') || 'Lab tests booked';
  }
  if (activity.type === 'appointment') {
    const d = activity.details ?? {};
    return `Mode: ${d.mode ?? '—'} · ${activity.status ?? '—'}`;
  }
  if (activity.type === 'prediction') {
    const d = activity.details ?? {};
    return `Confidence: ${d.confidence ?? '—'}% · ${activity.status ?? '—'}`;
  }
  return '';
}

type Props = {
  activities: PatientActivity[];
  loading: boolean;
  emptyLabel?: string;
  filterTypes?: PatientActivity['type'][];
  showPatientInitiatedOnly?: boolean;
};

export default function PatientActivityFeed({
  activities,
  loading,
  emptyLabel = 'No activity from this patient yet.',
  filterTypes,
  showPatientInitiatedOnly = false,
}: Props) {
  let list = activities;
  if (filterTypes?.length) {
    list = list.filter(a => filterTypes.includes(a.type as PatientActivity['type']));
  }
  if (showPatientInitiatedOnly) {
    list = list.filter(a => a.type === 'medicine' || a.type === 'pathology');
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <div className="text-center py-10 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
        <p className="text-gray-500">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {list.map(activity => (
        <div
          key={`${activity.type}-${activity.id}`}
          className="flex gap-4 p-4 rounded-2xl border border-gray-100 bg-white hover:border-blue-100 hover:shadow-sm transition-all"
        >
          <div className="shrink-0 w-11 h-11 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center">
            {getActivityIcon(activity.type)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h4 className="font-bold text-gray-900">{activityTitle(activity)}</h4>
              <span className="text-xs text-gray-400 shrink-0">
                {new Date(activity.date).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
            <p className="text-sm text-gray-600 line-clamp-2">{activitySummary(activity)}</p>
            {activity.type === 'medicine' && activity.details?.address != null && (
              <p className="text-xs text-gray-400 mt-1 italic">
                Deliver to: {String(activity.details.address)}
              </p>
            )}
            {activity.type === 'pathology' && activity.details?.preferredDate != null && (
              <p className="text-xs text-gray-400 mt-1">
                Preferred: {String(activity.details.preferredDate)}
                {activity.details.preferredTime ? ` · ${String(activity.details.preferredTime)}` : ''}
              </p>
            )}
          </div>
          {activity.status && (
            <span className={`self-center shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusClass(activity.status)}`}>
              {activity.status}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
