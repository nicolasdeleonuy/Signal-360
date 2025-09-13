import { Opportunity } from '../../services/analysisService';

interface OpportunityCardProps {
  opportunity: Opportunity;
  onClick: (ticker: string) => void;
}

function TrendingUpIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

export function OpportunityCard({ opportunity, onClick }: OpportunityCardProps) {
  const handleClick = () => {
    onClick(opportunity.ticker);
  };

  return (
    <div 
      onClick={handleClick}
      className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 
                 hover:bg-white/15 hover:border-cyan-400/30 hover:shadow-2xl hover:shadow-cyan-500/25 
                 transition-all duration-300 cursor-pointer group hover:-translate-y-1"
    >
      {/* Header with ticker and trending icon */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-400/20 to-purple-400/20 border border-cyan-400/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
            <div className="text-cyan-400 group-hover:text-cyan-300 transition-colors duration-300">
              <TrendingUpIcon />
            </div>
          </div>
          <div>
            <h3 className="text-xl font-bold text-white group-hover:text-cyan-100 transition-colors duration-300">
              {opportunity.ticker}
            </h3>
            <p className="text-gray-400 text-sm">
              {opportunity.companyName}
            </p>
          </div>
        </div>
        <div className="text-gray-400 group-hover:text-cyan-300 transition-colors duration-300 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300">
          <ArrowRightIcon />
        </div>
      </div>

      {/* Opportunity thesis */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-cyan-300 uppercase tracking-wide">
          Investment Thesis
        </h4>
        <p className="text-gray-200 leading-relaxed text-sm">
          {opportunity.reason}
        </p>
      </div>

      {/* Call to action hint with credit cost */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400 group-hover:text-cyan-300 transition-colors duration-300">
            Click to analyze {opportunity.ticker} in detail →
          </p>
          <div className="flex items-center space-x-1 text-xs text-cyan-400 font-medium">
            <span>1 Credit</span>
          </div>
        </div>
      </div>
    </div>
  );
}