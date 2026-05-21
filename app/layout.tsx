import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import '@/bones/registry'
import LenisProvider from '@/components/LenisProvider'
import LoadingTransition from '@/components/LoadingTransition'
import SessionWrapper from '@/components/SessionWrapper'

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Dhanvantari AI - Smart Healthcare Monitoring',
    template: '%s | Dhanvantari AI',
  },
  description: 'AI-powered healthcare monitoring and disease prediction system with 86.76% accuracy',
  keywords: ['healthcare', 'AI', 'disease prediction', 'telemedicine', 'health monitoring'],
  openGraph: {
    type: 'website',
    siteName: 'Dhanvantari AI',
    title: 'Dhanvantari AI - Smart Healthcare Monitoring',
    description: 'AI-powered healthcare monitoring and disease prediction system with 86.76% accuracy',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dhanvantari AI',
    description: 'AI-powered healthcare monitoring and disease prediction',
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#3b82f6',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={inter.className}>
        <LoadingTransition />
        <SessionWrapper>
          <LenisProvider>
            {children}
          </LenisProvider>
        </SessionWrapper>
      </body>
    </html>
  )
}
