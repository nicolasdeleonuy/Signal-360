import { useCallback } from 'react';
import { useAuth } from '../contexts/auth-context';
import { useSignalAnalysis } from '../hooks/useSignalAnalysis';
import { TickerSearch } from '../components/search/TickerSearch';

// Professional SVG Icons with electric accent colors
function AnalysisIcon() {
  return (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function VisionIcon() {
  return (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9-9a9 9 0 00-9 9m0 0a9 9 0 019-9" />
    </svg>
  );
}

function ConfidenceIcon() {
  return (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l1.5 1.5L5 6l-1.5-1.5L5 3zM19 3l1.5 1.5L19 6l-1.5-1.5L19 3zM12 12l1.5 1.5L12 15l-1.5-1.5L12 12zM5 21l1.5-1.5L5 18l-1.5 1.5L5 21zM19 21l1.5-1.5L19 18l-1.5 1.5L19 21z" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}

interface DashboardCardProps {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
  isPrimary?: boolean;
}

function DashboardCard({ title, description, children, className = '', isPrimary = false }: DashboardCardProps) {
  return (
    <div className={`
      relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl 
      shadow-2xl hover:shadow-cyan-500/25 hover:border-cyan-400/30 
      transition-all duration-500 ease-out p-8 h-full flex flex-col
      hover:-translate-y-2 hover:bg-white/15 group
      ${isPrimary ? 'ring-1 ring-cyan-400/30' : ''}
      ${className}
    `}>
      {/* Glassmorphism gradient overlay */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      
      <div className="relative z-10 mb-8">
        <h2 className="text-2xl lg:text-3xl font-bold text-white mb-4 group-hover:text-cyan-100 transition-colors duration-300">
          {title}
        </h2>
        <p className="text-gray-300 leading-relaxed text-lg">
          {description}
        </p>
      </div>
      
      <div className="relative z-10 flex-1 flex flex-col justify-between">
        {children}
      </div>
    </div>
  );
}

interface PremiumFeatureCardProps {
  onPremiumClick: () => void;
}

function PremiumFeatureCard({ onPremiumClick }: PremiumFeatureCardProps) {
  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="backdrop-blur-sm bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-purple-400/30 rounded-2xl p-6 flex-1">
        <div className="flex items-center space-x-3 mb-4">
          <div className="flex items-center space-x-2">
            <SparkleIcon />
            <span className="text-cyan-300 font-semibold text-lg">Premium Feature</span>
          </div>
          <span className="bg-gradient-to-r from-purple-400/30 to-cyan-400/30 backdrop-blur-sm text-cyan-200 text-xs px-4 py-2 rounded-full font-medium border border-cyan-400/20">
            Coming Soon
          </span>
        </div>
        <p className="text-gray-200 leading-relaxed text-lg">
          Our AI will scan thousands of stocks to find opportunities that match value investing principles.
        </p>
      </div>
      
      <button
        onClick={onPremiumClick}
        className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 
                   text-white font-bold py-5 px-8 rounded-2xl transition-all duration-300 
                   focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-gray-900
                   shadow-xl hover:shadow-2xl hover:shadow-cyan-500/25 transform hover:-translate-y-1 hover:scale-105
                   border border-cyan-400/20 backdrop-blur-sm text-lg"
        aria-label="Discover investment opportunities - Premium feature"
      >
        <div className="flex items-center justify-center space-x-2">
          <SparkleIcon />
          <span>Discover Opportunities</span>
        </div>
      </button>
    </div>
  );
}

export function DashboardPage() {
  const { user, signOut } = useAuth();
  const { runAnalysis } = useSignalAnalysis();

  const handleTickerSelection = useCallback(async (ticker: string, _companyName: string) => {
    try {
      // Use default investment goal and timeframe for the guided experience
      await runAnalysis(ticker, 'investment', '1M');
    } catch (error) {
      console.error('Analysis error:', error);
    }
  }, [runAnalysis]);

  const handlePremiumFeatureClick = useCallback(() => {
    console.log('Premium feature clicked');
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [signOut]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black flex flex-col relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-cyan-400/20 to-purple-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-purple-400/20 to-cyan-600/20 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-cyan-400/10 to-purple-600/10 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 flex flex-col">
        {/* Header with Logo */}
        <header className="mb-12 lg:mb-16">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center space-x-4 mb-4 sm:mb-0">
              {/* Signal-360 Logo */}
              <div className="relative">
                <img 
                  src="/logos/signal-360-logo.png" 
                  alt="Signal-360 Logo" 
                  className="w-14 h-14 lg:w-16 lg:h-16"
                  onError={(e) => {
                    // Fallback to gradient placeholder if image fails to load
                    e.currentTarget.style.display = 'none';
                    (e.currentTarget.nextElementSibling as HTMLElement)!.style.display = 'flex';
                  }}
                />
                <div className="w-14 h-14 lg:w-16 lg:h-16 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl hidden">
                  <span className="text-white font-bold text-xl lg:text-2xl">S</span>
                </div>
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-cyan-300 bg-clip-text text-transparent">
                  Signal-360
                </h1>
                <p className="text-lg lg:text-xl text-gray-300 font-medium">
                  Your AI-Powered Investment Co-Pilot
                </p>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                <div className="backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl px-4 py-2">
                  <span className="text-gray-200 font-medium text-sm lg:text-base">
                    Welcome, {user?.email}
                  </span>
                </div>
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

        {/* Main Content - Two Path Cards */}
        <main className="flex-1 flex flex-col">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mb-16 lg:mb-20 flex-1 min-h-[500px] lg:min-h-[600px]">
            {/* Path 1: Investigate Like a Pro */}
            <DashboardCard
              title="Investigate Like a Pro"
              description="Perform a 360-degree analysis on any stock or asset you have in mind"
              isPrimary={true}
            >
              <div className="space-y-6">
                <div className="backdrop-blur-sm bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-400/30 rounded-2xl p-6">
                  <h3 className="font-bold text-cyan-200 mb-4 text-lg">
                    What you'll get:
                  </h3>
                  <ul className="text-gray-200 space-y-3">
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full mr-4 flex-shrink-0"></span>
                      <span className="text-base">Fundamental analysis with key metrics</span>
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-gradient-to-r from-purple-400 to-cyan-400 rounded-full mr-4 flex-shrink-0"></span>
                      <span className="text-base">Technical indicators and trends</span>
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full mr-4 flex-shrink-0"></span>
                      <span className="text-base">ESG and sentiment analysis</span>
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-gradient-to-r from-purple-400 to-cyan-400 rounded-full mr-4 flex-shrink-0"></span>
                      <span className="text-base">AI-powered investment verdict</span>
                    </li>
                  </ul>
                </div>
                <div className="mt-auto">
                  <TickerSearch
                    onTickerSelect={handleTickerSelection}
                    placeholder="Enter ticker (e.g., AAPL, MSFT, GOOGL)"
                    autoFocus={false}
                    className="w-full"
                  />
                </div>
              </div>
            </DashboardCard>

            {/* Path 2: Find Your Next Great Investment */}
            <DashboardCard
              title="Find Your Next Great Investment"
              description="Use our AI to scan the market and discover promising companies based on value investing principles"
            >
              <PremiumFeatureCard onPremiumClick={handlePremiumFeatureClick} />
            </DashboardCard>
          </div>

          {/* Why Choose Signal-360 Section */}
          <div className="text-center">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-12 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Why Choose Signal-360?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              {/* Deep Analysis Card */}
              <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 hover:bg-white/15 hover:border-cyan-400/30 hover:shadow-2xl hover:shadow-cyan-500/25 transition-all duration-500 hover:-translate-y-2 group cursor-pointer">
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-400/20 to-purple-400/20 border border-cyan-400/30 rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform duration-300">
                  <div className="text-cyan-400 group-hover:text-cyan-300 transition-colors duration-300">
                    <AnalysisIcon />
                  </div>
                </div>
                <h3 className="text-xl lg:text-2xl font-bold text-white mb-4 group-hover:text-cyan-100 transition-colors duration-300">
                  Deep Analysis, in Seconds
                </h3>
                <p className="text-gray-300 leading-relaxed text-base lg:text-lg">
                  Save hours of research. We distill financial data into clear, actionable insights for you.
                </p>
              </div>

              {/* 360° Vision Card */}
              <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 hover:bg-white/15 hover:border-purple-400/30 hover:shadow-2xl hover:shadow-purple-500/25 transition-all duration-500 hover:-translate-y-2 group cursor-pointer">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-400/20 to-cyan-400/20 border border-purple-400/30 rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform duration-300">
                  <div className="text-purple-400 group-hover:text-purple-300 transition-colors duration-300">
                    <VisionIcon />
                  </div>
                </div>
                <h3 className="text-xl lg:text-2xl font-bold text-white mb-4 group-hover:text-purple-100 transition-colors duration-300">
                  360° Vision
                </h3>
                <p className="text-gray-300 leading-relaxed text-base lg:text-lg">
                  We merge fundamental, technical, and sentiment analysis for a complete picture of any asset.
                </p>
              </div>

              {/* Invest with Confidence Card */}
              <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 hover:bg-white/15 hover:border-cyan-400/30 hover:shadow-2xl hover:shadow-cyan-500/25 transition-all duration-500 hover:-translate-y-2 group cursor-pointer">
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-400/20 to-purple-400/20 border border-cyan-400/30 rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform duration-300">
                  <div className="text-cyan-400 group-hover:text-cyan-300 transition-colors duration-300">
                    <ConfidenceIcon />
                  </div>
                </div>
                <h3 className="text-xl lg:text-2xl font-bold text-white mb-4 group-hover:text-cyan-100 transition-colors duration-300">
                  Invest with Confidence
                </h3>
                <p className="text-gray-300 leading-relaxed text-base lg:text-lg">
                  Make smarter decisions with an AI analyst by your side.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Footer with Vortex Branding */}
      <footer className="relative z-10 backdrop-blur-xl bg-black/40 border-t border-white/10 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center space-x-4">
            <span className="text-gray-400 text-sm lg:text-base">Created by</span>
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
                  className="w-10 h-10"
                  onError={(e) => {
                    // Fallback to gradient placeholder if image fails to load
                    e.currentTarget.style.display = 'none';
                    (e.currentTarget.nextElementSibling as HTMLElement)!.style.display = 'flex';
                  }}
                />
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg hidden">
                  <span className="text-white font-bold text-sm">V</span>
                </div>
              </div>
              <span className="text-gray-200 font-semibold text-sm lg:text-base group-hover:text-white transition-colors duration-300">
                Vortex Labs
              </span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default DashboardPage;