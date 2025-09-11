import React from 'react';
import { InvestmentAnalysisResponse } from '../services/analysisService';

interface DashboardProps {
  analysisResult: InvestmentAnalysisResponse;
  analysisType: 'investment' | 'trading';
  timeframe?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ analysisResult, analysisType, timeframe }) => {
  const { ticker, marketData, fundamental, sentiment, technical, verdict } = analysisResult;

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  // Removed unused function getScoreBgColor

  const getRecommendationColor = (recommendation: string): string => {
    switch (recommendation) {
      case 'Strong Buy': return 'text-green-700 bg-green-100';
      case 'Buy': return 'text-green-600 bg-green-50';
      case 'Hold': return 'text-yellow-600 bg-yellow-50';
      case 'Sell': return 'text-red-600 bg-red-50';
      case 'Strong Sell': return 'text-red-700 bg-red-100';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{ticker}</h1>
            <p className="text-xl text-gray-600">{marketData.companyName}</p>
            <p className="text-sm text-gray-500">
              {analysisType === 'trading' ? `Trading Analysis (${timeframe})` : 'Investment Analysis'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">
              {marketData.currentPrice} {marketData.currency}
            </div>
            <div className="text-sm text-gray-500">
              Market Cap: ${(marketData.marketCap / 1e9).toFixed(2)}B
            </div>
          </div>
        </div>

        {/* Final Verdict */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-4">
            <div className={`px-4 py-2 rounded-full font-semibold ${getRecommendationColor(verdict.recommendation)}`}>
              {verdict.recommendation}
            </div>
            <div className="text-2xl font-bold">
              <span className={getScoreColor(verdict.finalScore)}>
                {verdict.finalScore}/100
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Risk Level</div>
            <div className={`font-semibold ${verdict.riskLevel === 'Low' ? 'text-green-600' : 
              verdict.riskLevel === 'Medium' ? 'text-yellow-600' : 'text-red-600'}`}>
              {verdict.riskLevel}
            </div>
          </div>
        </div>
      </div>

      {/* Analysis Scores Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Fundamental Analysis */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Fundamental</h2>
            <div className={`text-2xl font-bold ${getScoreColor(fundamental.fundamentalScore)}`}>
              {fundamental.fundamentalScore}
            </div>
          </div>
          
          <div className="space-y-3">
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Business Model</h3>
              <p className="text-sm text-gray-600">{fundamental.businessModel}</p>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Economic Moat</h3>
              <p className="text-sm text-gray-600">{fundamental.economicMoat}</p>
            </div>

            <div>
              <h3 className="font-medium text-gray-700 mb-2">Key Ratios</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>P/E: {fundamental.keyFinancialRatios.peRatio}</div>
                <div>P/B: {fundamental.keyFinancialRatios.pbRatio}</div>
                <div>ROE: {fundamental.keyFinancialRatios.roe}%</div>
                <div>ROIC: {fundamental.keyFinancialRatios.roic}%</div>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-700 mb-2">Intrinsic Value</h3>
              <p className="text-lg font-semibold text-blue-600">
                ${fundamental.dcfAssumptions.intrinsicValue}
              </p>
            </div>
          </div>
        </div>

        {/* Sentiment Analysis */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Sentiment</h2>
            <div className={`text-2xl font-bold ${getScoreColor(sentiment.sentimentScore)}`}>
              {sentiment.sentimentScore}
            </div>
          </div>
          
          <div className="space-y-3">
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Market Pulse</h3>
              <p className="text-sm text-gray-600">{sentiment.marketPulse}</p>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Social Sentiment</h3>
              <p className="text-sm text-gray-600">{sentiment.socialMediaSentiment}</p>
            </div>

            <div>
              <h3 className="font-medium text-gray-700 mb-2">Analyst Ratings</h3>
              <div className="flex justify-between text-sm">
                <span className="text-green-600">Buy: {sentiment.analystRatings.buy}</span>
                <span className="text-yellow-600">Hold: {sentiment.analystRatings.hold}</span>
                <span className="text-red-600">Sell: {sentiment.analystRatings.sell}</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Avg Target: ${sentiment.analystRatings.averageTarget}
              </p>
            </div>
          </div>
        </div>

        {/* Technical Analysis */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Technical</h2>
            <div className={`text-2xl font-bold ${getScoreColor(technical.technicalScore)}`}>
              {technical.technicalScore}
            </div>
          </div>
          
          <div className="space-y-3">
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Trend</h3>
              <span className={`px-2 py-1 rounded text-sm font-medium ${
                technical.trend === 'uptrend' ? 'bg-green-100 text-green-800' :
                technical.trend === 'downtrend' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {technical.trend.toUpperCase()}
              </span>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Support/Resistance</h3>
              <div className="text-sm">
                <div>Support: ${technical.support}</div>
                <div>Resistance: ${technical.resistance}</div>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-700 mb-2">Indicators</h3>
              <div className="text-sm space-y-1">
                <div>RSI: {technical.technicalIndicators.rsi}</div>
                <div>MACD: {technical.technicalIndicators.macd}</div>
                <div>SMA20: ${technical.technicalIndicators.movingAverages.sma20}</div>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-700 mb-2">Timing</h3>
              <p className="text-sm text-gray-600">{technical.timingConfirmation}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Convergence Factors */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
            Convergence Factors
          </h2>
          <ul className="space-y-2">
            {verdict.bullishFactors.map((factor: string, index: number) => (
              <li key={index} className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-gray-700">{factor}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Divergence Factors */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
            Divergence Factors
          </h2>
          <ul className="space-y-2">
            {verdict.bearishFactors.map((factor: string, index: number) => (
              <li key={index} className="flex items-start">
                <span className="text-red-500 mr-2">⚠</span>
                <span className="text-gray-700">{factor}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Key Insights */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Key Insights</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {verdict.keyInsights.map((insight, index) => (
            <div key={index} className="p-4 bg-blue-50 rounded-lg">
              <p className="text-gray-700">{insight}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Strengths and Weaknesses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 text-green-700">Strengths</h2>
          <ul className="space-y-2">
            {fundamental.strengths.map((strength, index) => (
              <li key={index} className="flex items-start">
                <span className="text-green-500 mr-2">+</span>
                <span className="text-gray-700">{strength}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 text-red-700">Weaknesses</h2>
          <ul className="space-y-2">
            {fundamental.weaknesses.map((weakness, index) => (
              <li key={index} className="flex items-start">
                <span className="text-red-500 mr-2">-</span>
                <span className="text-gray-700">{weakness}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 rounded-lg p-4 text-center text-sm text-gray-500">
        Analysis completed on {new Date(analysisResult.analysisTimestamp).toLocaleString()}
      </div>
    </div>
  );
};

export default Dashboard;