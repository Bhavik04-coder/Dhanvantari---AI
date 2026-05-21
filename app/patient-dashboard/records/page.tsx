'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, FlaskConical, Brain, Activity, Pill, Loader2, ChevronDown, ChevronUp, Video, Link2 } from 'lucide-react';
import PatientNavbar from '@/components/patient/PatientNavbar';
import Footer from '@/components/patient/Footer';
import NeuralNetworkContainer from '@/components/ui/NeuralNetworkContainer';
import { useRouter, useSearchParams } from 'next/navigation';

interface Prediction { id: string; disease: string; confidence: number; symptoms: string[]; explanation: string; status: string; doctorName: string; createdAt: string; initiatedBy?: string; }
interface LabTest { id: string; testName: string; status: string; priority: string; diagnosisReason: string; labValues: { name: string; value: string; unit: string; referenceRange: string; status: string }[]; requestDate: string; doctorName: string | null; initiatedBy: string; price: number | null; }
interface Vital { id: string; date: string; heartRate: number; bloodPressure: { systolic: number; diastolic: number }; glucose: number; temperature: number; }
interface Prescription { id: string; medicines: { name: string; dosage: string; frequency: string }[]; notes: string; issuedDate: string; doctorName: string; }
interface Recording { id: string; title: string; recordingUrl: string; durationMins: number | null; notes: string; doctorName: string; appointmentDate: string; appointmentTime: string; appointmentType: string; createdAt: string; }

export default function PatientRecordsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab');
  const validTabs = ['predictions', 'labs', 'vitals', 'prescriptions', 'recordings'] as const;
  const [tab, setTab] = useState<typeof validTabs[number]>(
    validTabs.includes(initialTab as typeof validTabs[number])
      ? (initialTab as typeof validTabs[number])
      : 'predictions',
  );
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [vitals, setVitals] = useState<Vital[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      fetch('/api/patient/records').then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? `Records fetch failed (${r.status})`);
        return data;
      }),
      fetch('/api/patient/prescriptions').then(async r => {
        const data = await r.json();
        if (!r.ok) return { prescriptions: [] };
        return data;
      }),
      fetch('/api/patient/recordings').then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? `Recordings fetch failed (${r.status})`);
        return data;
      }),
    ]).then(([records, rxData, recs]) => {
      setPredictions(records.predictions ?? []);
      setLabTests(records.labTests ?? []);
      setVitals(records.vitals ?? []);
      const rxList = rxData.prescriptions?.length
        ? rxData.prescriptions
        : (records.prescriptions ?? []);
      setPrescriptions(rxList);
      setRecordings(recs.recordings ?? []);
    }).catch(err => {
      console.error('Failed to load health records:', err);
      setError(err.message ?? 'Failed to load health records. Please try again.');
    }).finally(() => setLoading(false));
  }, [retryCount]);

  const statusColor = (s: string) => {
    if (s === 'Completed' || s === 'Approved') return 'bg-green-100 text-green-700';
    if (s === 'Pending') return 'bg-yellow-100 text-yellow-700';
    if (s === 'In Progress') return 'bg-blue-100 text-blue-700';
    if (s === 'Modified') return 'bg-purple-100 text-purple-700';
    return 'bg-gray-100 text-gray-700';
  };

  const priorityColor = (p: string) => {
    if (p === 'Urgent') return 'bg-red-100 text-red-700';
    if (p === 'High') return 'bg-orange-100 text-orange-700';
    return 'bg-gray-100 text-gray-600';
  };

  const tabs = [
    { key: 'predictions' as const, label: 'AI Predictions', icon: Brain, count: predictions.length },
    { key: 'labs' as const, label: 'Lab Tests', icon: FlaskConical, count: labTests.length },
    { key: 'vitals' as const, label: 'Vitals', icon: Activity, count: vitals.length },
    { key: 'prescriptions' as const, label: 'Prescriptions', icon: Pill, count: prescriptions.length },
    { key: 'recordings' as const, label: 'Recordings', icon: Video, count: recordings.length },
  ];

  return (
    <NeuralNetworkContainer className="min-h-screen bg-gradient-to-br from-white via-blue-50/30 to-white">
      <PatientNavbar />

      <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <button
          type="button"
          onClick={() => router.push('/patient-dashboard')}
          className="mb-6 flex items-center space-x-2 px-4 py-2 bg-white hover:bg-gray-50 rounded-xl shadow-sm border border-gray-200 transition-all duration-300 group"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 group-hover:text-blue-600 transition-colors" />
          <span className="text-gray-700 font-medium group-hover:text-blue-600 transition-colors">Back to Dashboard</span>
        </button>

        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent mb-2">
          My Health Records
        </h1>
        <p className="text-gray-500 mb-8">Data shared by your doctor — predictions, tests, vitals and prescriptions.</p>

        {/* Tabs */}
        <div className="flex flex-wrap gap-3 mb-8">
          {tabs.map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all ${
                tab === t.key
                  ? 'bg-gradient-to-r from-blue-500 to-teal-500 text-white shadow-md'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
              <span className={`text-xs px-2 py-0.5 rounded-full ${tab === t.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
              <span className="text-3xl">⚠️</span>
            </div>
            <p className="text-lg font-semibold text-gray-800 mb-1">Could not load health records</p>
            <p className="text-sm text-gray-500 mb-6 max-w-sm">{error}</p>
            <button
              type="button"
              onClick={() => setRetryCount(c => c + 1)}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-teal-500 text-white rounded-xl font-semibold hover:shadow-md transition-all"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* AI Predictions */}
            {tab === 'predictions' && (
              predictions.length === 0 ? <EmptyState icon={Brain} label="No predictions yet" /> :
              predictions.map(p => (
                <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div
                    className="p-5 cursor-pointer flex items-start justify-between gap-4"
                    onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-lg font-bold text-gray-900">{p.disease}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(p.status)}`}>{p.status}</span>
                        {p.initiatedBy === 'patient' && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-teal-100 text-teal-700">Self-Check</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">By {p.doctorName} · {new Date(p.createdAt).toLocaleDateString()}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-2 max-w-[200px]">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${p.confidence}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-blue-600">{p.confidence}% confidence</span>
                      </div>
                    </div>
                    {expandedId === p.id ? <ChevronUp className="w-5 h-5 text-gray-400 shrink-0" /> : <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />}
                  </div>
                  {expandedId === p.id && (
                    <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-3">
                      {p.symptoms.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Symptoms</p>
                          <div className="flex flex-wrap gap-2">
                            {p.symptoms.map(s => <span key={s} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">{s}</span>)}
                          </div>
                        </div>
                      )}
                      {p.explanation && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Doctor&apos;s Note</p>
                          <p className="text-sm text-gray-700">{p.explanation}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}

            {/* Lab Tests */}
            {tab === 'labs' && (
              labTests.length === 0 ? <EmptyState icon={FlaskConical} label="No lab tests yet" /> :
              labTests.map(t => (
                <div key={t.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div
                    className="p-5 cursor-pointer flex items-start justify-between gap-4"
                    onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <span className="text-lg font-bold text-gray-900">{t.testName}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(t.status)}`}>{t.status}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColor(t.priority)}`}>{t.priority}</span>
                        {t.initiatedBy === 'patient' ? (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-teal-100 text-teal-700">Self-Booked</span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">Doctor-Ordered</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {t.initiatedBy === 'patient'
                          ? `Self-booked · ${t.requestDate}`
                          : `Ordered by Dr. ${t.doctorName ?? 'Your Doctor'} · ${t.requestDate}`
                        }
                      </p>
                      {t.initiatedBy === 'patient' && t.price != null && (
                        <p className="text-sm font-semibold text-teal-600 mt-1">₹{t.price.toLocaleString('en-IN')}</p>
                      )}
                      {t.diagnosisReason && t.diagnosisReason !== 'Patient self-booked' && (
                        <p className="text-sm text-gray-600 mt-1">{t.diagnosisReason}</p>
                      )}
                    </div>
                    {expandedId === t.id ? <ChevronUp className="w-5 h-5 text-gray-400 shrink-0" /> : <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />}
                  </div>
                  {expandedId === t.id && t.labValues.length > 0 && (
                    <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Lab Values</p>
                      <div className="space-y-2">
                        {t.labValues.map((v, i) => (
                          <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl text-sm">
                            <span className="font-medium text-gray-800">{v.name}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-gray-600">{v.value} {v.unit}</span>
                              <span className="text-xs text-gray-400">Ref: {v.referenceRange}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${v.status === 'Normal' ? 'bg-green-100 text-green-700' : v.status === 'Critical' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>{v.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {expandedId === t.id && t.labValues.length === 0 && (
                    <div className="px-5 pb-5 border-t border-gray-100 pt-4 text-center">
                      <p className="text-sm text-blue-600 font-medium">
                        {t.status === 'Completed' ? 'Results recorded — no detailed values available.' : 'Results will appear here once the test is completed.'}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}

            {/* Vitals */}
            {tab === 'vitals' && (
              vitals.length === 0 ? <EmptyState icon={Activity} label="No vitals recorded yet" /> :
              vitals.map(v => (
                <div key={v.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <p className="text-sm font-semibold text-gray-500 mb-4">{v.date}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {v.heartRate && <VitalCard label="Heart Rate" value={`${v.heartRate} bpm`} color="text-red-500" />}
                    {v.bloodPressure?.systolic && <VitalCard label="Blood Pressure" value={`${v.bloodPressure.systolic}/${v.bloodPressure.diastolic} mmHg`} color="text-blue-500" />}
                    {v.glucose && <VitalCard label="Glucose" value={`${v.glucose} mg/dL`} color="text-yellow-500" />}
                    {v.temperature && <VitalCard label="Temperature" value={`${v.temperature}°C`} color="text-green-500" />}
                  </div>
                </div>
              ))
            )}

            {/* Prescriptions */}
            {tab === 'prescriptions' && (
              prescriptions.length === 0 ? <EmptyState icon={Pill} label="No prescriptions yet" /> :
              prescriptions.map(p => (
                <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div
                    className="p-5 cursor-pointer flex items-start justify-between gap-4"
                    onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                  >
                    <div className="flex-1">
                      <p className="text-lg font-bold text-gray-900">{p.medicines.length} Medicine{p.medicines.length !== 1 ? 's' : ''} Prescribed</p>
                      <p className="text-sm text-gray-500">By {p.doctorName} · {p.issuedDate}</p>
                      <p className="text-sm text-gray-600 mt-1">{p.medicines.map(m => m.name).join(', ')}</p>
                    </div>
                    {expandedId === p.id ? <ChevronUp className="w-5 h-5 text-gray-400 shrink-0" /> : <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />}
                  </div>
                  {expandedId === p.id && (
                    <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-3">
                      <div className="space-y-2">
                        {p.medicines.map((m, i) => (
                          <div key={i} className="flex items-center justify-between p-3 bg-purple-50 rounded-xl text-sm">
                            <span className="font-semibold text-gray-800">{m.name}</span>
                            <div className="flex gap-3 text-gray-600">
                              {m.dosage && <span>{m.dosage}</span>}
                              {m.frequency && <span>{m.frequency}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                      {p.notes && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Doctor&apos;s Notes</p>
                          <p className="text-sm text-gray-700">{p.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}

            {/* Recordings */}
            {tab === 'recordings' && (
              recordings.length === 0 ? <EmptyState icon={Video} label="No recordings shared yet" /> :
              recordings.map(r => (
                <div key={r.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
                        <Video className="w-6 h-6 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">{r.title}</h3>
                        <p className="text-sm text-gray-500 mt-0.5">By {r.doctorName}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500 mt-1 flex-wrap">
                          {r.appointmentDate && <span>{r.appointmentDate} {r.appointmentTime}</span>}
                          {r.durationMins && <span>{r.durationMins} min</span>}
                          {r.appointmentType && <span className="text-gray-400">{r.appointmentType}</span>}
                        </div>
                        {r.notes && <p className="text-sm text-gray-500 mt-1 italic">{r.notes}</p>}
                      </div>
                    </div>
                    <a
                      href={r.recordingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all text-sm"
                    >
                      <Link2 className="w-4 h-4" />
                      Watch Recording
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <Footer />
    </NeuralNetworkContainer>
  );
}

function EmptyState({ icon: Icon, label }: { icon: React.ElementType<{ className?: string }>; label: string }) {
  return (
    <div className="text-center py-20 text-gray-400">
      <Icon className="w-12 h-12 mx-auto mb-3 opacity-20" />
      <p className="text-lg font-medium">{label}</p>
      <p className="text-sm mt-1">Your doctor will update this when available.</p>
    </div>
  );
}

function VitalCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4 text-center">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}
