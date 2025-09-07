import { useState, useCallback, useRef, useEffect } from 'react';
import { apiService, AnalysisApiResponse, StartAnalysisResponse, AnalysisStatusResponse } from '../lib/apiService';
import { useAuth } from '../contexts/auth-context';

// Re-export types from apiService for backward compatibility
export type { AnalysisRequest, AnalysisApiResponse as AnalysisResponse } from '../lib/apiService';

// Analysis progress interface
export interface AnalysisProgress {
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  currentPhase: string;
  jobId: string;
}

// Hook return interface
export interface UseSignalAnalysisReturn {
  data: AnalysisApiResponse | null;
  error: string | null;
  isLoading: boolean;
  progress: AnalysisProgress | null;
  jobId: string | null;
  runAnalysis: (ticker: string, context?: 'investment' | 'trading') => Promise<void>;
  cancelAnalysis: () => void;
}

/**
 * Custom hook for managing asynchronous signal analysis with polling
 * Provides state management for data, error, loading, and progress states
 * Handles authentication and error scenarios with user-friendly messages
 */
export function useSignalAnalysis(): UseSignalAnalysisReturn {
  const [data, setData] = useState<AnalysisApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  
  const { user, session } = useAuth();
  const pollingIntervalRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);

  // Cleanup polling on unmount
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      if (pollingIntervalRef.current !== null) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, []);

  /**
   * Stops the polling mechanism
   */
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current !== null) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  /**
   * Handles authentication errors by redirecting to login
   */
  const handleAuthError = useCallback(() => {
    console.warn('Authentication error detected, user needs to log in');
    // The auth context will handle the redirect
    setError('Authentication failed. Please log in again.');
    setIsLoading(false);
    stopPolling();
  }, [stopPolling]);

  /**
   * Polls the analysis status until completion
   */
  const pollAnalysisStatus = useCallback(async (currentJobId: string) => {
    if (!isMountedRef.current) return;

    try {
      // Get access token from session
      const accessToken = session?.access_token;
      const statusResponse = await apiService.getAnalysisStatus(currentJobId, accessToken);

      if (!isMountedRef.current) return;

      if (!statusResponse.success) {
        // Handle authentication errors
        if (statusResponse.error?.code === 'AUTHENTICATION_ERROR' || 
            statusResponse.error?.code === 'INVALID_TOKEN') {
          handleAuthError();
          return;
        }

        setError(statusResponse.error?.message || 'Failed to check analysis status');
        setIsLoading(false);
        stopPolling();
        return;
      }

      // Update progress
      const newProgress: AnalysisProgress = {
        status: statusResponse.status || 'pending',
        progress: statusResponse.progress || 0,
        currentPhase: statusResponse.currentPhase || 'Initializing',
        jobId: currentJobId
      };
      setProgress(newProgress);

      // Handle completion
      if (statusResponse.status === 'completed' && statusResponse.results) {
        setData({
          success: true,
          data: statusResponse.results
        });
        setIsLoading(false);
        stopPolling();
        console.log('Analysis completed successfully for job:', currentJobId);
      } else if (statusResponse.status === 'failed') {
        setError(statusResponse.message || 'Analysis failed');
        setIsLoading(false);
        stopPolling();
      }
      // Continue polling for 'pending' and 'in_progress' statuses

    } catch (err) {
      if (!isMountedRef.current) return;
      
      console.error('Error polling analysis status:', err);
      setError('Failed to check analysis progress. Please try again.');
      setIsLoading(false);
      stopPolling();
    }
  }, [handleAuthError, stopPolling, session?.access_token]);

  /**
   * Starts the polling mechanism
   */
  const startPolling = useCallback((currentJobId: string) => {
    // Clear any existing polling first
    if (pollingIntervalRef.current !== null) {
      clearInterval(pollingIntervalRef.current);
    }
    
    // Poll every 2 seconds
    pollingIntervalRef.current = setInterval(() => {
      pollAnalysisStatus(currentJobId);
    }, 2000) as unknown as number;

    // Also poll immediately
    pollAnalysisStatus(currentJobId);
  }, [pollAnalysisStatus]);

  /**
   * Runs the signal analysis for the given ticker using the asynchronous flow
   * Automatically handles state management, polling, and error scenarios
   */
  const runAnalysis = useCallback(async (ticker: string, context: 'investment' | 'trading' = 'investment'): Promise<void> => {
    // Check authentication
    if (!user) {
      handleAuthError();
      return;
    }

    // Clear previous state before starting new analysis
    setIsLoading(true);
    setError(null);
    setData(null);
    setProgress(null);
    setJobId(null);
    stopPolling();

    try {
      console.log('Starting asynchronous analysis for ticker:', ticker);

      // Get access token from session
      const accessToken = session?.access_token;
      if (!accessToken) {
        handleAuthError();
        return;
      }

      console.log('[DEBUG] Frontend is sending USER_ID:', session?.user?.id);

      // Start the analysis with access token
      const startResponse = await apiService.startAnalysis(ticker, context, accessToken);

      if (!isMountedRef.current) return;

      if (!startResponse.success) {
        // Handle authentication errors
        if (startResponse.error?.code === 'AUTHENTICATION_ERROR' || 
            startResponse.error?.code === 'INVALID_TOKEN') {
          handleAuthError();
          return;
        }

        setError(startResponse.error?.message || 'Failed to start analysis');
        setIsLoading(false);
        return;
      }

      if (!startResponse.jobId) {
        setError('Failed to get job ID from analysis service');
        setIsLoading(false);
        return;
      }

      // Store job ID and start polling
      setJobId(startResponse.jobId);
      setProgress({
        status: 'pending',
        progress: 0,
        currentPhase: 'Starting analysis',
        jobId: startResponse.jobId
      });

      console.log('Analysis started with job ID:', startResponse.jobId);
      startPolling(startResponse.jobId);

    } catch (err) {
      if (!isMountedRef.current) return;
      
      console.error('Error starting analysis:', err);
      setError('Failed to start analysis. Please try again.');
      setIsLoading(false);
    }
  }, [user, session?.access_token, handleAuthError, stopPolling, startPolling]);

  /**
   * Cancels the current analysis
   */
  const cancelAnalysis = useCallback(() => {
    console.log('Cancelling analysis');
    setIsLoading(false);
    setError(null);
    setData(null);
    setProgress(null);
    setJobId(null);
    stopPolling();
  }, [stopPolling]);

  return {
    data,
    error,
    isLoading,
    progress,
    jobId,
    runAnalysis,
    cancelAnalysis,
  };
}