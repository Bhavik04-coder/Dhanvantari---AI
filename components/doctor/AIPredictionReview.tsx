'use client';

import { useState } from 'react';
import {
  CheckCircle, XCircle, AlertCircle, Plus, Brain,
  Loader2, Activity, User, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useDoctorState } from './DoctorStateContext';
import { SYMPTOMS, type Symptom } from '@/lib/symptomList';
import SymptomSelector from '@/components/ui/SymptomSelector';

interface PredictionResult {
  prediction: string;
  confidence: number;
  method: string;
}

export default function AIPredictionReview() {
  const { predictions, setPredictions, addNotification, patients } = useDoctorState();

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [selectedSymptoms, setSelectedSymptoms] = useState<Symptom[]>([]);
  const [loading, setLoading] = useState(false);
  const [liveResult, setLiveResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Expanded card state
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handlePredict = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName || selectedSymptoms.length === 0) return;

    setLoading(true);
    setError(null);
    setLiveResult(null);

    try {
      const symDict: Record<string, number> = {};
      selectedSymptoms.forEach((s) => { symDict[s.key] = 1; });

      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symptoms: symDict }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.detail ?? `API Error ${res.status}`);

      const result: PredictionResult = {
        prediction: data.prediction,
        confidence: Math.round(data.confidence * 100),
        method: data.method ?? 'Deep Residual Neural Network',
      };

      setLiveResult(result);

      // Persist to DB
      const matchedPatient = patients.find(p =>
        p.name.toLowerCase() === patientName.toLowerCase()
      );

      const saveRes = await fetch('/api/doctor/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientName,
          patientId: matchedPatient?.userId ?? null,
          disease: result.prediction,
          confidence: result.confidence,
          symptoms: selectedSymptoms.map((s) => s.display),
          explanation: `${result.method} · ${selectedSymptoms.length} symptoms`,
        }),
      });

      const saved = saveRes.ok ? (await saveRes.json()).prediction : null;

      const newPrediction = saved ?? {
        id: `temp-${Date.now()}`,
        patient: patientName,
        disease: result.prediction,
        confidence: result.confidence,
        symptoms: selectedSymptoms.map((s) => s.display),
        explanation: `${result.method} · ${selectedSymptoms.length} symptoms`,
        status: 'Pending' as const,
      };

      setPredictions([newPrediction, ...predictions]);
      addNotification({
        title: 'New AI Prediction',
        message: `${result.prediction} predicted for ${patientName} (${result.confidence}% confidence)`,
        type: 'system',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Prediction failed. Is the ML server running?');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setPatientName('');
    setSelectedSymptoms([]);
    setLiveResult(null);
    setError(null);
    setShowForm(false);
  };

  const updateStatus = async (id: string, status: 'Approved' | 'Modified') => {
    // Optimistic update
    setPredictions(predictions.map((p) => (p.id === id ? { ...p, status } : p)));

    // Persist
    await fetch('/api/doctor/predictions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });

    const p = predictions.find((p) => p.id === id);
    if (status === 'Approved' && p) {
      addNotification({ title: 'Prediction Approved', message: `Approved prediction for ${p.patient}`, type: 'system' });
    }
    if (status === 'Modified' && p) {
      setPatientName(p.patient);
      setSelectedSymptoms(
        p.symptoms
          .map((display) => SYMPTOMS.find((s) => s.display === display))
          .filter(Boolean) as Symptom[]
      );
      setShowForm(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const confidenceColor = (c: number) =>
    c >= 85 ? 'from-green-500 to-emerald-500' :
    c >= 65 ? 'from-yellow-500 to-orange-400' :
    'from-red-500 to-rose-500';

  const riskBadge = (c: number) =>
    c >= 85 ? { label: 'High Confidence', cls: 'bg-green-100 text-green-700' } :
    c >= 65 ? { label: 'Moderate', cls: 'bg-yellow-100 text-yellow-700' } :
    { label: 'Low Confidence', cls: 'bg-red-100 text-red-700' };

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Prediction Review</h1>
          <p className="text-sm text-gray-500 mt-1">Apex Deep Residual Network · 631 diseases · 86.76% accuracy · 87.95% F1 · 87.66% precision · 89.22% recall</p>
        </div>
        <button
          type="button"
          onClick={() => { setShowForm(!showForm); if (showForm) resetForm(); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-teal-500 text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          {showForm ? 'Cancel' : 'New Prediction'}
        </button>
      </div>

      {/* ── Prediction Form ── */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-teal-50 flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-teal-500 rounded-xl flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-800">Run AI Health Analysis</h2>
              <p className="text-xs text-gray-500">Select patient symptoms to generate a prediction</p>
            </div>
          </div>

          <form onSubmit={handlePredict} className="p-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Left: inputs */}
              <div className="space-y-5">
                {/* Patient name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Patient Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      required
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      placeholder="Enter patient name"
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors"
                    />
                  </div>
                </div>

                {/* Symptom selector */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Symptoms
                    <span className="ml-2 text-xs font-normal text-gray-400">
                      ({SYMPTOMS.length} available)
                    </span>
                  </label>
                  <div className="relative">
                    <SymptomSelector
                      selected={selectedSymptoms}
                      onChange={setSelectedSymptoms}
                      placeholder="Search and add symptoms..."
                    />
                  </div>
                  {selectedSymptoms.length > 0 && (
                    <p className="text-xs text-gray-400 mt-1.5">
                      {selectedSymptoms.length} symptom{selectedSymptoms.length > 1 ? 's' : ''} selected
                    </p>
                  )}
                </div>

                {/* Error */}
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700">{error}</p>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading || selectedSymptoms.length === 0 || !patientName}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-500 to-teal-500 text-white font-semibold rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</>
                  ) : (
                    <><Brain className="w-4 h-4" /> Generate Prediction</>
                  )}
                </button>
              </div>

              {/* Right: live result */}
              <div className="flex flex-col justify-center">
                {!liveResult && !loading && (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <Activity className="w-10 h-10 text-gray-300 mb-3" />
                    <p className="text-sm font-medium text-gray-500">Result will appear here</p>
                    <p className="text-xs text-gray-400 mt-1">Add symptoms and click Generate</p>
                  </div>
                )}

                {loading && (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-blue-50 rounded-xl border-2 border-blue-100">
                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-3" />
                    <p className="text-sm font-medium text-blue-700">Analyzing {selectedSymptoms.length} symptoms...</p>
                    <p className="text-xs text-blue-400 mt-1">Running through 631 disease classes</p>
                  </div>
                )}

                {liveResult && (
                  <div className="space-y-3 p-5 bg-gradient-to-br from-blue-50 to-teal-50 rounded-xl border-2 border-blue-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Prediction Result</span>
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    </div>

                    <div className="p-4 bg-white rounded-xl border border-blue-100">
                      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Predicted Disease</p>
                      <p className="text-xl font-bold text-blue-600 capitalize">{liveResult.prediction}</p>
                    </div>

                    <div className="p-4 bg-white rounded-xl border border-blue-100">
                      <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Confidence</p>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full bg-gradient-to-r ${confidenceColor(liveResult.confidence)} rounded-full transition-all duration-1000`}
                            style={{ width: `${liveResult.confidence}%` }}
                          />
                        </div>
                        <span className="text-lg font-bold text-gray-800 min-w-[44px]">{liveResult.confidence}%</span>
                      </div>
                    </div>

                    <p className="text-xs text-gray-400 px-1">Model: {liveResult.method}</p>
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ── Prediction Cards ── */}
      <div className="space-y-4">
        {predictions.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Brain className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No predictions yet</p>
            <p className="text-sm mt-1">Click "New Prediction" to run an AI analysis</p>
          </div>
        )}

        {predictions.map((pred) => {
          const badge = riskBadge(pred.confidence);
          const isExpanded = expandedId === pred.id;

          return (
            <div key={pred.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
              {/* Card header — always visible */}
              <div
                className="flex items-center justify-between p-5 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : pred.id)}
              >
                <div className="flex items-center gap-4">
                  {/* Confidence ring */}
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${confidenceColor(pred.confidence)} flex flex-col items-center justify-center text-white flex-shrink-0`}>
                    <span className="text-lg font-bold leading-none">{pred.confidence}</span>
                    <span className="text-[10px] opacity-80">%</span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-gray-900 capitalize">{pred.disease}</h3>
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${badge.cls}`}>
                        {badge.label}
                      </span>
                      {pred.status !== 'Pending' && (
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${pred.status === 'Approved' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                          {pred.status}
                        </span>
                      )}
                      {pred.initiatedBy === 'patient' && (
                        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
                          Patient Self-Test
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Patient: <span className="font-medium text-gray-700">{pred.patient}</span>
                      <span className="mx-2 text-gray-300">·</span>
                      {pred.symptoms.length} symptoms
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {pred.status === 'Pending' && (
                    <div className="hidden sm:flex gap-2">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); updateStatus(pred.id, 'Approved'); }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-green-500 text-white text-xs font-semibold rounded-lg hover:bg-green-600 transition-colors"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); updateStatus(pred.id, 'Modified'); }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-white text-xs font-semibold rounded-lg hover:bg-orange-600 transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Modify
                      </button>
                    </div>
                  )}
                  {isExpanded
                    ? <ChevronUp className="w-5 h-5 text-gray-400" />
                    : <ChevronDown className="w-5 h-5 text-gray-400" />
                  }
                </div>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4">
                  {/* Confidence bar */}
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                      <span>Confidence Level</span>
                      <span className="font-semibold">{pred.confidence}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${confidenceColor(pred.confidence)} rounded-full`}
                        style={{ width: `${pred.confidence}%` }}
                      />
                    </div>
                  </div>

                  {/* Symptoms */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Symptoms Reported</p>
                    <div className="flex flex-wrap gap-1.5">
                      {pred.symptoms.map((s, i) => (
                        <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Model info */}
                  <p className="text-xs text-gray-400">{pred.explanation}</p>

                  {/* Mobile action buttons */}
                  {pred.status === 'Pending' && (
                    <div className="flex gap-3 sm:hidden pt-1">
                      <button
                        type="button"
                        onClick={() => updateStatus(pred.id, 'Approved')}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-500 text-white text-sm font-semibold rounded-xl hover:bg-green-600 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" /> Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => updateStatus(pred.id, 'Modified')}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-orange-500 text-white text-sm font-semibold rounded-xl hover:bg-orange-600 transition-colors"
                      >
                        <XCircle className="w-4 h-4" /> Modify
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
