import { useState } from 'react';
import { supabase } from '../lib/supabase';

// Request interface for the signal-360-analysis Edge Function
export interface AnalysisRequest {
  ticker: string;
  context?: 'investment' | 'trading';
}

// Response interface based on the Edge Function implementation
export interface AnalysisResponse {
  success: boolean;
  message: string;
  timestamp: string;
  executionTime: number;
  ticker: string;
  context: string;
  data: {
    fundamental?: any;
    technical?: any;
    esg?: any;
  };
  partial?: boolean;
  failedAnalyses?: string[];
}

// Error response interface
export interface AnalysisErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Array<{
      field: string;
      message: string;
      code: string;
    }>;
  };
}

// Hook return interface
export interface UseSignalAnalysisReturn {
  data: AnalysisResponse | null;
  error: string | null;
  isLoading: boolean;
  runAnalysis: (ticker: string, context?: 'investment' | 'trading') => Promise<void>;
}

/**
 * Custom hook for managing signal analysis API calls and state
 * Provides state management for data, error, and loading states
 * Handles authentication and error scenarios with user-friendly messages
 */
export function useSignalAnalysis(): UseSignalAnalysisReturn {
  const [data, setData] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  /**
   * Converts error codes to user-friendly messages
   */
  const getErrorMessage = (errorCode: string, originalMessage?: string): string => {
    switch (errorCode) {
      case 'MISSING_TOKEN':
      case 'INVALID_TOKEN':
        return 'Authentication failed. Please log in again.';
      
      case 'VALIDATION_ERROR':
        return 'Invalid ticker symbol. Please enter a valid stock symbol (1-5 letters).';
      
      case 'API_KEY_NOT_CONFIGURED':
        return 'Google API key not configured. Please add your API key in the profile section.';
      
      case 'DATABASE_ERROR':
        return 'Database service temporarily unavailable. Please try again later.';
      
      case 'INTERNAL_ERROR':
        return 'Analysis service temporarily unavailable. Please try again later.';
      
      case 'METHOD_NOT_ALLOWED':
        return 'Invalid request method. Please try again.';
      
      default:
        return originalMessage || 'An unexpected error occurred. Please try again.';
    }
  };

  /**
   * Runs the signal analysis for the given ticker
   * Automatically handles state management and error scenarios
   */
  const runAnalysis = async (ticker: string, context: 'investment' | 'trading' = 'investment'): Promise<void> => {
    // Clear previous state before starting new analysis
    setIsLoading(true);
    setError(null);
    setData(null);

    try {
      // Validate ticker input on the frontend
      if (!ticker || ticker.trim().length === 0) {
        throw new Error('Ticker symbol is required');
      }

      if (ticker.trim().length > 5) {
        throw new Error('Ticker symbol must be 5 characters or less');
      }

      if (!/^[A-Za-z]+$/.test(ticker.trim())) {
        throw new Error('Ticker symbol must contain only letters');
      }

      // Prepare request payload
      const requestPayload: AnalysisRequest = {
        ticker: ticker.trim().toUpperCase(),
        context
      };

      console.log('Starting analysis for ticker:', requestPayload.ticker);

      // Call the Supabase Edge Function
      const { data: responseData, error: supabaseError } = await supabase.functions.invoke(
        'signal-360-analysis',
        {
          body: requestPayload,
        }
      );

      // Handle Supabase client errors (network, auth, etc.)
      if (supabaseError) {
        console.error('Supabase function invocation error:', supabaseError);
        
        // Handle specific Supabase error types
        if (supabaseError.message?.includes('JWT')) {
          setError('Authentication failed. Please log in again.');
        } else if (supabaseError.message?.includes('network') || supabaseError.message?.includes('fetch')) {
          setError('Network error. Please check your connection and try again.');
        } else {
          setError('Analysis service temporarily unavailable. Please try again later.');
        }
        return;
      }

      // Handle Edge Function error responses
      if (responseData && !responseData.success) {
        const errorResponse = responseData as AnalysisErrorResponse;
        const errorMessage = getErrorMessage(
          errorResponse.error.code,
          errorResponse.error.message
        );
        setError(errorMessage);
        return;
      }

      // Handle successful response
      if (responseData && responseData.success) {
        const analysisResponse = responseData as AnalysisResponse;
        setData(analysisResponse);
        
        // Log partial results warning if applicable
        if (analysisResponse.partial && analysisResponse.failedAnalyses) {
          console.warn('Analysis completed with partial results. Failed analyses:', analysisResponse.failedAnalyses);
        }
        
        console.log('Analysis completed successfully for ticker:', analysisResponse.ticker);
      } else {
        // Handle unexpected response format
        setError('Received unexpected response format. Please try again.');
      }

    } catch (err) {
      console.error('Error during analysis:', err);
      
      // Handle different error types
      if (err instanceof Error) {
        // Handle validation errors from our frontend checks
        if (err.message.includes('Ticker symbol')) {
          setError(err.message);
        } else {
          setError('An unexpected error occurred. Please try again.');
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return {
    data,
    error,
    isLoading,
    runAnalysis,
  };
}