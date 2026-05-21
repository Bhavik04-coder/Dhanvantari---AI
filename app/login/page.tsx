'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, lazy, Suspense, useEffect, useRef } from 'react'
import Swal from 'sweetalert2'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Mail, Lock, User, Eye, EyeOff, ArrowLeft, Stethoscope, UserCircle, CheckCircle, XCircle, Loader2, ShieldCheck } from 'lucide-react'
import { signIn } from 'next-auth/react'
import HeartbeatTransition from '@/components/HeartbeatTransition'

const DoctorModel3D = lazy(() => import('@/components/DoctorModel3D'))
const PatientModel3D = lazy(() => import('@/components/PatientModel3D'))

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  OAuthCallback:      'Google sign-in failed. Please check that your Google account is authorized and try again.',
  OAuthSignin:        'Could not start Google sign-in. Please try again.',
  OAuthCreateAccount: 'Could not create an account with Google. Please try again.',
  Callback:           'Sign-in callback failed. Please try again.',
  AccessDenied:       'Access was denied. Please grant the required permissions.',
  Configuration:      'Server configuration error. Please contact support.',
  Default:            'An unexpected error occurred. Please try again.',
}

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Show error toast if NextAuth redirected back with an error param
  useEffect(() => {
    const error = searchParams.get('error')
    if (!error) return
    const message = OAUTH_ERROR_MESSAGES[error] ?? OAUTH_ERROR_MESSAGES.Default
    Swal.fire({ icon: 'error', title: 'Sign-in Failed', text: message, confirmButtonColor: '#3b82f6' })
    // Clean the error param from the URL without a full reload
    const url = new URL(window.location.href)
    url.searchParams.delete('error')
    url.searchParams.delete('callbackUrl')
    window.history.replaceState({}, '', url.toString())
  }, [searchParams])
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [userRole, setUserRole] = useState<'doctor' | 'patient' | 'admin'>('patient')
  const [loading, setLoading] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    confirmPassword: '',
  })

  // Doctor verification fields (only relevant during doctor sign-up)
  const [doctorData, setDoctorData] = useState({
    medicalCouncil: '',
    registrationNumber: '',
    registrationYear: '',
  })
  const [regNumError, setRegNumError] = useState('')

  // Indian state medical councils
  const MEDICAL_COUNCILS = [
    'Andhra Pradesh Medical Council',
    'Assam Medical Council',
    'Bihar Medical Council',
    'Chhattisgarh Medical Council',
    'Delhi Medical Council',
    'Goa Medical Council',
    'Gujarat Medical Council',
    'Haryana Medical Council',
    'Himachal Pradesh Medical Council',
    'Jammu & Kashmir Medical Council',
    'Jharkhand Medical Council',
    'Karnataka Medical Council',
    'Kerala Medical Council',
    'Madhya Pradesh Medical Council',
    'Maharashtra Medical Council',
    'Manipur Medical Council',
    'Meghalaya Medical Council',
    'Mizoram Medical Council',
    'Nagaland Medical Council',
    'Odisha Medical Council',
    'Punjab Medical Council',
    'Rajasthan Medical Council',
    'Sikkim Medical Council',
    'Tamil Nadu Medical Council',
    'Telangana State Medical Council',
    'Tripura Medical Council',
    'Uttar Pradesh Medical Council',
    'Uttarakhand Medical Council',
    'West Bengal Medical Council',
    'Medical Council of India (MCI/NMC)',
  ]

  // Validate registration number format: letters/digits, optional hyphen, 4-8 digits
  // e.g. MMC-123456, DL-67890, KMC12345
  const REG_NUM_REGEX = /^[A-Z]{2,6}-?\d{4,8}$/i

  const validateRegNumber = (val: string) => {
    if (!val) { setRegNumError(''); return true }
    if (!REG_NUM_REGEX.test(val.trim())) {
      setRegNumError('Format should be like MMC-123456 or DL67890 (council prefix + digits).')
      return false
    }
    setRegNumError('')
    return true
  }

  const handleDoctorDataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setDoctorData(prev => ({ ...prev, [name]: value }))
    if (name === 'registrationNumber') validateRegNumber(value)
  }

  // Email validation state
  type EmailStatus = 'idle' | 'checking' | 'valid' | 'invalid'
  const [emailStatus, setEmailStatus] = useState<EmailStatus>('idle')
  const [emailError, setEmailError] = useState('')
  const emailDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Basic format check (client-side, instant)
  const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/

  const validateEmailAsync = async (email: string) => {
    if (!email) { setEmailStatus('idle'); setEmailError(''); return }
    if (!EMAIL_REGEX.test(email)) {
      setEmailStatus('invalid')
      setEmailError('Please enter a valid email address.')
      return
    }
    setEmailStatus('checking')
    setEmailError('')
    try {
      const res = await fetch('/api/auth/validate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (data.valid) {
        setEmailStatus('valid')
        setEmailError('')
      } else {
        setEmailStatus('invalid')
        setEmailError(data.reason ?? 'This email address does not appear to be valid.')
      }
    } catch {
      // Network error — don't block the user, just reset
      setEmailStatus('idle')
      setEmailError('')
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))

    if (name === 'email') {
      // Debounce the async check by 600ms so we don't fire on every keystroke
      if (emailDebounceRef.current) clearTimeout(emailDebounceRef.current)
      setEmailStatus('idle')
      setEmailError('')
      emailDebounceRef.current = setTimeout(() => {
        validateEmailAsync(value.trim().toLowerCase())
      }, 600)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Block submit if email is known-invalid
    if (emailStatus === 'invalid') {
      Swal.fire({ icon: 'error', title: 'Invalid Email', text: emailError || 'Please enter a valid email address.', confirmButtonColor: '#3b82f6' })
      return
    }

    // If still checking, wait for it to finish
    if (emailStatus === 'checking') {
      Swal.fire({ icon: 'info', title: 'Validating Email', text: 'Please wait a moment while we verify your email.', confirmButtonColor: '#3b82f6' })
      return
    }

    if (activeTab === 'signup' && formData.password !== formData.confirmPassword) {
      Swal.fire({ icon: 'error', title: 'Password Mismatch', text: 'Passwords do not match.', confirmButtonColor: '#3b82f6' })
      return
    }

    // Doctor sign-up: require registration details
    if (activeTab === 'signup' && userRole === 'doctor') {
      if (!doctorData.medicalCouncil) {
        Swal.fire({ icon: 'error', title: 'Missing Information', text: 'Please select your State Medical Council.', confirmButtonColor: '#3b82f6' })
        return
      }
      if (!doctorData.registrationNumber) {
        Swal.fire({ icon: 'error', title: 'Missing Information', text: 'Please enter your Medical Registration Number.', confirmButtonColor: '#3b82f6' })
        return
      }
      if (!validateRegNumber(doctorData.registrationNumber)) {
        Swal.fire({ icon: 'error', title: 'Invalid Registration Number', text: regNumError, confirmButtonColor: '#3b82f6' })
        return
      }
      const year = parseInt(doctorData.registrationYear)
      if (doctorData.registrationYear && (isNaN(year) || year < 1950 || year > new Date().getFullYear())) {
        Swal.fire({ icon: 'error', title: 'Invalid Year', text: 'Please enter a valid registration year.', confirmButtonColor: '#3b82f6' })
        return
      }
    }

    setLoading(true)
    const result = await signIn('credentials', {
      redirect: false,
      email: formData.email,
      password: formData.password,
      name: formData.name,
      role: userRole,
      isSignUp: activeTab === 'signup' ? 'true' : 'false',
      // Doctor verification fields (ignored for patients / sign-in)
      medicalCouncil:     doctorData.medicalCouncil,
      registrationNumber: doctorData.registrationNumber,
      registrationYear:   doctorData.registrationYear,
    })
    setLoading(false)

    if (result?.error) {
      Swal.fire({ icon: 'error', title: 'Authentication Failed', text: result.error, confirmButtonColor: '#3b82f6' })
      return
    }

    // Show pending verification notice for new doctor accounts
    if (activeTab === 'signup' && userRole === 'doctor') {
      await Swal.fire({
        icon: 'info',
        title: 'Account Created — Verification Pending',
        html: `Your account has been created.<br/><br/>
               Your medical registration details have been submitted for verification.
               You can use the platform while verification is in progress.
               A badge will appear on your profile once verified.`,
        confirmButtonColor: '#3b82f6',
        confirmButtonText: 'Go to Dashboard',
      })
    }

    // Show heartbeat transition then redirect
    setRedirecting(true)
    if (userRole === 'admin') {
      router.push('/admin')
    } else {
      router.push(userRole === 'doctor' ? '/dashboard' : '/patient-dashboard')
    }
  }

  return (
    <>
      {/* Heartbeat overlay — shown while authenticating or redirecting */}
      <AnimatePresence>
        {(loading || redirecting) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9999] overflow-hidden"
          >
            <HeartbeatTransition />
          </motion.div>
        )}
      </AnimatePresence>

    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-cyan-50 relative overflow-hidden flex items-center justify-center px-4 py-8">
      {/* Abstract Background Shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-blue-200/40 to-teal-200/40 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [0, -90, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-cyan-200/40 to-blue-200/40 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            y: [0, 100, 0],
            x: [0, 50, 0],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/4 w-64 h-64 bg-gradient-to-br from-teal-300/30 to-cyan-300/30 rounded-full blur-2xl"
        />
      </div>

      {/* Main Container */}
      <div className="w-full max-w-5xl relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 px-4">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-teal-500 p-0.5 shadow-lg">
              <div className="w-full h-full rounded-full bg-white p-2 flex items-center justify-center">
                <Image
                  src="/logo.png"
                  alt="Dhanvantari AI"
                  width={28}
                  height={28}
                  className="object-contain"
                />
              </div>
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
              Dhanvantari AI
            </span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>

        {/* Glassmorphism Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 overflow-hidden"
        >
          <div className="grid md:grid-cols-2 gap-0">
            {/* Left Side - Illustration/Info */}
            <div className="hidden md:flex flex-col justify-center bg-gradient-to-br from-blue-500 to-teal-500 text-white relative overflow-hidden self-stretch min-h-[600px]">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjIiIG9wYWNpdHk9Ii4xIi8+PC9nPjwvc3ZnPg==')] opacity-10" />

              <AnimatePresence mode="wait">
                {userRole === 'doctor' ? (
                  /* 3D Model + original text for Doctor */
                  <motion.div
                    key="doctor-3d"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="relative z-10 flex flex-col h-full w-full"
                  >
                    {/* 3D model — top half */}
                    <div className="w-full h-64 shrink-0">
                      <Suspense fallback={
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                        </div>
                      }>
                        <DoctorModel3D />
                      </Suspense>
                    </div>
                    {/* Original text below */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="px-12 pb-10"
                    >
                      <h2 className="text-4xl font-bold mb-4">Welcome to the Future of Healthcare</h2>
                      <p className="text-blue-100 text-lg mb-8">
                        AI-powered health monitoring and disease prediction at your fingertips
                      </p>
                      <div className="space-y-4">
                        {[
                          'AI Disease Prediction',
                          'Real-time Health Monitoring',
                          'Connect with Doctors 24/7',
                        ].map((item) => (
                          <div key={item} className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <span className="text-lg">{item}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  </motion.div>
                ) : (
                  /* Patient Panel with 3D model + original text */
                  <motion.div
                    key="patient-info"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="relative z-10 flex flex-col h-full w-full"
                  >
                    {/* 3D model — top */}
                    <div className="w-full h-64 shrink-0">
                      <Suspense fallback={
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                        </div>
                      }>
                        <PatientModel3D />
                      </Suspense>
                    </div>
                    {/* Original text below */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="px-12 pb-10"
                    >
                      <h2 className="text-4xl font-bold mb-4">Welcome to the Future of Healthcare</h2>
                      <p className="text-blue-100 text-lg mb-8">
                        AI-powered health monitoring and disease prediction at your fingertips
                      </p>
                      <div className="space-y-4">
                        {[
                          'AI Disease Prediction',
                          'Real-time Health Monitoring',
                          'Connect with Doctors 24/7',
                        ].map((item) => (
                          <div key={item} className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <span className="text-lg">{item}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right Side - Form */}
            <div className="p-8 md:p-12">
              {/* Tabs — hidden for admin (no sign-up) */}
              {userRole !== 'admin' && (
              <div className="flex gap-2 mb-8 bg-gray-100 p-1.5 rounded-xl">
                <button
                  type="button"
                  onClick={() => setActiveTab('signin')}
                  className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all ${
                    activeTab === 'signin'
                      ? 'bg-white text-blue-600 shadow-md'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('signup')}
                  className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all ${
                    activeTab === 'signup'
                      ? 'bg-white text-blue-600 shadow-md'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Create Account
                </button>
              </div>
              )}

              {/* Form */}
              <AnimatePresence mode="wait">
                <motion.form
                  key={activeTab}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  onSubmit={handleSubmit}
                  className="space-y-5"
                >
                  {/* Role Selection */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      I am a
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => setUserRole('patient')}
                        className={`flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl border-2 transition-all ${
                          userRole === 'patient'
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 bg-white/50 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <UserCircle className="w-5 h-5" />
                        <span className="font-semibold">Patient</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setUserRole('doctor')}
                        className={`flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl border-2 transition-all ${
                          userRole === 'doctor'
                            ? 'border-teal-500 bg-teal-50 text-teal-700'
                            : 'border-gray-200 bg-white/50 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <Stethoscope className="w-5 h-5" />
                        <span className="font-semibold">Doctor</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setUserRole('admin')}
                        className={`flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl border-2 transition-all ${
                          userRole === 'admin'
                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                            : 'border-gray-200 bg-white/50 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <ShieldCheck className="w-5 h-5" />
                        <span className="font-semibold">Admin</span>
                      </button>
                    </div>
                  </div>

                  {activeTab === 'signup' && userRole !== 'admin' && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Full Name
                      </label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          required={activeTab === 'signup'}
                          className="w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white/50 backdrop-blur-sm"
                          placeholder="User Name"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className={`w-full pl-12 pr-10 py-3.5 border rounded-xl focus:outline-none focus:ring-2 focus:border-transparent transition-all bg-white/50 backdrop-blur-sm ${
                          emailStatus === 'invalid'
                            ? 'border-red-400 focus:ring-red-400'
                            : emailStatus === 'valid'
                            ? 'border-green-400 focus:ring-green-400'
                            : 'border-gray-200 focus:ring-blue-500'
                        }`}
                        placeholder="username@gmail.com"
                      />
                      {/* Email status icon */}
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        {emailStatus === 'checking' && (
                          <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                        )}
                        {emailStatus === 'valid' && (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        )}
                        {emailStatus === 'invalid' && (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                    </div>
                    {emailStatus === 'invalid' && emailError && (
                      <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                        <XCircle className="w-3 h-3 shrink-0" />
                        {emailError}
                      </p>
                    )}
                    {emailStatus === 'valid' && (
                      <p className="mt-1.5 text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 shrink-0" />
                        Email address looks good
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        className="w-full pl-12 pr-12 py-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white/50 backdrop-blur-sm"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {activeTab === 'signup' && userRole !== 'admin' && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          required={activeTab === 'signup'}
                          className="w-full pl-12 pr-12 py-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white/50 backdrop-blur-sm"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Doctor Verification Fields — only shown during doctor sign-up */}
                  {activeTab === 'signup' && userRole === 'doctor' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-4 border border-teal-200 bg-teal-50/60 rounded-xl p-4"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Stethoscope className="w-4 h-4 text-teal-600" />
                        <p className="text-sm font-bold text-teal-700">Medical Registration Details</p>
                      </div>
                      <p className="text-xs text-teal-600 -mt-2">
                        Required for verification. Your account will be marked as pending until reviewed.
                      </p>

                      {/* State Medical Council */}
                      <div>
                        <label htmlFor="doctor-council" className="block text-sm font-semibold text-gray-700 mb-2">
                          State Medical Council <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="doctor-council"
                          name="medicalCouncil"
                          value={doctorData.medicalCouncil}
                          onChange={handleDoctorDataChange}
                          required={activeTab === 'signup' && userRole === 'doctor'}
                          className="w-full px-4 py-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all bg-white/80 text-gray-700 text-sm"
                        >
                          <option value="">Select your council...</option>
                          {MEDICAL_COUNCILS.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>

                      {/* Registration Number */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Registration Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="registrationNumber"
                          value={doctorData.registrationNumber}
                          onChange={handleDoctorDataChange}
                          required={activeTab === 'signup' && userRole === 'doctor'}
                          placeholder="e.g. MMC-123456 or DL67890"
                          className={`w-full px-4 py-3.5 border rounded-xl focus:outline-none focus:ring-2 focus:border-transparent transition-all bg-white/80 text-sm ${
                            regNumError ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-teal-500'
                          }`}
                        />
                        {regNumError && (
                          <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                            <XCircle className="w-3 h-3 shrink-0" />
                            {regNumError}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">
                          Format: council prefix + number (e.g. MMC-123456, KMC-78901)
                        </p>
                      </div>

                      {/* Registration Year */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Year of Registration
                        </label>
                        <input
                          type="number"
                          name="registrationYear"
                          value={doctorData.registrationYear}
                          onChange={handleDoctorDataChange}
                          placeholder="e.g. 2015"
                          min="1950"
                          max={new Date().getFullYear()}
                          className="w-full px-4 py-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all bg-white/80 text-sm"
                        />
                      </div>

                      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <svg className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <p className="text-xs text-amber-700">
                          Your registration details will be manually verified by our team. Providing false information may result in account suspension.
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'signin' && (
                    <div className="flex items-center justify-between">
                      <label className="flex items-center cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="ml-2 text-sm text-gray-600 group-hover:text-gray-900">
                          Remember me
                        </span>
                      </label>
                      <a href="#" className="text-sm text-blue-600 hover:text-blue-700 font-semibold">
                        Forgot password?
                      </a>
                    </div>
                  )}

                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: loading ? 1 : 1.02 }}
                    whileTap={{ scale: loading ? 1 : 0.98 }}
                    className="w-full py-4 bg-gradient-to-r from-blue-500 to-teal-500 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading && <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                    {activeTab === 'signin' ? 'Sign In' : 'Create Account'}
                  </motion.button>
                </motion.form>
              </AnimatePresence>

              {/* Divider */}
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500 font-medium">Or continue with</span>
                </div>
              </div>

              {/* Social Login */}
              <div className="grid grid-cols-2 gap-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => {
                    setRedirecting(true)
                    signIn('google', { callbackUrl: '/auth/callback' })
                  }}
                  className="flex items-center justify-center gap-3 px-4 py-3.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all bg-white/50 backdrop-blur-sm"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span className="text-sm font-semibold text-gray-700">Google</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  className="flex items-center justify-center gap-3 px-4 py-3.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all bg-white/50 backdrop-blur-sm"
                >
                  <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  <span className="text-sm font-semibold text-gray-700">Facebook</span>
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
    </>
  )
}
