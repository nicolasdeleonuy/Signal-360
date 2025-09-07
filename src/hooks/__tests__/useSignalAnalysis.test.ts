import { renderHook, act } from '@testing-library/react';
import { useSignalAnalysis } from '../useSignalAnalysis';
import { apiService } from '../../lib/apiService';
import { vi } from 'vitest';

// Mock the API service
vi.mock('../../lib/apiService', () => ({
  apiService: {
    getAnalysisForTicker: vi.fn(),
  },
}));

const mockApiService = apiService as any;

describe('useSignalAnalysis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset console methods to avoid noise in tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should return correct initial state', () => {
      const { result } = renderHook(() => useSignalAnalysis());

      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(typeof result.current.runAnalysis).toBe('function');
    });
  });

  describe('Loading State Transitions', () => {
    it('should set isLoading to true when runAnalysis is called', async () => {
      mockApiService.getAnalysisForTicker.mockResolvedValue({
        success: true,
        message: 'Analysis completed',
        executionTime: 1000,
        data: {
          ticker: 'AAPL',
          timestamp: '2023-01-01T00:00:00Z',
          context: 'investment',
          fundamental: {},
          technical: {},
          esg: {},
        },
      });

      const { result } = renderHook(() => useSignalAnalysis());

      act(() => {
        result.current.runAnalysis('AAPL');
      });

      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('Success Scenarios', () => {
    it('should handle successful analysis response', async () => {
      const mockResponse = {
        success: true,
        message: 'Analysis completed successfully',
        timestamp: '2023-01-01T00:00:00Z',
        executionTime: 1500,
        ticker: 'AAPL',
        context: 'investment',
        data: {
          fundamental: { pe_ratio: 25.5 },
          technical: { rsi: 65 },
          esg: { score: 85 },
        },
      };

      mockSupabase.functions.invoke.mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const { result } = renderHook(() => useSignalAnalysis());

      await act(async () => {
        await result.current.runAnalysis('AAPL');
      });

      expect(result.current.data).toEqual(mockResponse);
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle partial analysis results', async () => {
      const mockResponse = {
        success: true,
        message: 'Analysis completed with partial results',
        timestamp: '2023-01-01T00:00:00Z',
        executionTime: 1200,
        ticker: 'TSLA',
        context: 'trading',
        data: {
          fundamental: { pe_ratio: 45.2 },
          technical: { rsi: 72 },
        },
        partial: true,
        failedAnalyses: ['esg'],
      };

      mockSupabase.functions.invoke.mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const { result } = renderHook(() => useSignalAnalysis());

      await act(async () => {
        await result.current.runAnalysis('TSLA', 'trading');
      });

      expect(result.current.data).toEqual(mockResponse);
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication errors', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: {
          success: false,
          error: {
            code: 'MISSING_TOKEN',
            message: 'Authentication token is missing',
          },
        },
        error: null,
      });

      const { result } = renderHook(() => useSignalAnalysis());

      await act(async () => {
        await result.current.runAnalysis('AAPL');
      });

      expect(result.current.error).toBe('Authentication failed. Please log in again.');
      expect(result.current.data).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle validation errors from backend', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid ticker format',
          },
        },
        error: null,
      });

      const { result } = renderHook(() => useSignalAnalysis());

      await act(async () => {
        await result.current.runAnalysis('AAPL');
      });

      expect(result.current.error).toBe('Invalid ticker symbol. Please enter a valid stock symbol (1-5 letters).');
      expect(result.current.data).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle Supabase client network errors', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: null,
        error: {
          message: 'network error occurred',
        },
      });

      const { result } = renderHook(() => useSignalAnalysis());

      await act(async () => {
        await result.current.runAnalysis('META');
      });

      expect(result.current.error).toBe('Network error. Please check your connection and try again.');
      expect(result.current.data).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle Supabase client general errors', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: null,
        error: {
          message: 'Some other error',
        },
      });

      const { result } = renderHook(() => useSignalAnalysis());

      await act(async () => {
        await result.current.runAnalysis('META');
      });

      expect(result.current.error).toBe('Analysis service temporarily unavailable. Please try again later.');
      expect(result.current.data).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Input Validation', () => {
    it('should handle empty ticker input', async () => {
      const { result } = renderHook(() => useSignalAnalysis());

      await act(async () => {
        await result.current.runAnalysis('');
      });

      expect(result.current.error).toBe('Ticker symbol is required');
      expect(result.current.data).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(mockSupabase.functions.invoke).not.toHaveBeenCalled();
    });

    it('should handle ticker input longer than 5 characters', async () => {
      const { result } = renderHook(() => useSignalAnalysis());

      await act(async () => {
        await result.current.runAnalysis('TOOLONG');
      });

      expect(result.current.error).toBe('Ticker symbol must be 5 characters or less');
      expect(result.current.data).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(mockSupabase.functions.invoke).not.toHaveBeenCalled();
    });

    it('should handle ticker input with non-letter characters', async () => {
      const { result } = renderHook(() => useSignalAnalysis());

      await act(async () => {
        await result.current.runAnalysis('AAP12');
      });

      expect(result.current.error).toBe('Ticker symbol must contain only letters');
      expect(result.current.data).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(mockSupabase.functions.invoke).not.toHaveBeenCalled();
    });
  });

  describe('State Reset Functionality', () => {
    it('should clear previous state when new analysis is triggered', async () => {
      // First analysis with backend error
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          success: false,
          error: {
            code: 'API_KEY_NOT_CONFIGURED',
            message: 'API key missing',
          },
        },
        error: null,
      });

      const { result } = renderHook(() => useSignalAnalysis());

      await act(async () => {
        await result.current.runAnalysis('AAPL');
      });

      expect(result.current.error).toBe('Google API key not configured. Please add your API key in the profile section.');
      expect(result.current.data).toBeNull();

      // Second analysis with success
      const mockResponse = {
        success: true,
        message: 'Analysis completed',
        timestamp: '2023-01-01T00:00:00Z',
        executionTime: 1000,
        ticker: 'MSFT',
        context: 'investment',
        data: { fundamental: {} },
      };

      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: mockResponse,
        error: null,
      });

      await act(async () => {
        await result.current.runAnalysis('MSFT');
      });

      expect(result.current.error).toBeNull(); // Error should be cleared
      expect(result.current.data).toEqual(mockResponse);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Error Message Formatting', () => {
    it('should format authentication error messages correctly', async () => {
      const testCases = [
        { code: 'MISSING_TOKEN', expected: 'Authentication failed. Please log in again.' },
        { code: 'INVALID_TOKEN', expected: 'Authentication failed. Please log in again.' },
      ];

      for (const testCase of testCases) {
        mockSupabase.functions.invoke.mockResolvedValueOnce({
          data: {
            success: false,
            error: {
              code: testCase.code,
              message: 'Original message',
            },
          },
          error: null,
        });

        const { result } = renderHook(() => useSignalAnalysis());

        await act(async () => {
          await result.current.runAnalysis('AAPL');
        });

        expect(result.current.error).toBe(testCase.expected);
      }
    });

    it('should preserve original message for unknown error codes', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: {
          success: false,
          error: {
            code: 'CUSTOM_ERROR',
            message: 'Custom error message from server',
          },
        },
        error: null,
      });

      const { result } = renderHook(() => useSignalAnalysis());

      await act(async () => {
        await result.current.runAnalysis('AAPL');
      });

      expect(result.current.error).toBe('Custom error message from server');
    });
  });

  describe('Additional Error Scenarios', () => {
    it('should handle JWT authentication errors from Supabase', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: null,
        error: {
          message: 'JWT token is invalid',
        },
      });

      const { result } = renderHook(() => useSignalAnalysis());

      await act(async () => {
        await result.current.runAnalysis('NVDA');
      });

      expect(result.current.error).toBe('Authentication failed. Please log in again.');
      expect(result.current.data).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle unexpected response format', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: null, // This will trigger the unexpected response format handler
        error: null,
      });

      const { result } = renderHook(() => useSignalAnalysis());

      await act(async () => {
        await result.current.runAnalysis('ORCL');
      });

      expect(result.current.error).toBe('Received unexpected response format. Please try again.');
      expect(result.current.data).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle thrown exceptions', async () => {
      mockSupabase.functions.invoke.mockRejectedValue(new Error('Network failure'));

      const { result } = renderHook(() => useSignalAnalysis());

      await act(async () => {
        await result.current.runAnalysis('ADBE');
      });

      expect(result.current.error).toBe('An unexpected error occurred. Please try again.');
      expect(result.current.data).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Context Parameter Handling', () => {
    it('should use default investment context when not specified', async () => {
      const mockResponse = {
        success: true,
        message: 'Analysis completed',
        timestamp: '2023-01-01T00:00:00Z',
        executionTime: 1000,
        ticker: 'TSLA',
        context: 'investment',
        data: {},
      };

      mockSupabase.functions.invoke.mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const { result } = renderHook(() => useSignalAnalysis());

      await act(async () => {
        await result.current.runAnalysis('TSLA');
      });

      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('signal-360-analysis', {
        body: { ticker: 'TSLA', context: 'investment' },
      });
    });

    it('should use trading context when specified', async () => {
      const mockResponse = {
        success: true,
        message: 'Analysis completed',
        timestamp: '2023-01-01T00:00:00Z',
        executionTime: 1000,
        ticker: 'TSLA',
        context: 'trading',
        data: {},
      };

      mockSupabase.functions.invoke.mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const { result } = renderHook(() => useSignalAnalysis());

      await act(async () => {
        await result.current.runAnalysis('TSLA', 'trading');
      });

      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('signal-360-analysis', {
        body: { ticker: 'TSLA', context: 'trading' },
      });
    });
  });

  describe('Input Processing', () => {
    it('should trim whitespace from ticker input', async () => {
      const mockResponse = {
        success: true,
        message: 'Analysis completed',
        timestamp: '2023-01-01T00:00:00Z',
        executionTime: 1000,
        ticker: 'AAPL',
        context: 'investment',
        data: {},
      };

      mockSupabase.functions.invoke.mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const { result } = renderHook(() => useSignalAnalysis());

      await act(async () => {
        await result.current.runAnalysis('  AAPL  ');
      });

      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('signal-360-analysis', {
        body: { ticker: 'AAPL', context: 'investment' },
      });
    });

    it('should convert ticker to uppercase', async () => {
      const mockResponse = {
        success: true,
        message: 'Analysis completed',
        timestamp: '2023-01-01T00:00:00Z',
        executionTime: 1000,
        ticker: 'MSFT',
        context: 'investment',
        data: {},
      };

      mockSupabase.functions.invoke.mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const { result } = renderHook(() => useSignalAnalysis());

      await act(async () => {
        await result.current.runAnalysis('msft');
      });

      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('signal-360-analysis', {
        body: { ticker: 'MSFT', context: 'investment' },
      });
    });

    it('should handle whitespace-only ticker input', async () => {
      const { result } = renderHook(() => useSignalAnalysis());

      await act(async () => {
        await result.current.runAnalysis('   ');
      });

      expect(result.current.error).toBe('Ticker symbol is required');
      expect(result.current.data).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(mockSupabase.functions.invoke).not.toHaveBeenCalled();
    });
  });
});