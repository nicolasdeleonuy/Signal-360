import { useState, useCallback } from 'react';
import { createAnalysisService, InvestmentAnalysisResponse } from '../services/analysisService';

// Hook return interface
export interface UseSignalAnalysisReturn {
  data: InvestmentAnalysisResponse | null;
  error: string | null;
  isLoading: boolean;
  runAnalysis: (ticker: string, goal: 'investment' | 'trading', timeframe: string) => Promise<void>;
  cancelAnalysis: () => void;
  resetAnalysis: () => void;
}

/**
 * Custom hook for managing direct frontend-first signal analysis
 * Provides state management for data, error, and loading states
 * Uses the analysisService directly without polling or backend dependencies
 */
export function useSignalAnalysis(): UseSignalAnalysisReturn {
  const [data, setData] = useState<InvestmentAnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  /**
   * Runs the signal analysis for the given ticker using direct frontend analysis
   */
  const runAnalysis = useCallback(async (ticker: string, goal: 'investment' | 'trading', timeframe: string): Promise<void> => {
    // Set loading state and clear previous data/errors
    setIsLoading(true);
    setError(null);
    setData(null);

    try {
      // Retrieve the user's Google API key from environment variables
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('VITE_GEMINI_API_KEY environment variable is not set');
      }

      // Create an instance of the analysis service
      const analysisService = createAnalysisService(apiKey);

      // Perform analysis based on goal
      let result: InvestmentAnalysisResponse;
      if (goal === 'investment') {
        result = await analysisService.getInvestmentAnalysis(ticker);
      } else {
        result = await analysisService.getTradingAnalysis(ticker, timeframe);
      }

      // 🔍 DIAGNOSTIC LOG: Verify what data the UI layer is receiving from analysisService
      console.log('🔍 [UI-DIAGNOSTIC] Analysis result received by useSignalAnalysis hook:', {
        ticker: result.ticker,
        finalScore: result.verdict.finalScore,
        recommendation: result.verdict.recommendation,
        fullAnalysisObject: result
      });

      // Set the result data
      setData(result);

    } catch (err) {
      // Handle any errors
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Analysis error:', err);
    } finally {
      // Always set loading to false
      setIsLoading(false);
    }
  }, []);

  /**
   * Cancels the current analysis (clears state)
   */
  const cancelAnalysis = useCallback(() => {
    console.log('Cancelling analysis');
    setIsLoading(false);
    setError(null);
    setData(null);
  }, []);

  /**
   * Resets all analysis state (for starting a new analysis)
   */
  const resetAnalysis = useCallback(() => {
    console.log('Resetting analysis state');
    setIsLoading(false);
    setError(null);
    setData(null);
  }, []);

  return {
    data,
    error,
    isLoading,
    runAnalysis,
    cancelAnalysis,
    resetAnalysis,
  };
}