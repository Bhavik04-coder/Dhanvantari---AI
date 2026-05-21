'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Plus, Trash2, FileDown, Pill, SendToBack, Search, ChevronDown } from 'lucide-react';
import Swal from 'sweetalert2';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useDoctorState, Patient } from './DoctorStateContext';

interface Medicine {
  id: number;
  name: string;
  dosage: string;
  duration: string;
}

function isConfirmed(status: string) {
  return String(status).toLowerCase() === 'confirmed';
}

export default function PrescriptionGenerator() {
  const { patients, appointments, refreshAll } = useDoctorState();
  const [fetchedPatients, setFetchedPatients] = useState<Patient[]>([]);

  // Always refresh patient list when opening prescriptions (fixes stale/empty lists)
  useEffect(() => {
    refreshAll();
    fetch('/api/doctor/patients')
      .then(r => r.ok ? r.json() : { patients: [] })
      .then(d => setFetchedPatients(d.patients ?? []))
      .catch(() => setFetchedPatients([]));
  }, [refreshAll]);

  const allPatients = useMemo(() => {
    const map = new Map<string, Patient>();
    [...patients, ...fetchedPatients].forEach(p => {
      const key = p.userId ?? p.name;
      if (!map.has(key)) map.set(key, p);
    });
    return Array.from(map.values());
  }, [patients, fetchedPatients]);

  // Patients from doctor_patients + confirmed appointments (same as lab orders)
  const selectablePatients = useMemo(() => {
    const byKey = new Map<string, Patient>();

    allPatients.forEach(p => {
      const key = p.userId ?? p.name;
      byKey.set(key, p);
    });

    appointments
      .filter(a => isConfirmed(a.status))
      .forEach(a => {
        const matched = allPatients.find(
          p =>
            (a.patientUserId && p.userId === a.patientUserId) ||
            (!a.patientUserId && p.name === a.patientName),
        );
        const key = a.patientUserId ?? a.patientName ?? a.id;
        if (byKey.has(key)) return;

        if (matched) {
          byKey.set(key, matched);
          return;
        }

        if (a.patientUserId) {
          byKey.set(key, {
            id: byKey.size + 1,
            userId: a.patientUserId,
            name: a.patientName,
            age: 0,
            avatar: (a.patientName ?? 'P').split(' ')[0] ?? 'P',
            gender: '',
            symptoms: '',
            disease: '',
            confidence: 0,
            risk: 'Low',
          });
        } else if (a.patientName) {
          // Show in list even before userId resolves (user can still see the name)
          byKey.set(key, {
            id: byKey.size + 1,
            name: a.patientName,
            age: 0,
            avatar: a.patientName.split(' ')[0] ?? 'P',
            gender: '',
            symptoms: '',
            disease: '',
            confidence: 0,
            risk: 'Low',
          });
        }
      });

    return Array.from(byKey.values());
  }, [allPatients, appointments]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [patientAge, setPatientAge] = useState('');
  const [prescriptionDate, setPrescriptionDate] = useState('');
  const [medicines, setMedicines] = useState<Medicine[]>([{ id: 1, name: '', dosage: '', duration: '' }]);
  const [advice, setAdvice] = useState('');
  const [forwardToPharmacy, setForwardToPharmacy] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredPatients = selectablePatients.filter(p =>
    p.name.toLowerCase().includes(patientSearch.toLowerCase())
  );

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setPatientSearch('');
    setPatientAge(patient.age ? String(patient.age) : '');
    setDropdownOpen(false);
  };

  const handleClearPatient = () => {
    setSelectedPatient(null);
    setPatientSearch('');
    setPatientAge('');
  };

  const handleGenerate = async () => {
    if (!selectedPatient) {
      Swal.fire({
        title: 'Select a Patient',
        text: 'Please select a patient before generating a prescription.',
        icon: 'warning',
        confirmButtonColor: '#2563eb',
      });
      return;
    }

    if (!selectedPatient.userId) {
      Swal.fire({
        title: 'Patient Not Linked',
        text: 'This patient has no linked account. Choose a patient from a confirmed appointment.',
        icon: 'warning',
        confirmButtonColor: '#2563eb',
      });
      return;
    }

    const validMeds = medicines.filter(m => m.name.trim() !== '');
    if (validMeds.length === 0) {
      Swal.fire({
        title: 'Add Medicines',
        text: 'Add at least one medicine before sending the prescription.',
        icon: 'warning',
        confirmButtonColor: '#2563eb',
      });
      return;
    }

    setIsGenerating(true);

    // Save to DB and notify patient dashboard
    const res = await fetch('/api/doctor/prescriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientName: selectedPatient.name,
        patientId: selectedPatient.userId,
        medicines: validMeds.map(m => ({ name: m.name, dosage: m.dosage, frequency: m.duration })),
        notes: advice,
        forwardedToPharmacy: forwardToPharmacy,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setIsGenerating(false);
      Swal.fire({
        title: 'Error',
        text: err.error ?? 'Failed to save prescription. Please try again.',
        icon: 'error',
        confirmButtonColor: '#2563eb',
      });
      return;
    }

    setTimeout(() => {
      const doc = new jsPDF();
      doc.setFontSize(22);
      doc.setTextColor(37, 99, 235);
      doc.text('Dhanvantari AI', 14, 22);
      doc.setFontSize(16);
      doc.setTextColor(31, 41, 55);
      doc.text('Medical Prescription', 14, 32);
      doc.setLineWidth(0.5);
      doc.line(14, 38, 196, 38);
      doc.setFontSize(12);
      doc.setTextColor(75, 85, 99);
      doc.text(`Patient Name: ${selectedPatient!.name}`, 14, 48);
      doc.text(`Age: ${patientAge || '____'}`, 140, 48);
      doc.text(`Date: ${prescriptionDate || new Date().toLocaleDateString()}`, 14, 56);
      doc.text('Rx - Prescribed Medicines:', 14, 70);
      const validMedicines = medicines.filter(m => m.name.trim() !== '');
      if (validMedicines.length > 0) {
        autoTable(doc, {
          head: [["Medicine Name", "Dosage", "Duration"]],
          body: validMedicines.map(m => [m.name, m.dosage, m.duration]),
          startY: 76,
          theme: 'grid',
          headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] },
        });
      }
      const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY : 76;
      if (advice) {
        doc.text('Medical Advice / Instructions:', 14, finalY + 15);
        doc.setFontSize(10);
        doc.text(doc.splitTextToSize(advice, 182), 14, finalY + 23);
      }
      doc.setFontSize(10);
      doc.setTextColor(156, 163, 175);
      doc.text('This is a digitally generated prescription.', 105, 280, { align: 'center' });
      doc.save(`${selectedPatient!.name.toLowerCase().replace(/\s+/g, '_')}_prescription.pdf`);
      setIsGenerating(false);
      Swal.fire({
        title: forwardToPharmacy ? 'Forwarded to Pharmacy!' : 'Prescription Sent!',
        text: forwardToPharmacy
          ? `Prescription PDF downloaded and forwarded to pharmacy. ${selectedPatient!.name} has been notified.`
          : `Prescription saved and sent to ${selectedPatient!.name}'s dashboard.`,
        icon: 'success',
        confirmButtonColor: '#2563eb',
        draggable: true,
      });
    }, 1500);
  };

  const addMedicine = () => {
    setMedicines([...medicines, { id: Date.now(), name: '', dosage: '', duration: '' }]);
  };

  const removeMedicine = (id: number) => {
    setMedicines(medicines.filter((med) => med.id !== id));
  };

  const updateMedicine = (id: number, field: keyof Medicine, value: string) => {
    setMedicines(medicines.map((med) => (med.id === id ? { ...med, [field]: value } : med)));
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Prescription Generator</h1>

      <div className="bg-white rounded-2xl shadow-lg p-6">
        {/* Patient selector + Age + Date */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Patient selector */}
          <div ref={dropdownRef} className="relative">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Patient <span className="text-red-500">*</span>
            </label>
            {selectedPatient ? (
              <div className="flex items-center gap-3 px-4 py-3 border-2 border-blue-500 rounded-xl bg-blue-50">
                <img
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedPatient.avatar || selectedPatient.name}`}
                  alt={selectedPatient.name}
                  className="w-8 h-8 rounded-full"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{selectedPatient.name}</p>
                  <p className="text-xs text-gray-500">{selectedPatient.age} yrs · {selectedPatient.gender || 'Patient'}</p>
                </div>
                <button
                  type="button"
                  onClick={handleClearPatient}
                  className="text-gray-400 hover:text-red-500 transition-colors text-lg leading-none"
                  aria-label="Clear patient selection"
                >
                  ×
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={patientSearch}
                    onChange={(e) => { setPatientSearch(e.target.value); setDropdownOpen(true); }}
                    onFocus={() => setDropdownOpen(true)}
                    placeholder="Search patient..."
                    aria-label="Search and select patient"
                    className="w-full pl-9 pr-10 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                {dropdownOpen && (
                  <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-56 overflow-y-auto">
                    {filteredPatients.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-400 text-center">
                        {selectablePatients.length === 0
                          ? 'No patients yet. Confirm an appointment first.'
                          : 'No patients match your search'}
                      </div>
                    ) : filteredPatients.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectPatient(p)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-colors text-left"
                      >
                        <img
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${p.avatar || p.name}`}
                          alt={p.name}
                          className="w-8 h-8 rounded-full shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">{p.name}</p>
                          <p className="text-xs text-gray-500">{p.age} yrs · {p.gender || 'Patient'}</p>
                        </div>
                        <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 ${
                          p.risk === 'High' ? 'bg-red-100 text-red-700' :
                          p.risk === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>{p.risk}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div>
            <label htmlFor="rx-patient-age" className="block text-sm font-semibold text-gray-700 mb-2">Age</label>
            <input
              id="rx-patient-age"
              type="number"
              value={patientAge}
              onChange={(e) => setPatientAge(e.target.value)}
              placeholder="Enter age"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="rx-date" className="block text-sm font-semibold text-gray-700 mb-2">Date</label>
            <input
              id="rx-date"
              type="date"
              value={prescriptionDate}
              onChange={(e) => setPrescriptionDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Prescription date"
              title="Select prescription date"
            />
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Medicines</h2>
            <button
              type="button"
              onClick={addMedicine}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Medicine
            </button>
          </div>

          <div className="space-y-4">
            {medicines.map((medicine, index) => (
              <div key={medicine.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-blue-50 rounded-xl">
                <input
                  type="text"
                  placeholder="Medicine name"
                  value={medicine.name}
                  onChange={(e) => updateMedicine(medicine.id, 'name', e.target.value)}
                  aria-label={`Medicine ${index + 1} name`}
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Dosage"
                  value={medicine.dosage}
                  onChange={(e) => updateMedicine(medicine.id, 'dosage', e.target.value)}
                  aria-label={`Medicine ${index + 1} dosage`}
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Duration"
                  value={medicine.duration}
                  onChange={(e) => updateMedicine(medicine.id, 'duration', e.target.value)}
                  aria-label={`Medicine ${index + 1} duration`}
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => removeMedicine(medicine.id)}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  aria-label={`Remove medicine ${index + 1}`}
                  title="Remove medicine"
                >
                  <Trash2 className="w-4 h-4 mx-auto" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <label htmlFor="rx-advice" className="block text-sm font-semibold text-gray-700 mb-2">Medical Advice</label>
          <textarea
            id="rx-advice"
            value={advice}
            onChange={(e) => setAdvice(e.target.value)}
            rows={6}
            placeholder="Enter medical advice and instructions..."
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div className="mb-8 flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-white rounded-xl border border-blue-100">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Pill className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Forward to Pharmacy</p>
              <p className="text-sm text-gray-500">Automatically send this prescription to the patient&apos;s selected pharmacy</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={forwardToPharmacy}
              onChange={(e) => setForwardToPharmacy(e.target.checked)}
              aria-label="Forward to pharmacy"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating || !selectedPatient}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : forwardToPharmacy ? (
            <SendToBack className="w-5 h-5" />
          ) : (
            <FileDown className="w-5 h-5" />
          )}
          {isGenerating
            ? 'Processing...'
            : !selectedPatient
              ? 'Select a patient to continue'
              : forwardToPharmacy
                ? 'Generate & Forward to Pharmacy'
                : 'Generate & Send to Patient'}
        </button>
      </div>
    </div>
  );
}
