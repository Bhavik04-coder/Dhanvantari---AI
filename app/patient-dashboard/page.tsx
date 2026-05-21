'use client';

import { Skeleton } from 'boneyard-js/react';
import PatientNavbar from '@/components/patient/PatientNavbar';
import HeroSection from '@/components/patient/HeroSection';
import FeatureCards from '@/components/patient/FeatureCards';
import QuickAccessButtons from '@/components/patient/QuickAccessButtons';
import RecentPrescriptions from '@/components/patient/RecentPrescriptions';
import ServicesSection from '@/components/patient/ServicesSection';
import Footer from '@/components/patient/Footer';
import NeuralNetworkContainer from '@/components/ui/NeuralNetworkContainer';

export default function PatientDashboard() {
  return (
    <NeuralNetworkContainer className="min-h-screen bg-gradient-to-br from-white via-blue-50/30 to-white">
      <PatientNavbar />

      <Skeleton name="patient-hero" loading={false} animate="shimmer">
        <HeroSection />
      </Skeleton>

      <Skeleton name="patient-feature-cards" loading={false} animate="shimmer">
        <FeatureCards />
      </Skeleton>

      <Skeleton name="patient-quick-access" loading={false} animate="shimmer">
        <QuickAccessButtons />
      </Skeleton>

      <RecentPrescriptions />

      <Skeleton name="patient-services" loading={false} animate="shimmer">
        <ServicesSection />
      </Skeleton>

      <Footer />
    </NeuralNetworkContainer>
  );
}

