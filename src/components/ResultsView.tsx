import React, { useState } from 'react';
import { AnalysisResult } from '../types/dashboard';
import { AnalysisApiResponse } from '../lib/apiService';

interface ResultsViewProps {
  results: AnalysisResult;
  onNewAnalysis: () => void;
  analysisData?: AnalysisApiResponse | null;
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
  const [showRawData, setShowRawData] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'raw' | 'detailed'>('summary');
  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'BUY':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'SELL':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'HOLD':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Data sanitization function
  const sanitizeData = (data: any): any => {
    if (data === null || data === undefined) return null;
    if (typeof data === 'string') return data.replace(/<[^>]*>/g, ''); // Remove HTML tags
    if (typeof data === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        sanitized[key] = sanitizeData(value);
      }
      return sanitized;
    }
    return data;
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

  // Sanitize analysis data before display
  const sanitizedAnalysisData = analysisData ? sanitizeData(analysisData) : null;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header Section */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-gray-900">
          Analysis Results{ticker ? ` for ${ticker}` : ''}
        </h1>
        
        {/* Analysis metadata */}
        {sanitizedAnalysisData && (
          <div className="text-sm text-gray-500 space-y-1">
            <p>Analysis completed at {new Date().toLocaleTimeString()}</p>
            {sanitizedAnalysisData.executionTime && (
              <p>Execution time: {sanitizedAnalysisData.executionTime}ms</p>
            )}
            {sanitizedAnalysisData.partial && sanitizedAnalysisData.failedAnalyses && (
              <p className="text-yellow-600">
                ⚠️ Partial results - Some components failed: {sanitizedAnalysisData.failedAnalyses.join(', ')}
              </p>
            )}
          </div>
        )}
        
        {/* Connection Status */}
        {sanitizedAnalysisData && (
          <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            Backend Connection Verified
          </div>
        )}

        {/* Synthesis Score - only show if results exist */}
        {results && (
          <div className="flex items-center justify-center space-x-4">
            <div className="text-center">
              <div className={`text-6xl font-bold ${getScoreColor(results.synthesisScore)}`}>
                {results.synthesisScore}
              </div>
              <div className="text-sm text-gray-500">Synthesis Score</div>
            </div>
            
            {/* Recommendation Badge */}
            <div className={`px-6 py-3 rounded-lg border-2 font-semibold text-lg ${getRecommendationColor(results.recommendation)}`}>
              {results.recommendation}
            </div>
          </div>
        )}
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
            onClick={() => setActiveTab('detailed')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'detailed'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Detailed Analysis
          </button>
          <button
            onClick={() => setActiveTab('raw')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'raw'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Raw Data
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {/* Summary Tab */}
        {activeTab === 'summary' && results && (
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
                {results.convergenceFactors.map((factor, index) => (
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
                {results.divergenceFactors.map((factor, index) => (
                  <li key={index} className="flex items-start">
                    <span className="flex-shrink-0 w-2 h-2 bg-red-500 rounded-full mt-2 mr-3"></span>
                    <span className="text-red-700">{factor}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Detailed Analysis Tab */}
        {activeTab === 'detailed' && sanitizedAnalysisData && (
          <div className="space-y-6">
            {/* Analysis Components */}
            <div className="grid md:grid-cols-3 gap-6">
              {/* Fundamental Analysis */}
              {sanitizedAnalysisData.data?.fundamental && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-blue-800 mb-3">Fundamental Analysis</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Score:</span> {sanitizedAnalysisData.data.fundamental.score}</p>
                    <p><span className="font-medium">Confidence:</span> {sanitizedAnalysisData.data.fundamental.confidence}%</p>
                    <p><span className="font-medium">Factors:</span> {sanitizedAnalysisData.data.fundamental.factors?.length || 0}</p>
                  </div>
                </div>
              )}

              {/* Technical Analysis */}
              {sanitizedAnalysisData.data?.technical && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-purple-800 mb-3">Technical Analysis</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Score:</span> {sanitizedAnalysisData.data.technical.score}</p>
                    <p><span className="font-medium">Confidence:</span> {sanitizedAnalysisData.data.technical.confidence}%</p>
                    <p><span className="font-medium">Factors:</span> {sanitizedAnalysisData.data.technical.factors?.length || 0}</p>
                  </div>
                </div>
              )}

              {/* ESG Analysis */}
              {sanitizedAnalysisData.data?.esg && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-green-800 mb-3">ESG Analysis</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Score:</span> {sanitizedAnalysisData.data.esg.score}</p>
                    <p><span className="font-medium">Confidence:</span> {sanitizedAnalysisData.data.esg.confidence}%</p>
                    <p><span className="font-medium">Factors:</span> {sanitizedAnalysisData.data.esg.factors?.length || 0}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Analysis Context */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Analysis Context</h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p><span className="font-medium">Ticker:</span> {sanitizedAnalysisData.data?.ticker}</p>
                  <p><span className="font-medium">Context:</span> {sanitizedAnalysisData.data?.context}</p>
                  <p><span className="font-medium">Timestamp:</span> {sanitizedAnalysisData.data?.timestamp}</p>
                </div>
                <div>
                  <p><span className="font-medium">Success:</span> {sanitizedAnalysisData.success ? 'Yes' : 'No'}</p>
                  <p><span className="font-medium">Partial:</span> {sanitizedAnalysisData.partial ? 'Yes' : 'No'}</p>
                  <p><span className="font-medium">Execution Time:</span> {sanitizedAnalysisData.executionTime}ms</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Raw Data Tab - For connection validation */}
        {activeTab === 'raw' && (
          <div className="space-y-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Raw API Response</h3>
                <div className="text-sm text-gray-500">
                  Connection Status: 
                  <span className="ml-1 text-green-600 font-medium">
                    {sanitizedAnalysisData ? 'Connected ✓' : 'No Data'}
                  </span>
                </div>
              </div>
              
              {sanitizedAnalysisData ? (
                <div className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto max-h-96">
                  <pre className="text-xs whitespace-pre-wrap">
                    {JSON.stringify(sanitizedAnalysisData, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No raw data available</p>
                  <p className="text-sm mt-2">Complete an analysis to see the raw API response</p>
                </div>
              )}
            </div>

            {/* Data validation info */}
            {sanitizedAnalysisData && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">Data Pipeline Validation</h4>
                <div className="space-y-1 text-sm text-blue-700">
                  <p>✓ Frontend-Backend connection established</p>
                  <p>✓ API response received and parsed</p>
                  <p>✓ Data sanitization applied</p>
                  <p>✓ Component rendering successful</p>
                  {sanitizedAnalysisData.success && <p>✓ Analysis completed successfully</p>}
                  {sanitizedAnalysisData.partial && <p>⚠ Partial results detected</p>}
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
        
        {/* Export/Share functionality for future enhancement */}
        <button
          onClick={() => {
            if (sanitizedAnalysisData) {
              const dataStr = JSON.stringify(sanitizedAnalysisData, null, 2);
              const dataBlob = new Blob([dataStr], { type: 'application/json' });
              const url = URL.createObjectURL(dataBlob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `analysis-${ticker || 'unknown'}-${new Date().toISOString().split('T')[0]}.json`;
              link.click();
              URL.revokeObjectURL(url);
            }
          }}
          className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          disabled={!sanitizedAnalysisData}
        >
          Export Data
        </button>
      </div>
    </div>
  );
};