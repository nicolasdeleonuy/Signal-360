import { OpportunityCard } from './OpportunityCard';
import { OpportunitySearchResponse } from '../../services/analysisService';

interface OpportunitiesViewProps {
  onOpportunityClick: (ticker: string) => void;
  onClose: () => void;
  data: OpportunitySearchResponse | null;
  error: string | null;
  isLoading: boolean;
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center space-x-2">
      <div className="w-8 h-8 border-4 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin"></div>
      <span className="text-cyan-300 font-medium">Scanning the market for opportunities...</span>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
  );
}

export function OpportunitiesView({ onOpportunityClick, onClose, data, error, isLoading }: OpportunitiesViewProps) {

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Modal Container */}
        <div className="backdrop-blur-xl bg-gradient-to-br from-gray-900/95 to-slate-900/95 border border-white/20 rounded-3xl shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-400/20 to-purple-400/20 border border-cyan-400/30 rounded-2xl flex items-center justify-center">
                <div className="text-cyan-400">
                  <SearchIcon />
                </div>
              </div>
              <div>
                <h2 className="text-2xl lg:text-3xl font-bold text-white">
                  Investment Opportunities
                </h2>
                <p className="text-gray-300">
                  AI-discovered value opportunities in the US market
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-white/10 hover:bg-red-500/20 border border-white/20 hover:border-red-400/30 rounded-xl flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-gray-900 group"
              aria-label="Close opportunities view"
            >
              <div className="text-gray-400 group-hover:text-red-300 transition-colors duration-300">
                <CloseIcon />
              </div>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-16 space-y-6">
                <LoadingSpinner />
                <div className="text-center space-y-2">
                  <p className="text-gray-300 text-lg">
                    Scanning the market for opportunities...
                  </p>
                  <p className="text-gray-400 text-sm">
                    This may take up to 30 seconds as our AI performs a deep analysis.
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="flex flex-col items-center justify-center py-16 space-y-6">
                <div className="text-red-400">
                  <AlertIcon />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-semibold text-red-300">
                    Search Failed
                  </h3>
                  <p className="text-gray-300 max-w-md">
                    {error}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 
                           text-white font-medium py-3 px-6 rounded-xl transition-all duration-300 
                           focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-gray-900"
                >
                  Close
                </button>
              </div>
            )}

            {data && data.ideas && data.ideas.length > 0 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <p className="text-gray-300 text-lg">
                    Found <span className="text-cyan-300 font-semibold">{data.ideas.length}</span> promising opportunities
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {data.ideas.map((opportunity, index) => (
                    <OpportunityCard
                      key={`${opportunity.ticker}-${index}`}
                      opportunity={opportunity}
                      onClick={onOpportunityClick}
                    />
                  ))}
                </div>

                <div className="mt-8 p-4 backdrop-blur-sm bg-cyan-500/10 border border-cyan-400/20 rounded-xl">
                  <p className="text-cyan-200 text-sm text-center">
                    💡 <strong>Tip:</strong> Click on any opportunity to get a detailed comprehensive analysis
                  </p>
                </div>
              </div>
            )}

            {data && data.ideas && data.ideas.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 space-y-6">
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-400/20 to-orange-400/20 border border-yellow-400/30 rounded-2xl flex items-center justify-center">
                  <div className="text-yellow-400">
                    <SearchIcon />
                  </div>
                </div>
                <div className="text-center space-y-4 max-w-md">
                  <h3 className="text-2xl font-bold text-white">
                    No Opportunities Found
                  </h3>
                  <p className="text-gray-300 leading-relaxed">
                    Our rigorous filter found no companies matching our strict criteria at this time. This is the hallmark of a disciplined investment process.
                  </p>
                  <div className="backdrop-blur-sm bg-yellow-500/10 border border-yellow-400/20 rounded-xl p-4">
                    <p className="text-yellow-200 text-sm">
                      💡 <strong>Remember:</strong> Quality over quantity. We'd rather find nothing than recommend mediocre investments.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}