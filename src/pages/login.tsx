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

// Professional SVG Icons matching Dashboard design
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

      <div className="relative z-10 flex-1 flex flex-col lg:flex-row">
        {/* Left Side - Value Proposition */}
        <div className="lg:w-1/2 flex flex-col justify-center px-4 sm:px-6 lg:px-12 py-8 lg:py-16">
          <div className="max-w-lg mx-auto lg:mx-0">
            {/* Logo and Brand */}
            <div className="flex items-center space-x-4 mb-8 lg:mb-12">
              <div className="relative">
                <img 
                  src="/logos/signal-360-logo.png" 
                  alt="Signal-360 Logo" 
                  className="w-16 h-16 lg:w-20 lg:h-20"
                  onError={(e) => {
                    // Fallback to gradient placeholder if image fails to load
                    e.currentTarget.style.display = 'none';
                    (e.currentTarget.nextElementSibling as HTMLElement)!.style.display = 'flex';
                  }}
                />
                <div className="w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl hidden">
                  <span className="text-white font-bold text-2xl lg:text-3xl">S</span>
                </div>
              </div>
              <div>
                <p className="text-xl lg:text-2xl text-gray-300 font-medium">
                  Your AI-Powered Investment Co-Pilot
                </p>
              </div>
            </div>

            {/* Value Proposition Benefits */}
            <div className="space-y-6 lg:space-y-8">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-400/20 to-purple-400/20 border border-cyan-400/30 rounded-xl flex items-center justify-center flex-shrink-0">
                  <div className="text-cyan-400">
                    <AnalysisIcon />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl lg:text-2xl font-bold text-white mb-2">
                    Deep Analysis, in Seconds
                  </h3>
                  <p className="text-gray-300 leading-relaxed text-base lg:text-lg">
                    Save hours of research. We distill financial data into clear, actionable insights for you.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-400/20 to-cyan-400/20 border border-purple-400/30 rounded-xl flex items-center justify-center flex-shrink-0">
                  <div className="text-purple-400">
                    <VisionIcon />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl lg:text-2xl font-bold text-white mb-2">
                    360° Vision
                  </h3>
                  <p className="text-gray-300 leading-relaxed text-base lg:text-lg">
                    We merge fundamental, technical, and sentiment analysis for a complete picture of any asset.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-400/20 to-purple-400/20 border border-cyan-400/30 rounded-xl flex items-center justify-center flex-shrink-0">
                  <div className="text-cyan-400">
                    <ConfidenceIcon />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl lg:text-2xl font-bold text-white mb-2">
                    Invest with Confidence
                  </h3>
                  <p className="text-gray-300 leading-relaxed text-base lg:text-lg">
                    Make smarter decisions with an AI analyst by your side.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="lg:w-1/2 flex items-center justify-center px-4 sm:px-6 lg:px-12 py-8 lg:py-16">
          <div className="w-full max-w-md">
            {/* Glassmorphism Login Card */}
            <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl p-8 lg:p-10">
              {/* Glassmorphism gradient overlay */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
              
              <div className="relative z-10">
                <h2 className="text-3xl lg:text-4xl font-bold text-white text-center mb-8">
                  Sign In
                </h2>

                {from !== '/profile' && (
                  <div className="backdrop-blur-sm bg-cyan-500/20 border border-cyan-400/30 rounded-xl p-4 mb-6">
                    <p className="text-cyan-200 text-center text-sm lg:text-base">
                      Please sign in to access this page.
                    </p>
                  </div>
                )}

                {errors.general && (
                  <div className="backdrop-blur-sm bg-red-500/20 border border-red-400/30 rounded-xl p-4 mb-6">
                    <p className="text-red-200 text-center text-sm lg:text-base">
                      {errors.general}
                    </p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="email" className="block text-gray-200 font-medium mb-2 text-sm lg:text-base">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 lg:py-4 backdrop-blur-sm bg-white/10 border rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all duration-300 text-sm lg:text-base ${
                        errors.email ? 'border-red-400/50' : 'border-white/20 hover:border-white/30'
                      }`}
                      placeholder="Enter your email"
                      disabled={isSubmitting}
                      autoComplete="email"
                    />
                    {errors.email && (
                      <p className="text-red-300 text-sm mt-2">
                        {errors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-gray-200 font-medium mb-2 text-sm lg:text-base">
                      Password
                    </label>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 lg:py-4 backdrop-blur-sm bg-white/10 border rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all duration-300 text-sm lg:text-base ${
                        errors.password ? 'border-red-400/50' : 'border-white/20 hover:border-white/30'
                      }`}
                      placeholder="Enter your password"
                      disabled={isSubmitting}
                      autoComplete="current-password"
                    />
                    {errors.password && (
                      <p className="text-red-300 text-sm mt-2">
                        {errors.password}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold py-4 lg:py-5 px-8 rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-gray-900 shadow-xl hover:shadow-2xl hover:shadow-cyan-500/25 transform hover:-translate-y-1 hover:scale-105 disabled:hover:transform-none disabled:hover:shadow-xl border border-cyan-400/20 backdrop-blur-sm text-base lg:text-lg disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Signing In...' : 'Sign In'}
                  </button>
                </form>

                <div className="text-center mt-8">
                  <p className="text-gray-300 text-sm lg:text-base">
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
      </div>

      {/* Footer with Vortex Branding */}
      <footer className="relative z-10 backdrop-blur-xl bg-black/40 border-t border-white/10 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center space-x-4">
            <span className="text-gray-400 text-sm">Created by</span>
            <a 
              href="https://es.vortexlabsia.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center space-x-3 hover:opacity-80 transition-all duration-300 hover:scale-105 group"
            >
              {/* Vortex Logo */}
              <div className="relative">
                <img 
                  src="/logos/vortex-logo.png" 
                  alt="Vortex Logo" 
                  className="w-8 h-8"
                  onError={(e) => {
                    // Fallback to gradient placeholder if image fails to load
                    e.currentTarget.style.display = 'none';
                    (e.currentTarget.nextElementSibling as HTMLElement)!.style.display = 'flex';
                  }}
                />
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg hidden">
                  <span className="text-white font-bold text-xs">V</span>
                </div>
              </div>
              <span className="text-gray-200 font-semibold text-sm group-hover:text-white transition-colors duration-300">
                Vortex Labs
              </span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LoginPage