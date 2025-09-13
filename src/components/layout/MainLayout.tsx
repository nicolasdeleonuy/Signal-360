import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/auth-context';
import { useUserProfile } from '../../hooks/useUserProfile';
import { useDisclaimer } from '../../hooks/useDisclaimer';
import { DisclaimerModal } from '../modals/DisclaimerModal';

// Icon Components
function LogoutIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}

function ChartBarIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 13v-1m4 1v-3m4 3V8M5.98 12.02A9.003 9.003 0 0012 21a9.003 9.003 0 006.02-3.98" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3a9 9 0 012.98 17.02" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12a9 9 0 0117.02 2.98" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useUserProfile();
  const { showDisclaimer, acceptDisclaimer } = useDisclaimer();

  const isDashboard = location.pathname === '/';

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleBackToDashboard = () => {
    navigate('/');
  };

  return (
    <>
      <DisclaimerModal isOpen={showDisclaimer} onAccept={acceptDisclaimer} />
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black flex flex-col relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-cyan-400/20 to-purple-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-purple-400/20 to-cyan-600/20 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-cyan-400/10 to-purple-600/10 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 flex flex-col">
        {/* Header */}
        <header className="backdrop-blur-xl bg-slate-900/50 border-b border-white/10 py-6 mb-8 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center space-x-4 mb-4 sm:mb-0">
              {/* Value Investor's Compass Logo */}
              <div className="relative">
                <img 
                  src="/logos/LogoCompass.webp" 
                  alt="Value Investor's Compass Logo" 
                  className="w-12 h-12 lg:w-12 lg:h-12"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    (e.currentTarget.nextElementSibling as HTMLElement)!.style.display = 'flex';
                  }}
                />
                <div className="w-12 h-12 lg:w-12 lg:h-12 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl hidden">
                  <span className="text-white font-bold text-lg lg:text-xl">V</span>
                </div>
              </div>
              <div>
                <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent font-bold text-lg lg:text-xl">Value Investor's Compass</span>
                {/* Mobile slogan */}
                <p className="block md:hidden text-sm font-medium text-gray-300">
                  Value-First Analysis
                </p>
                {/* Desktop slogan */}
                <p className="hidden md:block text-sm lg:text-base font-medium text-gray-300">
                  Disciplined Value Investing Through AI
                </p>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                {isDashboard && (
                  <div className="backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl px-4 py-2">
                    <span className="text-gray-200 font-medium text-sm lg:text-base">
                      Welcome, {user?.email}
                    </span>
                  </div>
                )}
                {profile && (
                  <div className="backdrop-blur-sm bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-400/30 rounded-xl px-4 py-2">
                    <span className="text-cyan-200 font-medium text-sm lg:text-base">
                      Credits: {profile.credits}
                    </span>
                  </div>
                )}
                {!isDashboard && (
                  <button
                    onClick={handleBackToDashboard}
                    className="flex items-center space-x-2 backdrop-blur-sm bg-white/10 border border-white/20 hover:border-cyan-400/30 hover:bg-cyan-500/10 rounded-xl px-3 py-2 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-gray-900 group"
                    aria-label="Back to dashboard"
                  >
                    <div className="text-gray-300 group-hover:text-cyan-300 transition-colors duration-300">
                      <BackIcon />
                    </div>
                    <span className="text-gray-300 group-hover:text-cyan-300 font-medium text-sm transition-colors duration-300">
                      Dashboard
                    </span>
                  </button>
                )}
                {isDashboard && (
                  <button
                    onClick={() => navigate('/reality-check')}
                    className="flex items-center space-x-2 backdrop-blur-sm bg-white/10 border border-white/20 hover:border-cyan-400/30 hover:bg-cyan-500/10 rounded-xl px-3 py-2 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-gray-900 group"
                    aria-label="View market reality check"
                  >
                    <div className="text-gray-300 group-hover:text-cyan-300 transition-colors duration-300">
                      <ChartBarIcon />
                    </div>
                    <span className="text-gray-300 group-hover:text-cyan-300 font-medium text-sm transition-colors duration-300">
                      Reality Check
                    </span>
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 backdrop-blur-sm bg-white/10 border border-white/20 hover:border-red-400/30 hover:bg-red-500/10 rounded-xl px-3 py-2 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-gray-900 group"
                  aria-label="Sign out"
                >
                  <div className="text-gray-300 group-hover:text-red-300 transition-colors duration-300">
                    <LogoutIcon />
                  </div>
                  <span className="text-gray-300 group-hover:text-red-300 font-medium text-sm transition-colors duration-300">
                    Sign Out
                  </span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col">
          {children}
        </main>
      </div>

      {/* Footer */}
      <footer className="relative z-10 backdrop-blur-xl bg-black/40 border-t border-white/10 py-8">
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
    </>
  );
}