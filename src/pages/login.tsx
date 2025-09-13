import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/auth-context'
import { validateEmail, validateRequired } from '../utils/validation'

interface FormData {
  email: string
  password: string
}

interface FormErrors {
  email?: string
  password?: string
  general?: string
}

interface LocationState {
  from?: {
    pathname: string
  }
}

// Professional SVG Icons for the Manifesto Layout
function AnalysisIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function VisionIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9-9a9 9 0 00-9 9m0 0a9 9 0 019-9" />
    </svg>
  );
}

function ConfidenceIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

// New Icons for Value Proposition Column
function LightningIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

function BrainIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

export function LoginPage() {
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: ''
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { signIn, user, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Get the intended destination from location state
  const from = (location.state as LocationState)?.from?.pathname || '/profile'

  // Redirect if already authenticated
  useEffect(() => {
    if (user && !loading) {
      navigate(from, { replace: true })
    }
  }, [user, loading, navigate, from])

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    const emailValidation = validateEmail(formData.email)
    const passwordValidation = validateRequired(formData.password, 'Password')

    newErrors.email = emailValidation.isValid ? undefined : emailValidation.error
    newErrors.password = passwordValidation.isValid ? undefined : passwordValidation.error

    setErrors(newErrors)
    return !Object.values(newErrors).some(error => error !== undefined)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))

    // Clear field-specific error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setErrors({})

    try {
      await signIn(formData.email, formData.password)
      // Success - user will be redirected by useEffect when user state updates
    } catch (error: any) {
      console.error('Sign in error:', error)
      setErrors({
        general: error.message || 'Invalid email or password. Please try again.'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Show loading if auth is still initializing
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black flex items-center justify-center">
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8">
          <div className="text-white text-lg">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black flex flex-col relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-cyan-400/20 to-purple-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-purple-400/20 to-cyan-600/20 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-cyan-400/10 to-purple-600/10 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      {/* Three-Column Manifesto Layout */}
      <div className="relative z-10 flex-1 grid grid-cols-1 xl:grid-cols-3 min-h-0">
        
        {/* Left Column - Brand Manifesto */}
        <div className="flex flex-col justify-center px-4 sm:px-6 lg:px-8 xl:px-6 py-6 lg:py-8 xl:py-12 order-1">
          <div className="max-w-lg mx-auto xl:mx-0">
            {/* Logo and Brand Identity */}
            <div className="flex items-center space-x-3 mb-8 xl:mb-10">
              <div className="relative">
                <img 
                  src="/logos/LogoCompass.webp" 
                  alt="Value Investor's Compass Logo" 
                  className="w-12 h-12 lg:w-16 lg:h-16"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    (e.currentTarget.nextElementSibling as HTMLElement)!.style.display = 'flex';
                  }}
                />
                <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl hidden">
                  <span className="text-white font-bold text-xl lg:text-2xl">V</span>
                </div>
              </div>
              <div>
                <h1 className="text-lg lg:text-2xl xl:text-xl bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent font-bold leading-tight">
                  Value Investor's Compass
                </h1>
                <p className="text-sm lg:text-lg xl:text-base text-gray-300 font-medium">
                  Disciplined Value Investing Through AI
                </p>
              </div>
            </div>

            {/* Main Headline */}
            <div className="mb-8 xl:mb-10">
              <h2 className="text-2xl lg:text-4xl xl:text-3xl font-bold text-white leading-tight">
                Your Unbiased Second Opinion
              </h2>
            </div>

            {/* Core Benefits */}
            <div className="space-y-6 xl:space-y-7">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-cyan-400/20 to-purple-400/20 border border-cyan-400/30 rounded-xl flex items-center justify-center flex-shrink-0">
                  <div className="text-cyan-400">
                    <AnalysisIcon />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg lg:text-xl xl:text-lg font-bold text-white mb-2">
                    Save Countless Hours
                  </h3>
                  <p className="text-gray-300 leading-relaxed text-sm lg:text-base xl:text-sm">
                    We distill complex financial data into a clear, actionable thesis in seconds.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-purple-400/20 to-cyan-400/20 border border-purple-400/30 rounded-xl flex items-center justify-center flex-shrink-0">
                  <div className="text-purple-400">
                    <VisionIcon />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg lg:text-xl xl:text-lg font-bold text-white mb-2">
                    Invest with Discipline
                  </h3>
                  <p className="text-gray-300 leading-relaxed text-sm lg:text-base xl:text-sm">
                    Our analysis is anchored in a strict, value-first philosophy. No hype, just data.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-cyan-400/20 to-purple-400/20 border border-cyan-400/30 rounded-xl flex items-center justify-center flex-shrink-0">
                  <div className="text-cyan-400">
                    <ConfidenceIcon />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg lg:text-xl xl:text-lg font-bold text-white mb-2">
                    Gain True Confidence
                  </h3>
                  <p className="text-gray-300 leading-relaxed text-sm lg:text-base xl:text-sm">
                    Make smarter decisions with a powerful AI analyst by your side.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Center Column - Action Panel */}
        <div className="flex items-center justify-center px-4 sm:px-6 lg:px-8 xl:px-6 py-6 lg:py-8 xl:py-12 order-2">
          <div className="w-full max-w-md xl:max-w-sm">
            {/* Glassmorphism Login Card */}
            <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl p-6 lg:p-8 xl:p-6">
              {/* Glassmorphism gradient overlay */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
              
              <div className="relative z-10">
                <h2 className="text-2xl lg:text-3xl xl:text-2xl font-bold text-white text-center mb-6 lg:mb-8 xl:mb-6">
                  Sign In
                </h2>

                {from !== '/profile' && (
                  <div className="backdrop-blur-sm bg-cyan-500/20 border border-cyan-400/30 rounded-xl p-3 lg:p-4 xl:p-3 mb-4 lg:mb-6 xl:mb-4">
                    <p className="text-cyan-200 text-center text-xs lg:text-sm xl:text-xs">
                      Please sign in to access this page.
                    </p>
                  </div>
                )}

                {errors.general && (
                  <div className="backdrop-blur-sm bg-red-500/20 border border-red-400/30 rounded-xl p-3 lg:p-4 xl:p-3 mb-4 lg:mb-6 xl:mb-4">
                    <p className="text-red-200 text-center text-xs lg:text-sm xl:text-xs">
                      {errors.general}
                    </p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4 lg:space-y-6 xl:space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-gray-200 font-medium mb-2 text-xs lg:text-sm xl:text-xs">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 lg:px-4 lg:py-3 xl:px-3 xl:py-2 backdrop-blur-sm bg-white/10 border rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all duration-300 text-xs lg:text-sm xl:text-xs ${
                        errors.email ? 'border-red-400/50' : 'border-white/20 hover:border-white/30'
                      }`}
                      placeholder="Enter your email"
                      disabled={isSubmitting}
                      autoComplete="email"
                    />
                    {errors.email && (
                      <p className="text-red-300 text-xs mt-1 lg:mt-2 xl:mt-1">
                        {errors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-gray-200 font-medium mb-2 text-xs lg:text-sm xl:text-xs">
                      Password
                    </label>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 lg:px-4 lg:py-3 xl:px-3 xl:py-2 backdrop-blur-sm bg-white/10 border rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all duration-300 text-xs lg:text-sm xl:text-xs ${
                        errors.password ? 'border-red-400/50' : 'border-white/20 hover:border-white/30'
                      }`}
                      placeholder="Enter your password"
                      disabled={isSubmitting}
                      autoComplete="current-password"
                    />
                    {errors.password && (
                      <p className="text-red-300 text-xs mt-1 lg:mt-2 xl:mt-1">
                        {errors.password}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold py-3 lg:py-4 xl:py-3 px-6 lg:px-8 xl:px-6 rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-gray-900 shadow-xl hover:shadow-2xl hover:shadow-cyan-500/25 transform hover:-translate-y-1 hover:scale-105 disabled:hover:transform-none disabled:hover:shadow-xl border border-cyan-400/20 backdrop-blur-sm text-sm lg:text-base xl:text-sm disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Signing In...' : 'Sign In'}
                  </button>
                </form>

                <div className="text-center mt-6 lg:mt-8 xl:mt-6">
                  <p className="text-gray-300 text-xs lg:text-sm xl:text-xs">
                    Don't have an account?{' '}
                    <Link 
                      to="/sign-up" 
                      className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors duration-300 hover:underline"
                    >
                      Create one here
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Value Proposition */}
        <div className="flex flex-col justify-center px-4 sm:px-6 lg:px-8 xl:px-6 py-6 lg:py-8 xl:py-12 order-3">
          <div className="max-w-lg mx-auto xl:mx-0">
            {/* Main Headline */}
            <div className="mb-8 xl:mb-10">
              <h2 className="text-2xl lg:text-4xl xl:text-3xl font-bold text-white leading-tight mb-3 lg:mb-4 xl:mb-3">
                Upgrade Your Investment Process
              </h2>
              <p className="text-lg lg:text-2xl xl:text-xl text-cyan-300 font-semibold">
                Save 20+ hours a week
              </p>
            </div>

            {/* Benefit Cards */}
            <div className="space-y-4 xl:space-y-5 mb-8 xl:mb-10">
              <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-2xl p-4 xl:p-5 hover:bg-white/10 transition-all duration-300">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-yellow-400/20 to-orange-400/20 border border-yellow-400/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <div className="text-yellow-400">
                      <LightningIcon />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-base lg:text-lg xl:text-base font-bold text-white mb-1">
                      Instant Analysis
                    </h3>
                    <p className="text-gray-300 text-xs lg:text-sm xl:text-xs leading-relaxed">
                      Get Warren Buffett-style analysis in 30 seconds, not 30 hours.
                    </p>
                  </div>
                </div>
              </div>

              <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-2xl p-4 xl:p-5 hover:bg-white/10 transition-all duration-300">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 border border-blue-400/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <div className="text-blue-400">
                      <BrainIcon />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-base lg:text-lg xl:text-base font-bold text-white mb-1">
                      Zero Emotions, Pure Logic
                    </h3>
                    <p className="text-gray-300 text-xs lg:text-sm xl:text-xs leading-relaxed">
                      AI never gets greedy, fearful, or makes impulsive decisions.
                    </p>
                  </div>
                </div>
              </div>

              <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-2xl p-4 xl:p-5 hover:bg-white/10 transition-all duration-300">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-purple-400/20 to-pink-400/20 border border-purple-400/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <div className="text-purple-400">
                      <StarIcon />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-base lg:text-lg xl:text-base font-bold text-white mb-1">
                      Find Hidden Gems
                    </h3>
                    <p className="text-gray-300 text-xs lg:text-sm xl:text-xs leading-relaxed">
                      Discover undervalued companies before the market does.
                    </p>
                  </div>
                </div>
              </div>

              <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-2xl p-4 xl:p-5 hover:bg-white/10 transition-all duration-300">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-green-400/20 to-emerald-400/20 border border-green-400/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <div className="text-green-400">
                      <ShieldIcon />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-base lg:text-lg xl:text-base font-bold text-white mb-1">
                      Avoid Costly Mistakes
                    </h3>
                    <p className="text-gray-300 text-xs lg:text-sm xl:text-xs leading-relaxed">
                      Our AI spots red flags that human investors often miss.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Call to Action */}
            <div className="backdrop-blur-sm bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-400/30 rounded-2xl p-4 xl:p-6 text-center">
              <h3 className="text-lg lg:text-xl xl:text-lg font-bold text-white mb-2">
                Ready to Invest Smarter?
              </h3>
              <p className="text-cyan-200 text-sm lg:text-base xl:text-sm">
                Join thousands of investors making better decisions with AI-powered analysis.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer with Vortex Branding */}
      <footer className="relative z-10 backdrop-blur-xl bg-black/40 border-t border-white/10 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center space-x-6">
            <div className="flex items-center space-x-2 text-gray-400">
              <span className="text-sm">by</span>
              <a 
                href="https://es.vortexlabsia.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center space-x-2 hover:opacity-80 transition-all duration-300 hover:scale-105 group"
              >
                <div className="relative">
                  <img 
                    src="/logos/vortex-logo.png" 
                    alt="Vortex Logo" 
                    style={{ height: "20px" }}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      (e.currentTarget.nextElementSibling as HTMLElement)!.style.display = 'flex';
                    }}
                  />
                  <div className="h-5 w-5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg hidden">
                    <span className="text-white font-bold text-xs">V</span>
                  </div>
                </div>
              </a>
            </div>
            <a 
              href="mailto:soporte@vortexlabsia.com?subject=Feedback%20and%20Credits" 
              className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="text-sm">Feedback & Credits</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LoginPage