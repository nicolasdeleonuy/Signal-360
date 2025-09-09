import React, { useState } from 'react';
import { AnalysisResult } from '../types/dashboard';
import { InvestmentAnalysisResponse } from '../services/analysisService';

interface ResultsViewProps {
  results: AnalysisResult;
  onNewAnalysis: () => void;
  analysisData?: InvestmentAnalysisResponse | null;
  ticker?: string;
  loading?: boolean;
}

export const ResultsView: React.FC<ResultsViewProps> = ({ 
  results, 
  onNewAnalysis, 
  analysisData, 
  ticker,
  loading = false
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'value' | 'eco'>('summary');
  const getRecommendationColor = (recommendation: string) => {
    const normalizedRec = recommendation.toLowerCase();
    if (normalizedRec.includes('buy')) return 'text-green-600 bg-green-50 border-green-200';
    if (normalizedRec.includes('sell')) return 'text-red-600 bg-red-50 border-red-200';
    if (normalizedRec.includes('hold')) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  // Handle empty state
  if (!results && !analysisData) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center space-y-4">
          <div className="text-gray-400">
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-600">No Analysis Results Available</h2>
          <p className="text-gray-500">Complete an analysis to see results here.</p>
          <button
            onClick={onNewAnalysis}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-200"
          >
            Start New Analysis
          </button>
        </div>
      </div>
    );
  }

  // Handle loading state
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <h2 className="text-xl font-semibold text-gray-600">Processing Results...</h2>
          <p className="text-gray-500">Please wait while we prepare your analysis results.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header Section */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-gray-900">
          Analysis Results{ticker ? ` for ${ticker}` : ''}
        </h1>
        
        {/* Analysis metadata */}
        {analysisData && (
          <div className="text-sm text-gray-500 space-y-1">
            <p>Analysis completed at {new Date(analysisData.analysisTimestamp).toLocaleString()}</p>
          </div>
        )}

        {/* Main Header with Score, Recommendation, and Price */}
        <div className="flex items-center justify-center space-x-8">
          {/* Synthesis Score */}
          {(results?.synthesisScore || analysisData?.verdict?.finalScore) && (
            <div className="text-center">
              <div className={`text-6xl font-bold ${getScoreColor(results?.synthesisScore || analysisData?.verdict?.finalScore || 0)}`}>
                {results?.synthesisScore || analysisData?.verdict?.finalScore || 0}
              </div>
              <div className="text-sm text-gray-500">Synthesis Score</div>
            </div>
          )}
          
          {/* Recommendation Badge */}
          {(results?.recommendation || analysisData?.verdict?.recommendation) && (
            <div className={`px-6 py-3 rounded-lg border-2 font-semibold text-lg ${getRecommendationColor(results?.recommendation || analysisData?.verdict?.recommendation || '')}`}>
              {results?.recommendation || analysisData?.verdict?.recommendation}
            </div>
          )}

          {/* Current Price */}
          {analysisData?.marketData && (
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">
                {formatCurrency(analysisData.marketData.currentPrice, analysisData.marketData.currency)}
              </div>
              <div className="text-sm text-gray-500">Current Price</div>
              {analysisData.marketData.priceTimestamp && (
                <div className="text-xs text-gray-400">
                  {new Date(analysisData.marketData.priceTimestamp).toLocaleString()}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('summary')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'summary'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Summary
          </button>
          <button
            onClick={() => setActiveTab('value')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'value'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Value Analysis
          </button>
          <button
            onClick={() => setActiveTab('eco')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'eco'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Eco Signal
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {/* Summary Tab */}
        {activeTab === 'summary' && (
          <div className="space-y-8">
            {/* Company Profile */}
            {analysisData?.fundamental?.businessModel && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-blue-800 mb-4">Company Profile</h2>
                <p className="text-blue-700 leading-relaxed">{analysisData.fundamental.businessModel}</p>
              </div>
            )}

            {/* Convergence vs Divergence */}
            <div className="grid md:grid-cols-2 gap-8">
              {/* Convergence Factors */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-green-800 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Convergence Factors
                </h2>
                <ul className="space-y-3">
                  {(results?.convergenceFactors || analysisData?.verdict?.convergenceFactors || []).map((factor, index) => (
                    <li key={index} className="flex items-start">
                      <span className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full mt-2 mr-3"></span>
                      <span className="text-green-700">{factor}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Divergence Factors */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-red-800 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  Divergence Factors
                </h2>
                <ul className="space-y-3">
                  {(results?.divergenceFactors || analysisData?.verdict?.divergenceFactors || []).map((factor, index) => (
                    <li key={index} className="flex items-start">
                      <span className="flex-shrink-0 w-2 h-2 bg-red-500 rounded-full mt-2 mr-3"></span>
                      <span className="text-red-700">{factor}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Value Analysis Tab */}
        {activeTab === 'value' && analysisData && (
          <div className="space-y-8">
            {/* Key Financial Ratios */}
            {analysisData.fundamental?.keyFinancialRatios && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-6">Key Financial Ratios</h2>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">{analysisData.fundamental.keyFinancialRatios.peRatio.toFixed(2)}</div>
                    <div className="text-sm text-gray-600">P/E Ratio</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">{analysisData.fundamental.keyFinancialRatios.pbRatio.toFixed(2)}</div>
                    <div className="text-sm text-gray-600">P/B Ratio</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">{formatPercentage(analysisData.fundamental.keyFinancialRatios.roe)}</div>
                    <div className="text-sm text-gray-600">ROE</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">{formatPercentage(analysisData.fundamental.keyFinancialRatios.roic)}</div>
                    <div className="text-sm text-gray-600">ROIC</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">{analysisData.fundamental.keyFinancialRatios.debtToEquity.toFixed(2)}</div>
                    <div className="text-sm text-gray-600">Debt/Equity</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">{analysisData.fundamental.keyFinancialRatios.currentRatio.toFixed(2)}</div>
                    <div className="text-sm text-gray-600">Current Ratio</div>
                  </div>
                </div>
              </div>
            )}

            {/* Valuation (DCF) */}
            {analysisData.fundamental?.dcfAssumptions && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-blue-800 mb-6">Valuation (DCF)</h2>
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-lg font-medium text-blue-700 mb-4">Intrinsic Value</h3>
                    <div className="text-3xl font-bold text-blue-900">
                      {formatCurrency(analysisData.fundamental.dcfAssumptions.intrinsicValue, analysisData.marketData.currency)}
                    </div>
                    <div className="text-sm text-blue-600 mt-2">
                      vs Current: {formatCurrency(analysisData.marketData.currentPrice, analysisData.marketData.currency)}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-blue-700 mb-4">Key Assumptions</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Growth Rate:</span>
                        <span className="font-medium">{formatPercentage(analysisData.fundamental.dcfAssumptions.growthRate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Discount Rate:</span>
                        <span className="font-medium">{formatPercentage(analysisData.fundamental.dcfAssumptions.discountRate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Terminal Growth:</span>
                        <span className="font-medium">{formatPercentage(analysisData.fundamental.dcfAssumptions.terminalGrowthRate)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Strengths & Weaknesses */}
            <div className="grid md:grid-cols-2 gap-8">
              {/* Strengths */}
              {analysisData.fundamental?.strengths && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <h2 className="text-xl font-semibold text-green-800 mb-4">Strengths</h2>
                  <ul className="space-y-3">
                    {analysisData.fundamental.strengths.map((strength, index) => (
                      <li key={index} className="flex items-start">
                        <span className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full mt-2 mr-3"></span>
                        <span className="text-green-700">{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Weaknesses */}
              {analysisData.fundamental?.weaknesses && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                  <h2 className="text-xl font-semibold text-red-800 mb-4">Weaknesses</h2>
                  <ul className="space-y-3">
                    {analysisData.fundamental.weaknesses.map((weakness, index) => (
                      <li key={index} className="flex items-start">
                        <span className="flex-shrink-0 w-2 h-2 bg-red-500 rounded-full mt-2 mr-3"></span>
                        <span className="text-red-700">{weakness}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Eco Signal Tab */}
        {activeTab === 'eco' && analysisData && (
          <div className="space-y-8">
            {/* Eco Score */}
            {analysisData.sentiment?.sentimentScore !== undefined && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 text-center">
                <h2 className="text-xl font-semibold text-purple-800 mb-4">Eco Score</h2>
                <div className={`text-6xl font-bold ${getScoreColor(analysisData.sentiment.sentimentScore)}`}>
                  {analysisData.sentiment.sentimentScore}
                </div>
                <div className="text-sm text-purple-600 mt-2">Market Sentiment Score</div>
              </div>
            )}

            {/* Technical Context */}
            {analysisData.technical && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-indigo-800 mb-6">Technical Context</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium text-indigo-700 mb-4">Technical Score</h3>
                    <div className={`text-4xl font-bold ${getScoreColor(analysisData.technical.technicalScore)}`}>
                      {analysisData.technical.technicalScore}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-indigo-700 mb-4">Market Trend</h3>
                    <div className="text-2xl font-semibold text-indigo-900 capitalize">
                      {analysisData.technical.trend}
                    </div>
                    <div className="text-sm text-indigo-600 mt-2">
                      Support: {formatCurrency(analysisData.technical.support, analysisData.marketData.currency)} | 
                      Resistance: {formatCurrency(analysisData.technical.resistance, analysisData.marketData.currency)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* News Echoes */}
            {analysisData.sentiment?.newsEchoes && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-6">News Echoes</h2>
                <div className="space-y-4">
                  {analysisData.sentiment.newsEchoes.map((echo, index) => (
                    <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <span className="flex-shrink-0 w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3"></span>
                        <span className="text-gray-700">{echo}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center space-x-4 pt-6 border-t border-gray-200">
        <button
          onClick={onNewAnalysis}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Start New Analysis
        </button>
        
        <button
          onClick={() => {
            if (analysisData) {
              const dataStr = JSON.stringify(analysisData, null, 2);
              const dataBlob = new Blob([dataStr], { type: 'application/json' });
              const url = URL.createObjectURL(dataBlob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `analysis-${ticker || 'unknown'}-${new Date().toISOString().split('T')[0]}.json`;
              link.click();
              URL.revokeObjectURL(url);
            }
          }}
          className={`font-semibold py-3 px-6 rounded-lg transition-colors duration-200 focus:outline-none ${
            analysisData 
              ? 'bg-gray-600 hover:bg-gray-700 text-white focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 cursor-pointer' 
              : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60'
          }`}
          disabled={!analysisData}
          title={!analysisData ? 'Export feature coming soon - complete an analysis first' : 'Export analysis data as JSON'}
        >
          Export Data
        </button>
      </div>
    </div>
  );
};