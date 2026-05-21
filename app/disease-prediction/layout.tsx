import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Disease Prediction',
  description: 'Select your symptoms and get instant AI-powered disease analysis with 86.76% accuracy.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
