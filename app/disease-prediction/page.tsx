'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, Loader2, AlertCircle, CheckCircle2,
  Stethoscope, ArrowRight, ArrowLeft, Activity, Brain, MessageSquare, X,
} from 'lucide-react';
import PatientNavbar from '@/components/patient/PatientNavbar';
import { SYMPTOMS, type Symptom } from '@/lib/symptomList';
import SymptomSelector from '@/components/ui/SymptomSelector';
import ChatAssistant, { type ChatContext } from '@/components/patient/ChatAssistant';

interface PredictionResult {
  prediction: string;
  confidence: number;
  method: string;
}

const API_URL = '/api/predict';

export default function DiseasePredictionPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<Symptom[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chatContext, setChatContext] = useState<ChatContext | null>(null);

  const confidenceColor = (c: number) =>
    c >= 85 ? 'from-green-500 to-emerald-500' :
    c >= 65 ? 'from-yellow-500 to-orange-400' :
    'from-red-500 to-rose-500';

  const filtered = SYMPTOMS.filter(
    (s) => !selected.find((sel) => sel.key === s.key)
  ).slice(0, 12);

  const add = (s: Symptom) => { setSelected((p) => [...p, s]); };
  const remove = (key: string) => setSelected((p) => p.filter((s) => s.key !== key));

  const handlePredict = async () => {
    if (selected.length === 0) { setError('Please select at least one symptom'); return; }
    setLoading(true); setError(null); setResult(null);

    try {
      const symptoms: Record<string, number> = {};
      selected.forEach((s) => { symptoms[s.key] = 1; });

      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symptoms }),
      });

      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.detail ?? `API Error: ${res.status}`);
      }

      const data = await res.json();
      const predResult: PredictionResult = {
        prediction: data.prediction,
        confidence: Math.round(data.confidence * 100),
        method: data.method ?? 'Deep Residual Neural Network',
      };
      setResult(predResult);

      // Save prediction to DB so doctor can see it and patient has history
      try {
        const saveRes = await fetch('/api/patient/predictions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            disease: predResult.prediction,
            confidence: predResult.confidence,
            symptoms: selected.map(s => s.display),
            explanation: `${predResult.method} · ${selected.length} symptoms`,
          }),
        });
        
        if (!saveRes.ok) {
          const rawText = await saveRes.text().catch(() => '');
          let saveErr: Record<string, unknown> = {};
          try { saveErr = rawText ? JSON.parse(rawText) : {}; } catch { /* non-JSON body */ }
          console.error(`Failed to save prediction to health records [HTTP ${saveRes.status}]:`, saveErr.error || rawText || '(empty body)');
          // Show a warning but don't block the result display
          if (saveRes.status === 401) {
            console.warn('Not authenticated - prediction not saved to health records');
          } else {
            console.warn(`Failed to save prediction: ${saveErr.error || rawText || 'Unknown error'}`);
          }
        } else {
          console.log('✓ Prediction saved successfully to health records');
        }
      } catch (saveError) {
        console.error('Error saving prediction to health records:', saveError);
        // Non-critical - show result anyway
      }
    } catch (err) {
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        setError(`Cannot connect to prediction API.\nMake sure the FastAPI server is running:\n  cd Human-Health_model && python -m uvicorn app:app --port 8000`);
      } else {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setSelected([]); setResult(null); setError(null); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50">
      <PatientNavbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        {/* Back + Header */}
        <div className="mb-8">
          <button
            type="button"
            onClick={() => router.push('/patient-dashboard')}
            className="mb-4 flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 rounded-xl shadow-sm border border-gray-200 transition-all group"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 group-hover:text-blue-600 transition-colors" />
            <span className="text-gray-700 font-medium group-hover:text-blue-600 transition-colors">Back to Dashboard</span>
          </button>

          <div className="bg-white rounded-3xl shadow-lg border border-gray-200 p-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-800">AI Disease Prediction</h1>
                <p className="text-gray-500 mt-1">
                  Apex Deep Residual Network · 631 diseases · 86.76% accuracy · F1 87.95% · {SYMPTOMS.length} symptoms
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* ── Left: Symptom Selector ── */}
          <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-teal-500 rounded-xl flex items-center justify-center shadow-md">
                  <Search className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">Select Symptoms</h2>
              </div>
              {selected.length > 0 && (
                <button type="button" onClick={reset} className="text-sm text-gray-500 hover:text-red-600 font-medium transition-colors">
                  Clear All
                </button>
              )}
            </div>

            <div className="space-y-5">
              {/* Symptom selector */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Symptoms
                  <span className="ml-2 text-xs font-normal text-gray-400">({SYMPTOMS.length} available)</span>
                </label>
                <div className="relative">
                  <SymptomSelector
                    selected={selected}
                    onChange={setSelected}
                    placeholder={`Search ${SYMPTOMS.length} symptoms...`}
                  />
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 whitespace-pre-line">{error}</p>
                </div>
              )}

              {/* Predict button */}
              <button
                type="button"
                onClick={handlePredict}
                disabled={loading || selected.length === 0}
                className="w-full py-4 bg-gradient-to-r from-blue-500 to-teal-500 text-white rounded-xl font-bold text-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-3"
              >
                {loading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /><span>Analyzing...</span></>
                ) : (
                  <><Brain className="w-5 h-5" /><span>Predict Disease</span></>
                )}
              </button>
            </div>
          </div>

          {/* ── Right: Results ── */}
          <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-md">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Prediction Results</h2>
            </div>

            {!result && !loading && (
              <div className="flex flex-col items-center justify-center h-[500px] text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mb-4">
                  <Activity className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No Prediction Yet</h3>
                <p className="text-gray-500 text-sm max-w-xs">
                  Select your symptoms and click "Predict Disease" to get AI-powered analysis
                </p>
              </div>
            )}

            {loading && (
              <div className="flex flex-col items-center justify-center h-[500px]">
                <Loader2 className="w-16 h-16 text-blue-500 animate-spin mb-4" />
                <p className="text-gray-600 font-medium">Analyzing your symptoms...</p>
                <p className="text-gray-400 text-sm mt-1">Running through 631 disease classes</p>
              </div>
            )}

            {result && (
              <div className="space-y-5">
                <div className="p-6 bg-gradient-to-br from-blue-50 via-white to-teal-50 rounded-2xl border-2 border-blue-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-800">Analysis Complete</h3>
                    <CheckCircle2 className="w-7 h-7 text-green-500" />
                  </div>

                  <div className="p-5 bg-white rounded-xl border border-blue-100">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Predicted Disease</span>
                    <p className="text-2xl font-bold text-blue-600 mt-2 capitalize">{result.prediction}</p>
                  </div>

                  <div className="p-5 bg-white rounded-xl border border-blue-100">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Confidence Level</span>
                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${confidenceColor(result.confidence)} transition-all duration-1000 rounded-full`}
                          style={{ width: `${result.confidence}%` }}
                        />
                      </div>
                      <span className="text-xl font-bold text-gray-800 min-w-[56px]">{result.confidence}%</span>
                    </div>
                  </div>

                  <div className="px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-500">Model: <span className="font-medium text-gray-700">{result.method}</span></p>
                  </div>
                </div>

                <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-800 leading-relaxed">
                    <span className="font-bold">Medical Disclaimer: </span>
                    This is an AI prediction and should not replace professional medical advice. Consult a qualified healthcare provider for proper diagnosis and treatment.
                  </p>
                </div>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setChatContext({
                      symptoms: selected.map(s => s.display),
                      disease: result.prediction,
                      confidence: result.confidence,
                    })}
                    className="w-full py-4 bg-gradient-to-r from-teal-500 to-blue-500 text-white rounded-xl font-bold hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center justify-center gap-3 group"
                  >
                    <MessageSquare className="w-5 h-5" />
                    <span>Ask AI about {result.prediction}</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push('/consult-doctor')}
                    className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center justify-center gap-3 group"
                  >
                    <Stethoscope className="w-5 h-5" />
                    <span>Consult a Doctor</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>

                  <button
                    type="button"
                    onClick={reset}
                    className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all border-2 border-gray-200"
                  >
                    New Prediction
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Chat Modal */}
      {chatContext && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setChatContext(null)}
        >
          <div
            className="relative w-full sm:max-w-2xl h-[85dvh] sm:h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <ChatAssistant initialContext={chatContext} onClose={() => setChatContext(null)} />
          </div>
        </div>
      )}
    </div>
  );
}
