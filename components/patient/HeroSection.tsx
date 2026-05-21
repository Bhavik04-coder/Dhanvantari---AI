'use client';

import { useState, useEffect } from 'react';
import { ArrowRight, Stethoscope, Brain, Activity, X } from 'lucide-react';
import { PulsePattern } from '@/components/ui/BackgroundPatterns';
import { useRouter } from 'next/navigation';
import HeroScroll from './HeroScroll';
import PredictionForm from './PredictionForm';

interface PlatformStats {
  accuracy: string;
  predictions: string;
  support: string;
}

export default function HeroSection() {
  const router = useRouter();
  const [showPrediction, setShowPrediction] = useState(false);
  const [platformStats, setPlatformStats] = useState<PlatformStats>({
    accuracy: '86.76%',
    predictions: '50K+',
    support: '24/7',
  });

  useEffect(() => {
    fetch('/api/public/stats')
      .then(r => r.json())
      .then(d => {
        if (d.predictions !== undefined) {
          const count = d.predictions as number;
          const formatted = count >= 1000
            ? `${(count / 1000).toFixed(0)}K+`
            : `${count}+`;
          setPlatformStats(prev => ({ ...prev, predictions: formatted }));
        }
      })
      .catch(() => {});
  }, []);
  return (
    <section className="relative min-h-screen pt-16 bg-gradient-to-br from-blue-50 via-teal-50 to-blue-100 overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-300/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-teal-300/20 rounded-full blur-3xl"></div>
      </div>

      {/* Background Pattern */}
      <div className="absolute inset-0 text-blue-400">
        <PulsePattern />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8 animate-fade-in">
            <div className="inline-flex items-center space-x-2 px-4 py-2 bg-white rounded-full border border-blue-200 shadow-sm">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-sm font-medium text-gray-700">AI-Powered Healthcare Platform</span>
            </div>

            <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
              <span className="bg-gradient-to-r from-blue-600 via-teal-600 to-blue-700 bg-clip-text text-transparent">
                AI-Powered Medical Disease Prediction
              </span>
              <br />
              <span className="text-gray-800">and Smart Healthcare Assistant</span>
            </h1>

            <p className="text-lg text-gray-600 leading-relaxed max-w-xl">
              Leveraging artificial intelligence to provide early disease detection, personalized health insights, 
              and intelligent medical support for better healthcare outcomes.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => setShowPrediction(true)}
                className="group px-8 py-4 bg-gradient-to-r from-blue-500 to-teal-500 text-white rounded-xl font-semibold hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center justify-center space-x-2"
              >
                <span>Start Prediction</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button 
                onClick={() => router.push('/consult-doctor')}
                className="px-8 py-4 bg-white text-blue-600 rounded-xl font-semibold border-2 border-blue-200 hover:border-blue-400 hover:shadow-lg transition-all duration-300"
              >
                Consult Doctor
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 pt-8">
              <div className="text-center bg-white p-4 rounded-2xl hover:shadow-lg hover:scale-105 transition-all duration-300 border border-gray-200">
                <div className="text-3xl font-bold text-blue-600">{platformStats.accuracy}</div>
                <div className="text-sm text-gray-600">Accuracy</div>
              </div>
              <div className="text-center bg-white p-4 rounded-2xl hover:shadow-lg hover:scale-105 transition-all duration-300 border border-gray-200">
                <div className="text-3xl font-bold text-teal-600">{platformStats.predictions}</div>
                <div className="text-sm text-gray-600">Predictions</div>
              </div>
              <div className="text-center bg-white p-4 rounded-2xl hover:shadow-lg hover:scale-105 transition-all duration-300 border border-gray-200">
                <div className="text-3xl font-bold text-blue-600">{platformStats.support}</div>
                <div className="text-sm text-gray-600">Support</div>
              </div>
            </div>
          </div>

          {/* Right Content - Mouse-Controlled Animation */}
          <div className="relative">
            <div className="relative w-full h-[500px]">
              <HeroScroll />
            </div>
          </div>
        </div>
      </div>

      {/* Disease Prediction Modal */}
      {showPrediction && (
        <PredictionForm onClose={() => setShowPrediction(false)} />
      )}
    </section>
  );
}
