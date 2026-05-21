'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Activity, Heart, Droplets, UserSquare2, Thermometer, Plus, X, Calendar,
  Package, FlaskConical, TrendingUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useDoctorState, Patient } from './DoctorStateContext';
import PatientActivityFeed, { type PatientActivity } from './PatientActivityFeed';

function isConfirmed(status: string) {
  return String(status).toLowerCase() === 'confirmed';
}

export default function ProgressTracker() {
  const { patients, appointments, metrics, setMetrics, refreshAll } = useDoctorState();
  const [fetchedPatients, setFetchedPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [activities, setActivities] = useState<PatientActivity[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [activityTab, setActivityTab] = useState<'all' | 'medicine' | 'pathology'>('all');
  const [newVitals, setNewVitals] = useState({
    date: new Date().toISOString().split('T')[0],
    heartRate: '', bpSys: '', bpDia: '', glucose: '', temp: '',
  });

  useEffect(() => {
    refreshAll();
    fetch('/api/doctor/patients')
      .then(r => (r.ok ? r.json() : { patients: [] }))
      .then(d => setFetchedPatients(d.patients ?? []))
      .catch(() => setFetchedPatients([]));
  }, [refreshAll]);

  const selectablePatients = useMemo(() => {
    const map = new Map<string, Patient>();
    [...patients, ...fetchedPatients].forEach(p => {
      const key = p.userId ?? p.name;
      if (!map.has(key)) map.set(key, p);
    });
    appointments.filter(a => isConfirmed(a.status)).forEach(a => {
      const key = a.patientUserId ?? a.patientName ?? a.id;
      if (map.has(key)) return;
      const matched = [...patients, ...fetchedPatients].find(
        p =>
          (a.patientUserId && p.userId === a.patientUserId) ||
          (!a.patientUserId && p.name === a.patientName),
      );
      if (matched) map.set(key, matched);
      else if (a.patientUserId) {
        map.set(key, {
          id: map.size + 1,
          userId: a.patientUserId,
          name: a.patientName,
          age: 0,
          avatar: (a.patientName ?? 'P').split(' ')[0],
          gender: '',
          symptoms: '',
          disease: '',
          confidence: 0,
          risk: 'Low',
        });
      }
    });
    return Array.from(map.values());
  }, [patients, fetchedPatients, appointments]);

  const currentPatient =
    selectablePatients.find(p => p.userId === selectedPatientId) ?? selectablePatients[0];

  useEffect(() => {
    if (!selectedPatientId && currentPatient?.userId) {
      setSelectedPatientId(currentPatient.userId);
    }
  }, [currentPatient?.userId, selectedPatientId]);

  const patientUserId = selectedPatientId || currentPatient?.userId;

  useEffect(() => {
    if (!patientUserId) {
      setActivities([]);
      return;
    }
    setLoadingActivity(true);
    fetch(`/api/doctor/patients/${patientUserId}/activity`)
      .then(r => (r.ok ? r.json() : { activities: [] }))
      .then(d => setActivities(d.activities ?? []))
      .catch(() => setActivities([]))
      .finally(() => setLoadingActivity(false));
  }, [patientUserId]);

  const medicineCount = activities.filter(a => a.type === 'medicine').length;
  const pathologyCount = activities.filter(a => a.type === 'pathology').length;

  const patientMetrics = metrics
    .filter(m => m.patientId === patientUserId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const latestMetric = patientMetrics[0];

  const handleSaveVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPatient?.userId) return;

    const res = await fetch('/api/doctor/vitals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId: currentPatient.userId,
        date: newVitals.date,
        heartRate: newVitals.heartRate,
        bpSys: newVitals.bpSys,
        bpDia: newVitals.bpDia,
        glucose: newVitals.glucose,
        temp: newVitals.temp,
      }),
    });

    if (res.ok) {
      const { metric } = await res.json();
      setMetrics(prev => [metric, ...prev]);
    }

    setShowVitalsModal(false);
    setNewVitals({
      date: new Date().toISOString().split('T')[0],
      heartRate: '', bpSys: '', bpDia: '', glucose: '', temp: '',
    });
  };

  const chartStyle = {
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  };

  const activityFilter =
    activityTab === 'medicine'
      ? (['medicine'] as PatientActivity['type'][])
      : activityTab === 'pathology'
        ? (['pathology'] as PatientActivity['type'][])
        : undefined;

  const activityEmptyLabel =
    activityTab === 'medicine'
      ? 'No medicine orders from this patient yet.'
      : activityTab === 'pathology'
        ? 'No pathology bookings from this patient yet.'
        : 'No patient-side bookings yet. Orders from Buy Medicine or Lab booking will appear here.';

  return (
    <div className="w-full p-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wider mb-3 border border-blue-200">
            <TrendingUp className="w-4 h-4" /> Progress Tracker
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">
            Patient <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">Telemetry</span>
          </h1>
          <p className="text-gray-500 text-base">
            Vitals, charts, and self-service bookings (medicine & pathology) from the patient app.
          </p>
        </div>

        <div className="w-full md:w-96 flex gap-3 items-end">
          <div className="flex-1">
            <label htmlFor="patient-select" className="text-gray-500 text-sm font-semibold mb-2 block">
              Select Patient
            </label>
            <div className="relative">
              <select
                id="patient-select"
                value={patientUserId ?? ''}
                onChange={e => setSelectedPatientId(e.target.value)}
                className="w-full appearance-none bg-white border border-gray-200 text-gray-900 font-semibold py-3 pl-12 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer"
              >
                {selectablePatients.length > 0 ? (
                  selectablePatients.map(p => (
                    <option key={p.userId ?? p.id} value={p.userId ?? ''}>
                      {p.name}
                    </option>
                  ))
                ) : (
                  <option value="">No patients — confirm an appointment first</option>
                )}
              </select>
              <UserSquare2 className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500 w-5 h-5 pointer-events-none" />
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowVitalsModal(true)}
            disabled={!patientUserId}
            className="h-12 px-5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-md flex items-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-5 h-5" /> Log Vitals
          </button>
        </div>
      </div>

      {/* Patient booking summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
            <Package className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Medicine orders (patient)</p>
            <p className="text-2xl font-bold text-gray-900">{medicineCount}</p>
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-white border border-purple-100 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
            <FlaskConical className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Pathology bookings (patient)</p>
            <p className="text-2xl font-bold text-gray-900">{pathologyCount}</p>
          </div>
        </div>
      </div>

      {/* Vital Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <p className="text-gray-500 text-sm font-medium">Heart Rate</p>
            <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center text-rose-500">
              <Heart className="w-4 h-4 animate-pulse" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{latestMetric?.heartRate || '--'}</p>
          <p className="text-gray-400 text-xs mt-1">bpm</p>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <p className="text-gray-500 text-sm font-medium">Blood Pressure</p>
            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center text-blue-500">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {latestMetric?.bloodPressure
              ? `${latestMetric.bloodPressure.systolic}/${latestMetric.bloodPressure.diastolic}`
              : '--/--'}
          </p>
          <p className="text-gray-400 text-xs mt-1">mmHg</p>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <p className="text-gray-500 text-sm font-medium">Blood Glucose</p>
            <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center text-purple-500">
              <Droplets className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{latestMetric?.glucose || '--'}</p>
          <p className="text-gray-400 text-xs mt-1">mg/dL</p>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <p className="text-gray-500 text-sm font-medium">Body Temp</p>
            <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center text-orange-500">
              <Thermometer className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{latestMetric?.temperature || '--'}</p>
          <p className="text-gray-400 text-xs mt-1">°F</p>
        </div>
      </div>

      {/* Patient self-service activity */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="font-bold text-lg text-gray-900">Patient Bookings & Orders</h3>
            <p className="text-sm text-gray-500">
              Medicine orders and pathology tests booked by {currentPatient?.name ?? 'the patient'} from their dashboard.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['all', 'medicine', 'pathology'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setActivityTab(tab)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  activityTab === tab
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab === 'all' ? 'All' : tab === 'medicine' ? 'Medicine' : 'Pathology'}
                {tab === 'medicine' && medicineCount > 0 && ` (${medicineCount})`}
                {tab === 'pathology' && pathologyCount > 0 && ` (${pathologyCount})`}
              </button>
            ))}
          </div>
        </div>

        <PatientActivityFeed
          activities={activities}
          loading={loadingActivity}
          filterTypes={activityFilter}
          emptyLabel={activityEmptyLabel}
        />
      </div>

      {/* Charts */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold text-lg text-gray-900 mb-6">Historical Vitals Breakdown</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[
            { title: 'Heart Rate (bpm)', icon: Heart, color: '#f43f5e', gradientId: 'colorHeartRate', dataKey: 'heartRate', domain: ['dataMin - 5', 'dataMax + 5'] as [string, string] },
            { title: 'Blood Glucose (mg/dL)', icon: Droplets, color: '#a855f7', gradientId: 'colorGlucose', dataKey: 'glucose', domain: ['dataMin - 10', 'dataMax + 10'] as [string, string] },
          ].map(({ title, icon: Icon, color, gradientId, dataKey, domain }) => (
            <div key={dataKey} className="bg-gray-50 rounded-xl p-5 border border-gray-100">
              <h4 className="text-gray-500 text-sm font-semibold mb-4 flex items-center gap-2">
                <Icon className="w-4 h-4" style={{ color }} /> {title}
              </h4>
              <div className="w-full h-52">
                {patientMetrics.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={[...patientMetrics].reverse()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} tickMargin={8} />
                      <YAxis stroke="#9ca3af" fontSize={11} domain={domain} />
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                      <Tooltip contentStyle={chartStyle} />
                      <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fillOpacity={1} fill={`url(#${gradientId})`} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center w-full h-full text-gray-400 text-sm">No data available.</div>
                )}
              </div>
            </div>
          ))}

          <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
            <h4 className="text-gray-500 text-sm font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-500" /> Blood Pressure (mmHg)
            </h4>
            <div className="w-full h-52">
              {patientMetrics.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={[...patientMetrics].reverse().map(m => ({
                      ...m,
                      systolic: m.bloodPressure.systolic,
                      diastolic: m.bloodPressure.diastolic,
                    }))}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorBP" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} tickMargin={8} />
                    <YAxis stroke="#9ca3af" fontSize={11} />
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <Tooltip contentStyle={chartStyle} />
                    <Area type="monotone" name="Systolic" dataKey="systolic" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorBP)" />
                    <Area type="monotone" name="Diastolic" dataKey="diastolic" stroke="#60a5fa" strokeWidth={2} fillOpacity={0.5} fill="url(#colorBP)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center w-full h-full text-gray-400 text-sm">No data available.</div>
              )}
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
            <h4 className="text-gray-500 text-sm font-semibold mb-4 flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-orange-500" /> Temperature (°F)
            </h4>
            <div className="w-full h-52">
              {patientMetrics.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={[...patientMetrics].reverse()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} tickMargin={8} />
                    <YAxis stroke="#9ca3af" fontSize={11} domain={[96, 102]} />
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <Tooltip contentStyle={chartStyle} />
                    <Area type="monotone" name="Temperature" dataKey="temperature" stroke="#f97316" strokeWidth={2} fillOpacity={1} fill="url(#colorTemp)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center w-full h-full text-gray-400 text-sm">No data available.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Log Vitals Modal */}
      <AnimatePresence>
        {showVitalsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white border border-gray-200 rounded-2xl p-8 max-w-lg w-full shadow-2xl relative"
            >
              <button
                type="button"
                onClick={() => setShowVitalsModal(false)}
                className="absolute top-5 right-5 p-2 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-full transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-2xl font-bold text-gray-900 mb-1">Log Vitals</h2>
              <p className="text-gray-500 text-sm mb-6">Record health metrics for {currentPatient?.name || 'the patient'}.</p>

              <form onSubmit={handleSaveVitals} className="space-y-4">
                <div>
                  <label htmlFor="vitals-date" className="block text-sm font-semibold text-gray-700 mb-2">Date of Recording</label>
                  <div className="relative">
                    <input
                      id="vitals-date"
                      type="date"
                      value={newVitals.date}
                      onChange={e => setNewVitals({ ...newVitals, date: e.target.value })}
                      className="w-full bg-white border border-gray-200 text-gray-900 rounded-xl p-3 pl-12 focus:ring-2 focus:ring-blue-500 outline-none"
                      required
                    />
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="vitals-hr" className="block text-sm font-semibold text-gray-700 mb-2">Heart Rate (bpm)</label>
                    <input id="vitals-hr" type="number" value={newVitals.heartRate} onChange={e => setNewVitals({ ...newVitals, heartRate: e.target.value })} className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. 76" />
                  </div>
                  <div>
                    <label htmlFor="vitals-temp" className="block text-sm font-semibold text-gray-700 mb-2">Temperature (°F)</label>
                    <input id="vitals-temp" type="number" step="0.1" value={newVitals.temp} onChange={e => setNewVitals({ ...newVitals, temp: e.target.value })} className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. 98.6" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Blood Pressure (mmHg)</label>
                  <div className="flex items-center gap-3">
                    <input type="number" value={newVitals.bpSys} onChange={e => setNewVitals({ ...newVitals, bpSys: e.target.value })} className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Systolic" aria-label="Systolic blood pressure" />
                    <span className="text-gray-400 font-bold text-xl">/</span>
                    <input type="number" value={newVitals.bpDia} onChange={e => setNewVitals({ ...newVitals, bpDia: e.target.value })} className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Diastolic" aria-label="Diastolic blood pressure" />
                  </div>
                </div>

                <div>
                  <label htmlFor="vitals-glucose" className="block text-sm font-semibold text-gray-700 mb-2">Blood Glucose (mg/dL)</label>
                  <input id="vitals-glucose" type="number" value={newVitals.glucose} onChange={e => setNewVitals({ ...newVitals, glucose: e.target.value })} className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. 105" />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button type="button" onClick={() => setShowVitalsModal(false)} className="px-5 py-2.5 text-gray-600 font-semibold hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
                  <button type="submit" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all">
                    Save Vitals
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
