

interface DisclaimerModalProps {
  isOpen: boolean;
  onAccept: () => void;
}

export function DisclaimerModal({ isOpen, onAccept }: DisclaimerModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Modal Container - Fixed height with flex layout */}
        <div className="backdrop-blur-xl bg-gradient-to-br from-gray-900/95 to-slate-900/95 border border-white/20 rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
          {/* Header - Fixed */}
          <div className="flex-shrink-0 p-4 lg:p-6 border-b border-white/10">
            <div className="text-center">
              <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-br from-yellow-400/20 to-orange-400/20 border border-yellow-400/30 rounded-2xl flex items-center justify-center mx-auto mb-3 lg:mb-4">
                <svg className="w-6 h-6 lg:w-8 lg:h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-xl lg:text-2xl xl:text-3xl font-bold text-white mb-2">
                Important Risk Disclaimer
              </h2>
              <p className="text-sm lg:text-base text-gray-300">
                Please read and acknowledge before proceeding
              </p>
            </div>
          </div>

          {/* Content - Scrollable with constrained height */}
          <div className="flex-1 overflow-y-auto p-4 lg:p-6 min-h-0">
            <div className="space-y-4 lg:space-y-6 text-gray-200 leading-relaxed">
              <div className="backdrop-blur-sm bg-red-500/10 border border-red-400/30 rounded-xl lg:rounded-2xl p-4 lg:p-6">
                <h3 className="text-lg lg:text-xl font-bold text-red-300 mb-3 lg:mb-4">Not Financial Advice</h3>
                <p className="mb-3 lg:mb-4 text-sm lg:text-base">
                  The information provided by Value Investor's Compass is for educational and informational purposes only. 
                  It does not constitute financial, investment, trading, or other professional advice. You should not treat 
                  any content as a recommendation to buy, sell, or hold any particular investment or security.
                </p>
                <p className="text-sm lg:text-base">
                  Our AI-driven analysis is a tool to assist in your research process, but it should never be the sole 
                  basis for any investment decision. Always conduct your own due diligence and consider your individual 
                  financial situation, risk tolerance, and investment objectives.
                </p>
              </div>

              <div className="backdrop-blur-sm bg-orange-500/10 border border-orange-400/30 rounded-xl lg:rounded-2xl p-4 lg:p-6">
                <h3 className="text-lg lg:text-xl font-bold text-orange-300 mb-3 lg:mb-4">Investment Risks</h3>
                <p className="mb-3 lg:mb-4 text-sm lg:text-base">
                  All investments carry inherent risks, including the potential for significant financial loss. Past 
                  performance does not guarantee future results. Market conditions, economic factors, and company-specific 
                  events can cause investment values to fluctuate dramatically.
                </p>
                <p className="text-sm lg:text-base">
                  You may lose some or all of your invested capital. Never invest money you cannot afford to lose, 
                  and ensure you understand the risks associated with any investment before proceeding.
                </p>
              </div>

              <div className="backdrop-blur-sm bg-blue-500/10 border border-blue-400/30 rounded-xl lg:rounded-2xl p-4 lg:p-6">
                <h3 className="text-lg lg:text-xl font-bold text-blue-300 mb-3 lg:mb-4">Your Responsibility</h3>
                <p className="mb-3 lg:mb-4 text-sm lg:text-base">
                  You are solely responsible for your investment decisions and their outcomes. While our analysis aims 
                  to provide valuable insights, it may contain errors, omissions, or outdated information. Market 
                  conditions change rapidly, and our analysis may not reflect the most current developments.
                </p>
                <p className="text-sm lg:text-base">
                  You acknowledge that you are using this service at your own risk and that Value Investor's Compass, 
                  its creators, and affiliates shall not be liable for any losses or damages resulting from your use 
                  of our analysis or recommendations.
                </p>
              </div>

              <div className="backdrop-blur-sm bg-green-500/10 border border-green-400/30 rounded-xl lg:rounded-2xl p-4 lg:p-6">
                <h3 className="text-lg lg:text-xl font-bold text-green-300 mb-3 lg:mb-4">Seek Professional Advice</h3>
                <p className="text-sm lg:text-base">
                  We strongly recommend consulting with a qualified financial advisor, investment professional, or 
                  certified financial planner before making any investment decisions. They can provide personalized 
                  advice based on your specific financial situation, goals, and risk tolerance.
                </p>
              </div>

              <div className="backdrop-blur-sm bg-purple-500/10 border border-purple-400/30 rounded-xl lg:rounded-2xl p-4 lg:p-6">
                <h3 className="text-lg lg:text-xl font-bold text-purple-300 mb-3 lg:mb-4">Data and Analysis Limitations</h3>
                <p className="mb-3 lg:mb-4 text-sm lg:text-base">
                  Our AI analysis is based on publicly available information and historical data. While we strive for 
                  accuracy, we cannot guarantee the completeness, accuracy, or timeliness of all information used in 
                  our analysis.
                </p>
                <p className="text-sm lg:text-base">
                  Market sentiment, technical analysis, and fundamental metrics are subject to interpretation and may 
                  not accurately predict future performance. Use our analysis as one of many tools in your investment 
                  research process.
                </p>
              </div>
            </div>
          </div>

          {/* Footer - Fixed and always visible */}
          <div className="flex-shrink-0 p-4 lg:p-6 border-t border-white/10 bg-gradient-to-br from-gray-900/95 to-slate-900/95">
            <div className="text-center">
              <p className="text-gray-400 text-xs lg:text-sm mb-4 lg:mb-6">
                By clicking "Accept and Continue," you acknowledge that you have read, understood, and agree to these terms.
              </p>
              <button
                onClick={onAccept}
                className="w-full bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 
                           text-white font-bold py-3 lg:py-4 px-6 lg:px-8 rounded-xl lg:rounded-2xl transition-all duration-300 
                           focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-gray-900
                           shadow-xl hover:shadow-2xl hover:shadow-cyan-500/25 transform hover:-translate-y-1 hover:scale-105 
                           border border-cyan-400/20 backdrop-blur-sm text-base lg:text-lg"
              >
                Accept and Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}