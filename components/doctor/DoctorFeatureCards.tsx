'use client';

import {
    Users,
    Brain,
    Calendar,
    Video,
    ActivitySquare,
    FlaskConical,
    FileText,
    MessageSquare,
} from 'lucide-react';

const heroFeatures = [
    {
        id: 'patients',
        title: 'Patient Management',
        description: 'Access complete clinical records, export PDF reports, and view full historical insights for every patient.',
        icon: Users,
        gradient: 'from-blue-500 to-blue-600',
        bgGradient: 'from-blue-50 to-blue-100/60',
        iconBg: 'bg-blue-500',
        hoverBorder: 'hover:border-blue-300',
        btnGradient: 'from-blue-500 to-blue-600',
        textHover: 'group-hover:text-blue-600',
    },
    {
        id: 'ai-predictions',
        title: 'AI Predictions',
        description: 'Run real-time ML diagnostic models and validate algorithmic health assessments with confidence scores.',
        icon: Brain,
        gradient: 'from-fuchsia-500 to-purple-600',
        bgGradient: 'from-fuchsia-50 to-purple-100/60',
        iconBg: 'bg-gradient-to-br from-fuchsia-500 to-purple-600',
        hoverBorder: 'hover:border-fuchsia-300',
        btnGradient: 'from-fuchsia-500 to-purple-600',
        textHover: 'group-hover:text-fuchsia-600',
    },
];

const smallFeatures = [
    {
        id: 'appointments',
        title: 'Appointments',
        description: 'Schedule follow-ups and manage your daily clinic flow.',
        icon: Calendar,
        bgColor: 'bg-emerald-50',
        iconColor: 'text-emerald-600',
        color: 'from-emerald-500 to-teal-600',
    },
    {
        id: 'consult-doctors',
        title: 'Telemedicine Hub',
        description: 'Initiate secure HD video consultations with remote patients.',
        icon: Video,
        bgColor: 'bg-orange-50',
        iconColor: 'text-orange-600',
        color: 'from-orange-500 to-red-500',
    },
    {
        id: 'progress-tracker',
        title: 'Progress Tracker',
        description: 'Monitor long-term vital trends for chronic care patients.',
        icon: ActivitySquare,
        bgColor: 'bg-cyan-50',
        iconColor: 'text-cyan-600',
        color: 'from-cyan-500 to-blue-500',
    },
    {
        id: 'lab-pathology',
        title: 'Lab & Pathology',
        description: 'Order lab tests and instantly review pathology results.',
        icon: FlaskConical,
        bgColor: 'bg-rose-50',
        iconColor: 'text-rose-600',
        color: 'from-rose-500 to-pink-600',
    },
    {
        id: 'prescriptions',
        title: 'Digital Prescriptions',
        description: 'Generate PDF scripts and route them to the active pharmacy.',
        icon: FileText,
        bgColor: 'bg-indigo-50',
        iconColor: 'text-indigo-600',
        color: 'from-indigo-500 to-blue-600',
    },
    {
        id: 'ai-chat',
        title: 'AI Clinical Chat',
        description: 'Ask clinical questions, get drug references, and discuss patient cases with AI.',
        icon: MessageSquare,
        bgColor: 'bg-teal-50',
        iconColor: 'text-teal-600',
        color: 'from-teal-500 to-cyan-600',
    },
];

export default function DoctorFeatureCards({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
    return (
        <section className="relative pt-8 pb-12 z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-8 text-center md:text-left">
                    <h2 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">Clinical Toolset</h2>
                    <p className="text-gray-500 max-w-2xl mx-auto md:mx-0">
                        Access your core medical modules to provide exceptional, AI-augmented care.
                    </p>
                </div>

                {/* Two big hero cards */}
                <div className="grid md:grid-cols-2 gap-8 mb-8">
                    {heroFeatures.map((feature) => {
                        const Icon = feature.icon;
                        return (
                            <div
                                key={feature.id}
                                onClick={() => setActiveTab(feature.id)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => e.key === 'Enter' && setActiveTab(feature.id)}
                                aria-label={`Open ${feature.title}`}
                                className={`group cursor-pointer outline-none backdrop-blur-xl bg-white/60 rounded-3xl shadow-xl border border-white/30 p-12 hover:shadow-2xl hover:scale-[1.02] hover:bg-white/80 ${feature.hoverBorder} transition-all duration-500`}
                            >
                                <div className="flex flex-col items-center text-center space-y-6">
                                    <div className={`w-20 h-20 bg-gradient-to-br ${feature.gradient} rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-lg group-hover:shadow-2xl`}>
                                        <Icon className="w-10 h-10 text-white" />
                                    </div>
                                    <h3 className={`text-3xl font-bold text-gray-800 ${feature.textHover} transition-colors duration-300`}>
                                        {feature.title}
                                    </h3>
                                    <p className="text-gray-600 leading-relaxed group-hover:text-gray-800 transition-colors duration-300 max-w-xs">
                                        {feature.description}
                                    </p>
                                    <span className={`px-8 py-3 bg-gradient-to-r ${feature.btnGradient} text-white rounded-xl font-semibold group-hover:shadow-lg group-hover:scale-105 transition-all duration-300 inline-block`}>
                                        Open Module
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Remaining smaller feature cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
                    {smallFeatures.map((feature) => {
                        const Icon = feature.icon;
                        return (
                            <div
                                key={feature.id}
                                onClick={() => setActiveTab(feature.id)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => e.key === 'Enter' && setActiveTab(feature.id)}
                                aria-label={`Open ${feature.title}`}
                                className="group relative cursor-pointer outline-none bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1.5 hover:border-blue-100 transition-all duration-300 flex flex-col items-start"
                            >
                                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-[0.04] transition-opacity duration-300`} />
                                <div className={`w-12 h-12 ${feature.bgColor} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                                    <Icon className={`w-6 h-6 ${feature.iconColor}`} />
                                </div>
                                <h3 className="text-base font-bold text-gray-900 mb-2 group-hover:text-blue-700 transition-colors">
                                    {feature.title}
                                </h3>
                                <p className="text-gray-500 text-xs leading-relaxed flex-grow">
                                    {feature.description}
                                </p>
                                <div className="mt-4 inline-flex items-center text-xs font-semibold text-gray-400 group-hover:text-blue-600 transition-colors">
                                    Open
                                    <svg className="w-3 h-3 ml-1 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                                    </svg>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
