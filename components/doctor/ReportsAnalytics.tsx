'use client';

import { TrendingUp, Activity, PieChart as PieChartIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const diseaseData = [
  { disease: 'Diabetes', count: 245 },
  { disease: 'Hypertension', count: 198 },
  { disease: 'Heart Disease', count: 156 },
  { disease: 'Respiratory', count: 134 },
  { disease: 'Arthritis', count: 98 },
];

const weeklyData = [
  { day: 'Mon', count: 45 },
  { day: 'Tue', count: 52 },
  { day: 'Wed', count: 48 },
  { day: 'Thu', count: 61 },
  { day: 'Fri', count: 55 },
  { day: 'Sat', count: 38 },
  { day: 'Sun', count: 32 },
];

const COLORS = ['#3b82f6', '#a855f7', '#ef4444', '#22c55e', '#f97316'];

export default function ReportsAnalytics() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Reports & Analytics</h1>

      <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg p-8 mb-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">AI Prediction Accuracy</h2>
            <p className="text-blue-100">DiseaseResNet · 631 diseases · test set evaluation</p>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="bg-white/10 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold">87.66%</div>
                <div className="text-xs text-blue-200 mt-1">Precision</div>
              </div>
              <div className="bg-white/10 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold">89.22%</div>
                <div className="text-xs text-blue-200 mt-1">Recall</div>
              </div>
              <div className="bg-white/10 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold">87.95%</div>
                <div className="text-xs text-blue-200 mt-1">F1 Score</div>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-6xl font-bold mb-2">86.76%</div>
            <div className="flex items-center gap-2 justify-end">
              <TrendingUp className="w-5 h-5" />
              <span className="text-lg">Test Accuracy</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <PieChartIcon className="w-6 h-6 text-blue-500" />
            Disease Distribution
          </h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={diseaseData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="disease"
                  label={({ name, percent }) => percent !== undefined ? `${name} ${(percent * 100).toFixed(0)}%` : name}
                >
                  {diseaseData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Activity className="w-6 h-6 text-green-500" />
            Weekly Patient Count
          </h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <XAxis dataKey="day" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: '#f3f4f6' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="count" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
