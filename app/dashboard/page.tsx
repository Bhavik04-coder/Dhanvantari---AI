'use client';

import { useState, useEffect, Suspense, lazy } from 'react';
import dynamic from 'next/dynamic';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Skeleton } from 'boneyard-js/react';
import DoctorNavbar from '@/components/doctor/DoctorNavbar';
import DoctorHero from '@/components/doctor/DoctorHero';
import DoctorFeatureCards from '@/components/doctor/DoctorFeatureCards';
import NeuralNetworkContainer from '@/components/ui/NeuralNetworkContainer';
import Footer from '@/components/patient/Footer';

// Lazy-load heavy tab components — only fetched when the tab is first opened
const DashboardOverview = dynamic(() => import('@/components/doctor/DashboardOverview'), { loading: () => <TabFallback /> });
const PatientManagement = dynamic(() => import('@/components/doctor/PatientManagement'), { loading: () => <TabFallback /> });
const AIPredictionReview = dynamic(() => import('@/components/doctor/AIPredictionReview'), { loading: () => <TabFallback /> });
const MedicineReview = dynamic(() => import('@/components/doctor/MedicineReview'), { loading: () => <TabFallback /> });
const ConsultDoctor = dynamic(() => import('@/components/doctor/ConsultDoctor'), { loading: () => <TabFallback /> });
const ProgressTracker = dynamic(() => import('@/components/doctor/ProgressTracker'), { loading: () => <TabFallback /> });
const PrescriptionGenerator = dynamic(() => import('@/components/doctor/PrescriptionGenerator'), { loading: () => <TabFallback /> });
const ReportsAnalytics = dynamic(() => import('@/components/doctor/ReportsAnalytics'), { loading: () => <TabFallback /> });
const AppointmentsPage = dynamic(() => import('@/components/doctor/AppointmentsPage'), { loading: () => <TabFallback /> });
const ProfilePage = dynamic(() => import('@/components/doctor/ProfilePage'), { loading: () => <TabFallback /> });
const SettingsPage = dynamic(() => import('@/components/doctor/SettingsPage'), { loading: () => <TabFallback /> });
const LabPathology = dynamic(() => import('@/components/doctor/LabPathology'), { loading: () => <TabFallback /> });
const NotificationsPage = dynamic(() => import('@/components/doctor/NotificationsPage'), { loading: () => <TabFallback /> });
const RecordingsManager = dynamic(() => import('@/components/doctor/RecordingsManager'), { loading: () => <TabFallback /> });
const DoctorChatAssistant = dynamic(() => import('@/components/doctor/DoctorChatAssistant'), { loading: () => <TabFallback /> });
const DiaryPage = dynamic(
  () => import('@/components/DiaryPage').then(m => ({ default: () => <m.default role="doctor" /> })),
  { loading: () => <TabFallback /> }
);

function TabFallback() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
    </div>
  );
}

const TAB_COMPONENTS: Record<string, React.ComponentType<any>> = {
  dashboard: DashboardOverview,
  patients: PatientManagement,
  'ai-predictions': AIPredictionReview,
  'medicine-reviews': MedicineReview,
  'consult-doctors': ConsultDoctor,
  'progress-tracker': ProgressTracker,
  prescriptions: PrescriptionGenerator,
  reports: ReportsAnalytics,
  'lab-pathology': LabPathology,
  appointments: AppointmentsPage,
  profile: ProfilePage,
  settings: SettingsPage,
  notifications: NotificationsPage,
  recordings: RecordingsManager,
  diary: DiaryPage,
  'ai-chat': DoctorChatAssistant,
};

export default function DoctorDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  if (!isMounted) return null;

  const TabContent = TAB_COMPONENTS[activeTab] ?? DashboardOverview;

  return (
    <NeuralNetworkContainer className="min-h-screen bg-gradient-to-br from-white via-blue-50/30 to-white">
      <DoctorNavbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="pt-16 relative w-full h-full min-h-screen">
        {activeTab === 'dashboard' && (
          <>
            <DoctorHero setActiveTab={setActiveTab} />
            <div className="relative mx-4 md:mx-auto">
              <DoctorFeatureCards setActiveTab={setActiveTab} />
            </div>
            <Footer />
          </>
        )}

        {activeTab !== 'dashboard' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className="mb-6 flex items-center space-x-2 text-gray-500 hover:text-blue-600 transition-colors bg-white/50 backdrop-blur-sm px-4 py-2 rounded-lg border border-gray-200/50 shadow-sm w-fit"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="font-semibold text-sm">Back to Dashboard Home</span>
            </button>
            <div className={`bg-white/80 backdrop-blur-md rounded-3xl shadow-xl border border-white/60 overflow-hidden min-h-[70vh] ${activeTab === 'ai-chat' ? 'flex flex-col' : ''}`}>
              <Skeleton
                name={`doctor-tab-${activeTab}`}
                loading={false}
                animate="shimmer"
                fallback={<TabFallback />}
              >
                <Suspense fallback={<TabFallback />}>
                  {activeTab === 'ai-chat'
                    ? <div className="flex-1 p-6 h-[80vh]"><TabContent /></div>
                    : <TabContent />
                  }
                </Suspense>
              </Skeleton>
            </div>
          </div>
        )}
      </main>
    </NeuralNetworkContainer>
  );
}
