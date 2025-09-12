import { useState, useCallback } from 'react';
import { createAnalysisService, OpportunitySearchResponse } from '../services/analysisService';

// Hook return interface
export interface UseOpportunitySearchReturn {
  data: OpportunitySearchResponse | null;
  error: string | null;
  isLoading: boolean;
  runSearch: () => Promise<void>;
  cancelSearch: () => void;
  resetSearch: () => void;
}

/**
 * Custom hook for managing opportunity search functionality
 * Provides state management for data, error, and loading states
 * Uses the analysisService to find investment opportunities
 */
export function useOpportunitySearch(): UseOpportunitySearchReturn {
  const [data, setData] = useState<OpportunitySearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  /**
   * Runs the opportunity search using the AI-powered analysis service
   */
  const runSearch = useCallback(async (): Promise<void> => {
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

      // Perform opportunity search
      const result = await analysisService.findOpportunities();

      // Set the result data directly
      setData(result);

    } catch (err) {
      // Handle any errors
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Opportunity search error:', err);
    } finally {
      // Always set loading to false
      setIsLoading(false);
    }
  }, []);

  /**
   * Cancels the current search (clears state)
   */
  const cancelSearch = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setData(null);
  }, []);

  /**
   * Resets all search state (for starting a new search)
   */
  const resetSearch = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setData(null);
  }, []);

  return {
    data,
    error,
    isLoading,
    runSearch,
    cancelSearch,
    resetSearch,
  };
}