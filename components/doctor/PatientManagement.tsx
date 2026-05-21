'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Eye, Download, X } from 'lucide-react';
import PatientActivityFeed from './PatientActivityFeed';
import Swal from 'sweetalert2';
import ProgressBar from './ProgressBar';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useDoctorState, Patient } from './DoctorStateContext';

export default function PatientManagement() {
  const { patients } = useDoctorState();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRisk, setFilterRisk] = useState('All');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  // Close modal on Escape key
  useEffect(() => {
    if (!selectedPatient) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectedPatient(null); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [selectedPatient]);

  const fetchPatientActivity = async (userId: string) => {
    setLoadingActivity(true);
    try {
      const res = await fetch(`/api/doctor/patients/${userId}/activity`);
      if (res.ok) {
        const data = await res.json();
        setActivities(data.activities || []);
      }
    } catch (err) {
      console.error("Failed to fetch activity:", err);
    } finally {
      setLoadingActivity(false);
    }
  };

  useEffect(() => {
    if (selectedPatient?.userId) {
      fetchPatientActivity(selectedPatient.userId);
    } else {
      setActivities([]);
    }
  }, [selectedPatient]);

  const filteredPatients = patients.filter((patient) => {
    const matchesSearch = patient.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterRisk === 'All' || patient.risk === filterRisk;
    return matchesSearch && matchesFilter;
  });

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'High': return 'bg-red-100 text-red-700';
      case 'Medium': return 'bg-yellow-100 text-yellow-700';
      case 'Low': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(20);
      doc.setTextColor(37, 99, 235);
      doc.text('Dhanvantari AI', 14, 22);
      doc.setFontSize(14);
      doc.setTextColor(55, 65, 81);
      doc.text('Patient Risk & Prediction Report', 14, 32);

      autoTable(doc, {
        head: [["Patient Name", "Age", "Symptoms", "AI Predicted Disease", "Confidence", "Risk Level"]],
        body: filteredPatients.map(p => [p.name, p.age.toString(), p.symptoms, p.disease, `${p.confidence}%`, p.risk]),
        startY: 40,
        theme: 'grid',
        styles: { fontSize: 10, cellPadding: 4 },
        headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [243, 244, 246] },
      });

      const finalY = (doc as any).lastAutoTable?.finalY || 100;
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, finalY + 10);
      doc.save('patient_reports.pdf');
    } catch (err) {
      console.error("PDF Export failed:", err);
      Swal.fire({
        icon: 'error',
        title: 'Export Failed',
        text: 'Failed to export PDF. Please ensure your browser allows downloads.',
        confirmButtonColor: '#2563eb',
      });
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Patient Management</h1>
        <button
          type="button"
          onClick={handleDownloadPDF}
          className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
        >
          <Download className="w-5 h-5" />
          Export Reports (PDF)
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl shadow border-l-4 border-blue-500">
          <p className="text-sm text-gray-500 font-medium">Total Patients</p>
          <p className="text-2xl font-bold text-gray-900">{patients.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow border-l-4 border-red-500">
          <p className="text-sm text-gray-500 font-medium">High Risk</p>
          <p className="text-2xl font-bold text-red-600">{patients.filter(p => p.risk === 'High').length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow border-l-4 border-yellow-500">
          <p className="text-sm text-gray-500 font-medium">Medium Risk</p>
          <p className="text-2xl font-bold text-yellow-600">{patients.filter(p => p.risk === 'Medium').length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow border-l-4 border-green-500">
          <p className="text-sm text-gray-500 font-medium">Low Risk</p>
          <p className="text-2xl font-bold text-green-600">{patients.filter(p => p.risk === 'Low').length}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search patients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search patients"
              className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="relative border border-gray-200 rounded-xl bg-white overflow-hidden w-full md:w-64">
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <Filter className="text-gray-400 w-5 h-5" />
            </div>
            <select
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value)}
              className="w-full pl-12 pr-8 py-3 bg-transparent focus:outline-none appearance-none cursor-pointer"
              aria-label="Filter by risk level"
            >
              <option value="All">All Risk Levels</option>
              <option value="High">High Risk</option>
              <option value="Medium">Medium Risk</option>
              <option value="Low">Low Risk</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold">Patient Name</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Age</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Symptoms</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">AI Predicted Disease</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Confidence</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Risk Level</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">No patients found matching your search.</td>
                </tr>
              ) : filteredPatients.map((patient) => (
                <tr key={patient.id} className="hover:bg-blue-50 transition-colors duration-150">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${patient.avatar || patient.name}`}
                        alt={patient.name}
                        className="w-10 h-10 rounded-full"
                      />
                      <span className="font-medium text-gray-900">{patient.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-700">{patient.age}</td>
                  <td className="px-6 py-4 text-gray-700 max-w-xs truncate" title={patient.symptoms}>{patient.symptoms}</td>
                  <td className="px-6 py-4 font-medium text-gray-900">{patient.disease}</td>
                  <td className="px-6 py-4 w-48"><ProgressBar value={patient.confidence} /></td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRiskColor(patient.risk)}`}>{patient.risk}</span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      type="button"
                      onClick={() => setSelectedPatient(patient)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 font-semibold rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedPatient && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setSelectedPatient(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-4">
                <img
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedPatient.avatar || selectedPatient.name}`}
                  alt={selectedPatient.name}
                  className="w-16 h-16 rounded-full shadow-sm"
                />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedPatient.name}</h2>
                  <p className="text-gray-500">{selectedPatient.age} years old • Patient ID: #{selectedPatient.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPatient(null)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                aria-label="Close patient details"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-8">
              <div>
                <h3 className="text-sm font-bold tracking-wider text-gray-400 uppercase mb-4">Diagnostic Summary</h3>
                <div className="bg-gradient-to-r from-blue-50 to-teal-50 rounded-2xl p-6 border border-blue-100">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Primary Prediction</p>
                      <p className="font-bold text-gray-900 text-lg">{selectedPatient.disease}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Risk Stratification</p>
                      <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getRiskColor(selectedPatient.risk)}`}>
                        {selectedPatient.risk} Risk
                      </span>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-gray-500 mb-2">Algorithm Confidence</p>
                      <ProgressBar value={selectedPatient.confidence} />
                      <p className="text-right text-sm font-bold text-blue-600 mt-1">{selectedPatient.confidence}% match</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold tracking-wider text-gray-400 uppercase mb-4">Reported Symptoms</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedPatient.symptoms.split(',').map((symptom, idx) => (
                    <span key={idx} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium border border-gray-200">
                      {symptom.trim()}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold tracking-wider text-gray-400 uppercase mb-4">Activity History</h3>
                <PatientActivityFeed
                  activities={activities}
                  loading={loadingActivity}
                  emptyLabel="No recent activity found for this patient."
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-3xl">
              <button
                type="button"
                onClick={() => setSelectedPatient(null)}
                className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl transition-colors"
              >
                Close Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
