
import { KeyMetricCard } from '../components/ui/KeyMetricCard';
import { HistoricalChart } from '../components/reality-check/HistoricalChart';

// Historical S&P 500 data (approximate values reflecting major market trends)
export const historicalData = [
  { year: "2000", value: 1469 },
  { year: "2001", value: 1148 },
  { year: "2002", value: 879 },
  { year: "2003", value: 1112 },
  { year: "2004", value: 1211 },
  { year: "2005", value: 1248 },
  { year: "2006", value: 1418 },
  { year: "2007", value: 1468 },
  { year: "2008", value: 903 },
  { year: "2009", value: 1115 },
  { year: "2010", value: 1257 },
  { year: "2011", value: 1257 },
  { year: "2012", value: 1426 },
  { year: "2013", value: 1848 },
  { year: "2014", value: 2059 },
  { year: "2015", value: 2044 },
  { year: "2016", value: 2239 },
  { year: "2017", value: 2674 },
  { year: "2018", value: 2507 },
  { year: "2019", value: 3231 },
  { year: "2020", value: 3756 },
  { year: "2021", value: 4766 },
  { year: "2022", value: 3840 },
  { year: "2023", value: 4769 },
  { year: "2024", value: 5200 }
];

// Icon Components
function TrendUpIcon() {
  return (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function TrendDownIcon() {
  return (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

export function RealityCheckPage() {
  return (
    <>
      {/* Page Title */}
      <div className="text-center mb-12">
        <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-cyan-300 bg-clip-text text-transparent mb-6">
          Reality Check: Market History
        </h1>
        <p className="text-xl lg:text-2xl text-gray-300 leading-relaxed max-w-4xl mx-auto">
          Before making investment decisions, it's crucial to understand what the market has historically delivered. 
          These metrics from the S&P 500 provide essential context for your expectations.
        </p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
        <KeyMetricCard
          title="Average Annual Return"
          value="~10%"
          description="Historical average annual return of the S&P 500 over the past 90+ years, including dividends and adjusted for inflation."
          icon={<TrendUpIcon />}
          accentColor="cyan"
        />
        
        <KeyMetricCard
          title="Best Year Performance"
          value="+54%"
          description="The S&P 500's best single-year performance was in 1954, demonstrating the market's potential for exceptional years."
          icon={<StarIcon />}
          accentColor="green"
        />
        
        <KeyMetricCard
          title="Worst Year Performance"
          value="-37%"
          description="The worst single-year decline occurred in 2008 during the financial crisis, showing the importance of risk management."
          icon={<TrendDownIcon />}
          accentColor="orange"
        />
        
        <KeyMetricCard
          title="Recovery Time"
          value="~3 Years"
          description="Average time for the market to recover from major drawdowns and reach new highs, emphasizing the value of patience."
          icon={<ClockIcon />}
          accentColor="purple"
        />
      </div>

      {/* Historical Chart */}
      <div className="mb-16">
        <HistoricalChart data={historicalData} />
      </div>

      {/* Educational Content */}
      <div className="space-y-8">
        {/* Key Insights */}
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl">
          <h2 className="text-3xl font-bold text-white mb-6 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            Key Investment Insights
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-xl font-semibold text-cyan-400 mb-4">Time in Market Beats Timing the Market</h3>
              <p className="text-gray-300 leading-relaxed">
                Despite short-term volatility, the S&P 500 has delivered positive returns over every 20-year period in history. 
                Consistent investing often outperforms trying to time market peaks and valleys.
              </p>
            </div>
            
            <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-xl font-semibold text-purple-400 mb-4">Volatility is Normal</h3>
              <p className="text-gray-300 leading-relaxed">
                Market corrections of 10-20% occur regularly, and bear markets happen every few years. 
                Understanding this helps maintain perspective during inevitable downturns.
              </p>
            </div>
            
            <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-xl font-semibold text-green-400 mb-4">Compound Growth is Powerful</h3>
              <p className="text-gray-300 leading-relaxed">
                A 10% average annual return means your investment doubles approximately every 7 years. 
                This compounding effect becomes more pronounced over longer time horizons.
              </p>
            </div>
            
            <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-xl font-semibold text-orange-400 mb-4">Diversification Matters</h3>
              <p className="text-gray-300 leading-relaxed">
                The S&P 500 represents 500 of the largest U.S. companies across various sectors. 
                This built-in diversification helps reduce single-stock risk while capturing market growth.
              </p>
            </div>
          </div>
        </div>

        {/* Historical Context */}
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl">
          <h2 className="text-3xl font-bold text-white mb-6 bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            Historical Context
          </h2>
          <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-2xl p-6">
            <p className="text-gray-300 text-lg leading-relaxed mb-6">
              These statistics are based on over 90 years of S&P 500 data, spanning multiple economic cycles, 
              wars, recessions, technological revolutions, and market crashes. The consistency of long-term returns 
              despite short-term volatility demonstrates the resilience of diversified equity investing.
            </p>
            <div className="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-400/30 rounded-2xl p-4">
              <p className="text-cyan-200 font-medium text-center">
                <strong>Remember:</strong> Past performance does not guarantee future results, but historical data 
                provides valuable context for setting realistic expectations and maintaining discipline during market cycles.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default RealityCheckPage;