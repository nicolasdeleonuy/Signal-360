import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TickerSearch } from '../components/search/TickerSearch';
import { OpportunitiesView } from '../components/opportunities/OpportunitiesView';
import { useOpportunitySearch } from '../hooks/useOpportunitySearch';
import { useUserProfile } from '../hooks/useUserProfile';

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
  userCredits?: number;
}

function PremiumFeatureCard({ onPremiumClick, userCredits }: PremiumFeatureCardProps) {
  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="backdrop-blur-sm bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-purple-400/30 rounded-2xl p-6 flex-1">
        <div className="flex items-center mb-4">
          <div className="flex items-center space-x-2">
            <SparkleIcon />
            <span className="text-cyan-300 font-semibold text-lg">Premium Feature</span>
          </div>
        </div>
        <p className="text-gray-200 leading-relaxed text-lg">
          Our tireless AI scout will scan thousands of stocks to find undervalued opportunities that match strict value investing principles.
        </p>
      </div>
      
      <p className="text-xs text-gray-400 text-center mb-2">*Each search consumes 1 credit.</p>
      <button
        onClick={onPremiumClick}
        disabled={userCredits === 0}
        className={`w-full font-bold py-5 px-8 rounded-2xl transition-all duration-300 
                   focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-gray-900
                   shadow-xl hover:shadow-2xl border backdrop-blur-sm text-lg
                   ${userCredits === 0 
                     ? 'bg-gradient-to-r from-gray-600 to-gray-500 text-gray-300 cursor-not-allowed border-gray-500/20' 
                     : 'bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white hover:shadow-cyan-500/25 transform hover:-translate-y-1 hover:scale-105 border-cyan-400/20'
                   }`}
        aria-label="Discover investment opportunities - Premium feature"
      >
        <div className="flex items-center justify-center space-x-2">
          <SparkleIcon />
          <span>
            {userCredits === 0 ? 'No Credits Remaining' : 'Discover Opportunities'}
          </span>
        </div>
      </button>
    </div>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [showOpportunities, setShowOpportunities] = useState(false);
  const { runSearch, data, error, isLoading } = useOpportunitySearch();
  const { profile, decrementCredits } = useUserProfile();

  const handleTickerSelection = useCallback(async (ticker: string, _companyName: string) => {
    // Check if user has credits
    if (!profile || profile.credits <= 0) {
      alert('You need credits to perform a deep analysis.');
      return;
    }

    try {
      // Decrement credits first and wait for completion
      const success = await decrementCredits();
      if (success) {
        // Add a small delay to ensure state has propagated
        setTimeout(() => {
          navigate(`/analysis/${ticker}`);
        }, 100);
      } else {
        alert('Failed to process request. Please try again.');
      }
    } catch (error) {
      console.error('Error in handleTickerSelection:', error);
      alert('Failed to process request. Please try again.');
    }
  }, [navigate, profile, decrementCredits]);

  const handlePremiumFeatureClick = useCallback(async () => {
    // Check if user has credits
    if (!profile || profile.credits <= 0) {
      alert('Premium feature. Please upgrade to get more credits.');
      return;
    }

    try {
      // Decrement credits and run search
      const success = await decrementCredits();
      if (success) {
        setShowOpportunities(true);
        // Run the search after showing the modal with a slight delay
        setTimeout(() => {
          runSearch();
        }, 100);
      } else {
        alert('Failed to process request. Please try again.');
      }
    } catch (error) {
      console.error('Error in handlePremiumFeatureClick:', error);
      alert('Failed to process request. Please try again.');
    }
  }, [profile, decrementCredits, runSearch]);

  const handleOpportunityClick = useCallback(async (ticker: string) => {
    // Check if user has credits
    if (!profile || profile.credits <= 0) {
      alert('You need credits to perform a deep analysis.');
      return;
    }

    try {
      // Decrement credits first and wait for completion
      const success = await decrementCredits();
      if (success) {
        setShowOpportunities(false);
        // Add a small delay to ensure state has propagated
        setTimeout(() => {
          navigate(`/analysis/${ticker}`);
        }, 100);
      } else {
        alert('Failed to process request. Please try again.');
      }
    } catch (error) {
      console.error('Error in handleOpportunityClick:', error);
      alert('Failed to process request. Please try again.');
    }
  }, [navigate, profile, decrementCredits]);

  const handleCloseOpportunities = useCallback(() => {
    setShowOpportunities(false);
  }, []);



  return (
    <>
          <div className="grid grid-cols-1 lg:grid-cols-2 lg:grid-rows-1 gap-6 lg:gap-8 mb-16 lg:mb-20 flex-1 min-h-[500px] lg:min-h-[600px]">
            {/* Path 1: Go From Ticker to Thesis in Seconds */}
            <DashboardCard
              title="Go From Ticker to Thesis in Seconds"
              description="Skip hours of research. Get a clear, actionable investment verdict backed by comprehensive analysis in moments."
              isPrimary={true}
              className="relative z-10"
            >
              <div className="space-y-6 h-full flex flex-col">
                <div className="backdrop-blur-sm bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-400/30 rounded-2xl p-6 flex-1">
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
                  <p className="text-xs text-gray-400 text-center mb-2">*Each analysis consumes 1 credit.</p>
                  <TickerSearch
                    onTickerSelect={handleTickerSelection}
                    placeholder="Enter ticker (e.g., AAPL, MSFT, GOOGL)"
                    autoFocus={false}
                    className="w-full"
                  />
                </div>
              </div>
            </DashboardCard>

            {/* Path 2: Uncover Potential Bargains */}
            <DashboardCard
              title="Uncover Potential Bargains"
              description="Let our tireless AI scout save you hours of manual screening by finding undervalued companies that match strict value criteria."
            >
              <PremiumFeatureCard 
                onPremiumClick={handlePremiumFeatureClick} 
                userCredits={profile?.credits}
              />
            </DashboardCard>
          </div>

          {/* Why Choose Value Investor's Compass Section */}
          <div className="text-center">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-12 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Why Choose Value Investor's Compass?
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
                  Go Deeper, Faster
                </h3>
                <p className="text-gray-300 leading-relaxed text-base lg:text-lg">
                  Get comprehensive analysis in seconds, not hours. We combine speed with depth to accelerate your investment decisions.
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
                  A Disciplined Philosophy
                </h3>
                <p className="text-gray-300 leading-relaxed text-base lg:text-lg">
                  Our value-first approach prioritizes business fundamentals over market noise, keeping you focused on what truly matters.
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
                  Invest with Conviction
                </h3>
                <p className="text-gray-300 leading-relaxed text-base lg:text-lg">
                  Clear analysis leads to confident decisions. Know exactly why you're investing, not just what to buy.
                </p>
              </div>
            </div>
          </div>
      {/* Opportunities Modal */}
      {showOpportunities && (
        <OpportunitiesView
          onOpportunityClick={handleOpportunityClick}
          onClose={handleCloseOpportunities}
          data={data}
          error={error}
          isLoading={isLoading}
        />
      )}
    </>
  );
}

export default DashboardPage;