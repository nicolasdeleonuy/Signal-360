import React from 'react';
import { AnalysisResult } from '../types/dashboard';

interface ResultsViewProps {
  results: AnalysisResult;
  onNewAnalysis: () => void;
}

export const ResultsView: React.FC<ResultsViewProps> = ({ results, onNewAnalysis }) => {
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

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header Section */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-gray-900">Analysis Results</h1>
        
        {/* Synthesis Score */}
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
      </div>

      {/* Analysis Sections */}
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

      {/* Action Button */}
      <div className="text-center pt-6">
        <button
          onClick={onNewAnalysis}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Start New Analysis
        </button>
      </div>
    </div>
  );
};