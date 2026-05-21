'use client';

import { useState } from 'react';
import { Loader2, AlertCircle, CheckCircle2, X, Brain, Activity } from 'lucide-react';
import { SYMPTOMS, type Symptom } from '@/lib/symptomList';
import SymptomSelector from '@/components/ui/SymptomSelector';
import { ScrollLock } from '@/hooks/useScrollLock';

interface PredictionResult {
  prediction: string;
  confidence: number;
  method: string;
}

interface PredictionFormProps {
  onClose?: () => void;
}

const API_URL = '/api/predict';

export default function PredictionForm({ onClose }: PredictionFormProps) {
  const [selected, setSelected] = useState<Symptom[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const confidenceColor = (c: number) =>
    c >= 85 ? 'from-green-500 to-emerald-500' :
    c >= 65 ? 'from-yellow-500 to-orange-400' :
    'from-red-500 to-rose-500';

  const filtered = SYMPTOMS.filter(
    (s) =>
      !selected.find((sel) => sel.key === s.key)
  ).slice(0, 12);

  const add = (s: Symptom) => {
    setSelected((prev) => [...prev, s]);
  };

  const remove = (key: string) => setSelected((prev) => prev.filter((s) => s.key !== key));

  const handlePredict = async () => {
    if (selected.length === 0) {
      setError('Please select at least one symptom');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const symptoms: Record<string, number> = {};
      selected.forEach((s) => { symptoms[s.key] = 1; });

      const res = await fetch(`${API_URL}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symptoms }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? `API Error: ${res.status}`);
      }

      const data = await res.json();
      const predResult = {
        prediction: data.prediction,
        confidence: Math.round(data.confidence * 100),
        method: data.method ?? 'Deep Residual Neural Network',
      };
      setResult(predResult);

      // Save to DB so doctor can see it and patient has history
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
          const saveErr = await saveRes.json().catch(() => ({}));
          console.error('Failed to save prediction to health records:', saveErr);
          
          // Show user-friendly error message
          if (saveRes.status === 401) {
            setError('Prediction successful, but you need to be logged in to save it to your health records. Please sign in.');
          } else {
            setError(`Prediction successful, but failed to save to records: ${saveErr.error || 'Unknown error'}. You may need to sign in.`);
          }
        } else {
          console.log('✓ Prediction saved successfully to health records');
          // Clear any previous errors since save was successful
          setError(null);
        }
      } catch (saveError) {
        console.error('Error saving prediction to health records:', saveError);
        setError('Prediction successful, but could not save to health records. Please check your connection and try again.');
      }
    } catch (err) {
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        setError('Cannot connect to prediction API. Make sure the FastAPI server is running:\n  cd Human-Health_model && python -m uvicorn app:app --port 8000');
      } else {
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <ScrollLock />
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col">
        {/* Close */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 z-10 p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        )}

        {/* Header */}
        <div className="px-8 pt-8 pb-5 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-teal-50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">AI Disease Prediction</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {SYMPTOMS.length} symptoms · 631 diseases · 86.76% accuracy · F1 87.95%
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-8 space-y-6">
          {/* Symptom selector */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Select Symptoms
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
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 whitespace-pre-line">{error}</p>
            </div>
          )}

          {/* Predict button */}
          <button
            type="button"
            onClick={handlePredict}
            disabled={loading || selected.length === 0}
            className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-teal-500 text-white rounded-xl font-bold hover:shadow-xl hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
          >
            {loading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing {selected.length} symptoms...</>
            ) : (
              <><Brain className="w-5 h-5" /> Predict Disease</>
            )}
          </button>

          {/* Result */}
          {result && (
            <div className="space-y-3 p-5 bg-gradient-to-br from-blue-50 to-teal-50 rounded-2xl border-2 border-blue-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Prediction Result</span>
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>

              <div className="p-4 bg-white rounded-xl border border-blue-100">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Predicted Disease</p>
                <p className="text-2xl font-bold text-blue-600 capitalize">{result.prediction}</p>
              </div>

              <div className="p-4 bg-white rounded-xl border border-blue-100">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Confidence</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${confidenceColor(result.confidence)} rounded-full transition-all duration-1000`}
                      style={{ width: `${result.confidence}%` }}
                    />
                  </div>
                  <span className="text-lg font-bold text-gray-800 min-w-[44px]">{result.confidence}%</span>
                </div>
              </div>

              <p className="text-xs text-gray-400 px-1">Model: {result.method}</p>

              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-800 leading-relaxed">
                  AI prediction only — not a substitute for professional medical advice.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
