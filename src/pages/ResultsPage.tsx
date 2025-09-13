import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSignalAnalysis } from '../hooks/useSignalAnalysis';
import InteractiveDCF from '../components/analysis/InteractiveDCF';

type TabType = 'Verdict' | 'Value Analysis' | 'Market Sentiment' | 'Technical Timing';

// Helper function to get score color based on value
const getScoreColor = (score: number) => {
  if (score >= 80) return 'from-green-400 to-emerald-500';
  if (score >= 60) return 'from-yellow-400 to-orange-500';
  if (score >= 40) return 'from-orange-400 to-red-500';
  return 'from-red-400 to-red-600';
};





const ResultsPage: React.FC = () => {
  const { ticker } = useParams<{ ticker: string }>();
  const [activeTab, setActiveTab] = useState<TabType>('Verdict');
  const { data, isLoading, error, runAnalysis } = useSignalAnalysis();

  // Trigger analysis when component mounts or ticker changes
  useEffect(() => {
    if (ticker) {
      runAnalysis(ticker, 'investment', '1M');
    }
  }, [runAnalysis, ticker]);

  const tabs: TabType[] = ['Verdict', 'Value Analysis', 'Market Sentiment', 'Technical Timing'];

  const renderLoadingState = () => (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
      <div className="text-center max-w-2xl mx-auto px-4">
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-12 shadow-2xl">
          {/* Loading Animation */}
          <div className="mb-8">
            <div className="w-20 h-20 mx-auto mb-6">
              <div className="w-full h-full border-4 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin"></div>
            </div>
          </div>
          
          <h2 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent mb-6">
            Analyzing {ticker?.toUpperCase()}...
          </h2>
          
          <p className="text-gray-300 text-lg lg:text-xl leading-relaxed mb-8">
            Our AI is performing a comprehensive 360° analysis of your selected asset. 
            This includes fundamental metrics, technical indicators, ESG factors, and market sentiment.
          </p>
          
          <div className="flex items-center justify-center space-x-2 text-cyan-400">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce delay-100"></div>
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce delay-200"></div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderErrorState = () => (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
      <div className="text-center max-w-2xl mx-auto px-4">
        <div className="backdrop-blur-xl bg-red-500/10 border border-red-400/30 rounded-3xl p-12 shadow-2xl">
          <div className="w-16 h-16 mx-auto mb-6 text-red-400">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          
          <h2 className="text-3xl lg:text-4xl font-bold text-red-400 mb-6">
            Analysis Error
          </h2>
          
          <p className="text-gray-300 text-lg leading-relaxed mb-6">
            We encountered an issue while analyzing {ticker?.toUpperCase()}. Please try again or contact support if the problem persists.
          </p>
          
          <div className="backdrop-blur-sm bg-red-500/20 border border-red-400/30 rounded-2xl p-4 mb-6">
            <p className="text-red-200 text-sm font-mono">
              {error}
            </p>
          </div>
          
          <button
            onClick={() => ticker && runAnalysis(ticker, 'investment', '1M')}
            className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 
                       text-white font-bold py-3 px-8 rounded-2xl transition-all duration-300 
                       focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-gray-900
                       shadow-xl hover:shadow-2xl hover:shadow-red-500/25 transform hover:-translate-y-1"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    if (!data) {
      return (
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl">
          <p className="text-gray-300 text-lg leading-relaxed">
            Analysis data is not available.
          </p>
        </div>
      );
    }

    switch (activeTab) {
      case 'Verdict':
        const verdict = data.verdict;
        return (
          <div className="space-y-8">
            {/* Header with Profile */}
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl">
              <h3 className="text-3xl font-bold text-white mb-3 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                {verdict.synthesisProfile}
              </h3>
              <p className="text-lg text-gray-400 mb-6">
                The final synthesized verdict from our Head of Strategy.
              </p>
              
              {/* Score and Recommendation Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Final Score */}
                <div className="text-center">
                  <div className="mb-4">
                    <span className="text-sm font-medium text-gray-400 uppercase tracking-wide">
                      Investment Score
                    </span>
                  </div>
                  <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-r ${getScoreColor(verdict.synthesisScore)} shadow-2xl mb-4`}>
                    <span className="text-3xl font-bold text-white">
                      {verdict.synthesisScore}
                    </span>
                  </div>
                  <p className="text-gray-300 text-sm">
                    Out of 100
                  </p>
                </div>

                {/* Recommendation - Using score-based recommendation since it's not in schema */}
                <div className="text-center">
                  <div className="mb-4">
                    <span className="text-sm font-medium text-gray-400 uppercase tracking-wide">
                      Recommendation
                    </span>
                  </div>
                  <div className={`inline-block px-6 py-3 rounded-2xl bg-gradient-to-r ${getScoreColor(verdict.synthesisScore)} shadow-2xl mb-4`}>
                    <span className="text-xl font-bold text-white">
                      {verdict.synthesisScore >= 70 ? 'BUY' : verdict.synthesisScore >= 40 ? 'HOLD' : 'SELL'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-2xl p-6">
                <h4 className="text-lg font-semibold text-white mb-3">Executive Summary</h4>
                <p className="text-gray-300 leading-relaxed">
                  {verdict.strategistVerdict}
                </p>
              </div>
            </div>

            {/* Convergence and Divergence Factors */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Convergence Factors (Strengths) */}
              {verdict.convergenceFactors.length > 0 && (
                <div className="backdrop-blur-xl bg-green-500/10 border border-green-400/30 rounded-3xl p-8 shadow-2xl">
                  <div className="flex items-center mb-6">
                    <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h4 className="text-xl font-bold text-green-400">Strengths & Opportunities</h4>
                  </div>
                  <ul className="space-y-3">
                    {verdict.convergenceFactors.map((factor, index) => (
                      <li key={index} className="flex items-start">
                        <div className="w-2 h-2 bg-green-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                        <span className="text-gray-200 leading-relaxed">{factor}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Divergence Factors (Risks) */}
              {verdict.divergenceFactors.length > 0 && (
                <div className="backdrop-blur-xl bg-red-500/10 border border-red-400/30 rounded-3xl p-8 shadow-2xl">
                  <div className="flex items-center mb-6">
                    <div className="w-8 h-8 bg-gradient-to-r from-red-400 to-red-600 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <h4 className="text-xl font-bold text-red-400">Risks & Concerns</h4>
                  </div>
                  <ul className="space-y-3">
                    {verdict.divergenceFactors.map((factor, index) => (
                      <li key={index} className="flex items-start">
                        <div className="w-2 h-2 bg-red-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                        <span className="text-gray-200 leading-relaxed">{factor}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        );
      case 'Value Analysis':
        const fundamental = data.fundamental;
        return (
          <div className="space-y-8">
            {/* Business Overview */}
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl">
              <h3 className="text-3xl font-bold text-white mb-3 bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                Value Investor's Compass
              </h3>
              <p className="text-lg text-gray-400 mb-6">
                Deep-dive into business quality and long-term valuation.
              </p>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Business Model */}
                <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-2xl p-6">
                  <h4 className="text-lg font-semibold text-green-400 mb-3">Business Model</h4>
                  <p className="text-gray-300 leading-relaxed">{fundamental.businessModel}</p>
                </div>
                
                {/* Economic Moat */}
                <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-2xl p-6">
                  <h4 className="text-lg font-semibold text-green-400 mb-3">Economic Moat</h4>
                  <p className="text-gray-300 leading-relaxed">{fundamental.economicMoat}</p>
                </div>
              </div>
              
              {/* Management Review */}
              <div className="mt-6 backdrop-blur-sm bg-white/5 border border-white/10 rounded-2xl p-6">
                <h4 className="text-lg font-semibold text-green-400 mb-3">Management Review</h4>
                <p className="text-gray-300 leading-relaxed">{fundamental.managementReview}</p>
              </div>
            </div>

            {/* Financial Ratios */}
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl">
              <h4 className="text-2xl font-bold text-green-400 mb-6">Key Financial Ratios</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(fundamental.keyFinancialRatios).map(([ratioName, ratioData]) => (
                  <div key={ratioName} className="backdrop-blur-sm bg-green-500/10 border border-green-400/30 rounded-2xl p-6">
                    <h5 className="text-lg font-semibold text-green-300 mb-3">{ratioName}</h5>
                    <div className="text-2xl font-bold text-white mb-2">{ratioData.value}</div>
                    <p className="text-gray-300 text-sm leading-relaxed">{ratioData.explanation}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Interactive DCF Analysis */}
            <InteractiveDCF initialData={fundamental} currentPrice={data.marketData.currentPrice} />
          </div>
        );
      case 'Market Sentiment':
        const sentiment = data.sentiment;
        return (
          <div className="space-y-8">
            {/* Sentiment Overview */}
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl">
              <h3 className="text-3xl font-bold text-white mb-3 bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                Eco Corporativo
              </h3>
              <p className="text-lg text-gray-400 mb-6">
                Analysis of news, social media, and market sentiment.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Sentiment Score */}
                <div className="text-center">
                  <div className="mb-4">
                    <span className="text-sm font-medium text-gray-400 uppercase tracking-wide">
                      Market Sentiment Score
                    </span>
                  </div>
                  <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-r ${getScoreColor(sentiment.sentimentScore)} shadow-2xl mb-4`}>
                    <span className="text-3xl font-bold text-white">
                      {sentiment.sentimentScore}
                    </span>
                  </div>
                  <p className="text-gray-300 text-sm">
                    Out of 100
                  </p>
                </div>

                {/* Sentiment Trend */}
                <div className="text-center">
                  <div className="mb-4">
                    <span className="text-sm font-medium text-gray-400 uppercase tracking-wide">
                      Sentiment Trend
                    </span>
                  </div>
                  <div className={`inline-block px-6 py-3 rounded-2xl ${
                    sentiment.sentimentTrend === 'Improving' ? 'bg-gradient-to-r from-green-400 to-emerald-500' :
                    sentiment.sentimentTrend === 'Worsening' ? 'bg-gradient-to-r from-red-400 to-red-600' :
                    'bg-gradient-to-r from-yellow-400 to-orange-500'
                  } shadow-2xl mb-4`}>
                    <span className="text-xl font-bold text-white">
                      {sentiment.sentimentTrend}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Key Echoes */}
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl">
              <h4 className="text-2xl font-bold text-blue-400 mb-6">Key Market Echoes</h4>
              <div className="space-y-6">
                {sentiment.keyEchoes.map((echo, index) => (
                  <div key={index} className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="text-lg font-semibold text-blue-300">{echo.source}</h5>
                      <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        echo.individualSentimentScore > 20 ? 'bg-green-500/20 text-green-400' :
                        echo.individualSentimentScore < -20 ? 'bg-red-500/20 text-red-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {echo.individualSentimentScore > 0 ? '+' : ''}{echo.individualSentimentScore}
                      </div>
                    </div>
                    <p className="text-gray-300 leading-relaxed">{echo.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'Technical Timing':
        const technical = data.technical;
        return (
          <div className="space-y-8">
            {/* Technical Overview */}
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl">
              <h3 className="text-3xl font-bold text-white mb-3 bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                QuantumLeap Speculator
              </h3>
              <p className="text-lg text-gray-400 mb-6">
                Technical analysis to identify opportune entry points for investors.
              </p>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Overall Trend */}
                <div className="text-center">
                  <div className="mb-4">
                    <span className="text-sm font-medium text-gray-400 uppercase tracking-wide">
                      Overall Trend
                    </span>
                  </div>
                  <div className={`inline-block px-6 py-3 rounded-2xl ${
                    technical.overallTrend === 'Uptrend' ? 'bg-gradient-to-r from-green-400 to-emerald-500' :
                    technical.overallTrend === 'Downtrend' ? 'bg-gradient-to-r from-red-400 to-red-600' :
                    'bg-gradient-to-r from-yellow-400 to-orange-500'
                  } shadow-2xl mb-4`}>
                    <span className="text-xl font-bold text-white">
                      {technical.overallTrend}
                    </span>
                  </div>
                </div>

                {/* Support Level */}
                <div className="text-center">
                  <div className="mb-4">
                    <span className="text-sm font-medium text-gray-400 uppercase tracking-wide">
                      Support Level
                    </span>
                  </div>
                  <div className="inline-block px-6 py-3 rounded-2xl bg-gradient-to-r from-green-400 to-emerald-500 shadow-2xl mb-4">
                    <span className="text-xl font-bold text-white">
                      {technical.keyLevels.support}
                    </span>
                  </div>
                </div>

                {/* Resistance Level */}
                <div className="text-center">
                  <div className="mb-4">
                    <span className="text-sm font-medium text-gray-400 uppercase tracking-wide">
                      Resistance Level
                    </span>
                  </div>
                  <div className="inline-block px-6 py-3 rounded-2xl bg-gradient-to-r from-red-400 to-red-600 shadow-2xl mb-4">
                    <span className="text-xl font-bold text-white">
                      {technical.keyLevels.resistance}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Technical Summary */}
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl">
              <h4 className="text-2xl font-bold text-orange-400 mb-6">Technical Analysis Summary</h4>
              <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-2xl p-6">
                <p className="text-gray-300 text-lg leading-relaxed">{technical.technicalSummary}</p>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // Handle different analysis states
  if (isLoading) {
    return renderLoadingState();
  }

  if (error) {
    return renderErrorState();
  }

  if (!data) {
    return renderLoadingState(); // Show loading if no data yet
  }

  // Render the full tabbed interface when analysis is complete
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
          {/* Page Title */}
          <div className="text-center mb-8">
            <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-cyan-300 bg-clip-text text-transparent mb-4">
              Analysis Results
            </h1>
            <p className="text-gray-300 text-lg lg:text-xl mb-8">
              Comprehensive 360° analysis for {ticker?.toUpperCase()}
            </p>
          </div>

          {/* Live Price Banner */}
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-6 shadow-2xl mb-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Company Information */}
              <div className="text-center sm:text-left">
                <h2 className="text-2xl lg:text-3xl font-bold text-white mb-1">
                  {data.marketData.companyName}
                </h2>
                <p className="text-lg text-gray-300 font-medium">
                  ({data.ticker.toUpperCase()})
                </p>
              </div>
              
              {/* Current Price */}
              <div className="text-center sm:text-right">
                <div className="mb-2">
                  <span className="text-sm font-medium text-gray-400 uppercase tracking-wide">
                    Current Price
                  </span>
                </div>
                <div className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                  ${data.marketData.currentPrice.toFixed(2)}
                </div>
                <p className="text-sm text-gray-400 mt-1">
                  Live Market Price
                </p>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="mb-8">
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-2 shadow-2xl">
              <div className="flex flex-wrap gap-2">
                {tabs.map((tab) => {
                  // Define subtitles for all tabs
                  const getTabSubtitle = (tabName: TabType) => {
                    switch (tabName) {
                      case 'Verdict':
                        return 'Synthesized verdict and final recommendation.';
                      case 'Value Analysis':
                        return 'Deep-dive into business quality and intrinsic value.';
                      case 'Market Sentiment':
                        return 'Analysis of news and social sentiment for context.';
                      case 'Technical Timing':
                        return 'Context on the current price trend and key technical levels.';
                      default:
                        return null;
                    }
                  };

                  const subtitle = getTabSubtitle(tab);

                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`
                        flex-1 min-w-0 px-6 py-4 rounded-xl font-semibold text-sm lg:text-base transition-all duration-300 
                        focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-gray-900
                        ${activeTab === tab
                          ? 'bg-gradient-to-r from-cyan-500/30 to-purple-500/30 border border-cyan-400/50 text-white shadow-lg shadow-cyan-500/25 transform scale-105'
                          : 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20 hover:text-white hover:scale-102'
                        }
                      `}
                    >
                      <div className="text-center">
                        <div className="font-semibold">{tab}</div>
                        <div className="text-xs mt-1 opacity-75 font-normal leading-tight">
                          {subtitle}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

        {/* Tab Content */}
        <div>
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default ResultsPage;