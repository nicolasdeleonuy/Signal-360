import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSignalAnalysis } from '../../hooks/useSignalAnalysis';
import { useOpportunitySearch } from '../../hooks/useOpportunitySearch';
import { mockAnalysisService, mockAnalysisResponse, mockOpportunityResponse } from '../mocks/analysisServiceMock';

describe('Analysis Hooks Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock implementations
    mockAnalysisService.getInvestmentAnalysis.mockResolvedValue(mockAnalysisResponse);
    mockAnalysisService.getTradingAnalysis.mockResolvedValue(mockAnalysisResponse);
    mockAnalysisService.findOpportunities.mockResolvedValue(mockOpportunityResponse);
  });

  describe('useSignalAnalysis Hook', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useSignalAnalysis());

      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(typeof result.current.runAnalysis).toBe('function');
      expect(typeof result.current.cancelAnalysis).toBe('function');
      expect(typeof result.current.resetAnalysis).toBe('function');
    });

    it('should handle successful investment analysis', async () => {
      const { result } = renderHook(() => useSignalAnalysis());

      await act(async () => {
        await result.current.runAnalysis('AAPL', 'investment', '1M');
      });

      expect(result.current.data).toEqual(mockAnalysisResponse);
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(mockAnalysisService.getInvestmentAnalysis).toHaveBeenCalledWith('AAPL');
    });

    it('should handle successful trading analysis', async () => {
      const { result } = renderHook(() => useSignalAnalysis());

      await act(async () => {
        await result.current.runAnalysis('MSFT', 'trading', '1W');
      });

      expect(result.current.data).toEqual(mockAnalysisResponse);
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(mockAnalysisService.getTradingAnalysis).toHaveBeenCalledWith('MSFT', '1W');
    });

    it('should handle analysis errors gracefully', async () => {
      const errorMessage = 'API Error: Invalid ticker';
      mockAnalysisService.getInvestmentAnalysis.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useSignalAnalysis());

      await act(async () => {
        await result.current.runAnalysis('INVALID', 'investment', '1M');
      });

      expect(result.current.data).toBeNull();
      expect(result.current.error).toBe(errorMessage);
      expect(result.current.isLoading).toBe(false);
    });

    it('should set loading state during analysis', async () => {
      let resolvePromise: (value: any) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      
      mockAnalysisService.getInvestmentAnalysis.mockReturnValue(pendingPromise);

      const { result } = renderHook(() => useSignalAnalysis());

      // Start analysis
      act(() => {
        result.current.runAnalysis('AAPL', 'investment', '1M');
      });

      // Should be loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();

      // Resolve the promise
      await act(async () => {
        resolvePromise!(mockAnalysisResponse);
      });

      // Should no longer be loading
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toEqual(mockAnalysisResponse);
    });

    it('should cancel analysis correctly', () => {
      const { result } = renderHook(() => useSignalAnalysis());

      // Set some state first
      act(() => {
        result.current.runAnalysis('AAPL', 'investment', '1M');
      });

      // Cancel analysis
      act(() => {
        result.current.cancelAnalysis();
      });

      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('should reset analysis state correctly', () => {
      const { result } = renderHook(() => useSignalAnalysis());

      // Set some state first
      act(() => {
        result.current.runAnalysis('AAPL', 'investment', '1M');
      });

      // Reset analysis
      act(() => {
        result.current.resetAnalysis();
      });

      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle missing API key error', async () => {
      // Mock missing API key
      const originalEnv = import.meta.env.VITE_GEMINI_API_KEY;
      delete (import.meta.env as any).VITE_GEMINI_API_KEY;

      const { result } = renderHook(() => useSignalAnalysis());

      await act(async () => {
        await result.current.runAnalysis('AAPL', 'investment', '1M');
      });

      expect(result.current.error).toBe('VITE_GEMINI_API_KEY environment variable is not set');
      expect(result.current.data).toBeNull();
      expect(result.current.isLoading).toBe(false);

      // Restore original env
      (import.meta.env as any).VITE_GEMINI_API_KEY = originalEnv;
    });
  });

  describe('useOpportunitySearch Hook', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useOpportunitySearch());

      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(typeof result.current.runSearch).toBe('function');
      expect(typeof result.current.cancelSearch).toBe('function');
      expect(typeof result.current.resetSearch).toBe('function');
    });

    it('should handle successful opportunity search', async () => {
      const { result } = renderHook(() => useOpportunitySearch());

      await act(async () => {
        await result.current.runSearch();
      });

      expect(result.current.data).toEqual(mockOpportunityResponse);
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(mockAnalysisService.findOpportunities).toHaveBeenCalled();
    });

    it('should handle search errors gracefully', async () => {
      const errorMessage = 'Search failed: Network error';
      mockAnalysisService.findOpportunities.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useOpportunitySearch());

      await act(async () => {
        await result.current.runSearch();
      });

      expect(result.current.data).toBeNull();
      expect(result.current.error).toBe(errorMessage);
      expect(result.current.isLoading).toBe(false);
    });

    it('should set loading state during search', async () => {
      let resolvePromise: (value: any) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      
      mockAnalysisService.findOpportunities.mockReturnValue(pendingPromise);

      const { result } = renderHook(() => useOpportunitySearch());

      // Start search
      act(() => {
        result.current.runSearch();
      });

      // Should be loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();

      // Resolve the promise
      await act(async () => {
        resolvePromise!(mockOpportunityResponse);
      });

      // Should no longer be loading
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toEqual(mockOpportunityResponse);
    });

    it('should cancel search correctly', () => {
      const { result } = renderHook(() => useOpportunitySearch());

      // Set some state first
      act(() => {
        result.current.runSearch();
      });

      // Cancel search
      act(() => {
        result.current.cancelSearch();
      });

      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('should reset search state correctly', () => {
      const { result } = renderHook(() => useOpportunitySearch());

      // Set some state first
      act(() => {
        result.current.runSearch();
      });

      // Reset search
      act(() => {
        result.current.resetSearch();
      });

      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle missing API key error', async () => {
      // Mock missing API key
      const originalEnv = import.meta.env.VITE_GEMINI_API_KEY;
      delete (import.meta.env as any).VITE_GEMINI_API_KEY;

      const { result } = renderHook(() => useOpportunitySearch());

      await act(async () => {
        await result.current.runSearch();
      });

      expect(result.current.error).toBe('VITE_GEMINI_API_KEY environment variable is not set');
      expect(result.current.data).toBeNull();
      expect(result.current.isLoading).toBe(false);

      // Restore original env
      (import.meta.env as any).VITE_GEMINI_API_KEY = originalEnv;
    });
  });
});