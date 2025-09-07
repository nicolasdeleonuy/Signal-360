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

describe('useSignalAnalysis - API Service Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should use apiService.getAnalysisForTicker for analysis requests', async () => {
    const mockResponse = {
      success: true,
      data: {
        ticker: 'AAPL',
        timestamp: '2023-01-01T00:00:00Z',
        context: 'investment',
        fundamental: { score: 85 },
        technical: { score: 75 },
        esg: { score: 90 },
      },
      executionTime: 1500,
    };

    mockApiService.getAnalysisForTicker.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useSignalAnalysis());

    await act(async () => {
      await result.current.runAnalysis('AAPL', 'investment');
    });

    // Verify apiService was called with correct parameters
    expect(mockApiService.getAnalysisForTicker).toHaveBeenCalledWith('AAPL', 'investment');
    expect(mockApiService.getAnalysisForTicker).toHaveBeenCalledTimes(1);

    // Verify state is updated correctly
    expect(result.current.data).toEqual(mockResponse);
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('should handle apiService error responses correctly', async () => {
    const mockErrorResponse = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid ticker symbol. Please enter a valid stock symbol (1-5 letters).',
      },
    };

    mockApiService.getAnalysisForTicker.mockResolvedValue(mockErrorResponse);

    const { result } = renderHook(() => useSignalAnalysis());

    await act(async () => {
      await result.current.runAnalysis('INVALID_TICKER');
    });

    // Verify apiService was called
    expect(mockApiService.getAnalysisForTicker).toHaveBeenCalledWith('INVALID_TICKER', 'investment');

    // Verify error state is set correctly
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe('Invalid ticker symbol. Please enter a valid stock symbol (1-5 letters).');
    expect(result.current.isLoading).toBe(false);
  });

  it('should handle apiService exceptions correctly', async () => {
    mockApiService.getAnalysisForTicker.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useSignalAnalysis());

    await act(async () => {
      await result.current.runAnalysis('AAPL');
    });

    // Verify error state is set correctly
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe('An unexpected error occurred. Please try again.');
    expect(result.current.isLoading).toBe(false);
  });

  it('should pass context parameter correctly to apiService', async () => {
    const mockResponse = {
      success: true,
      data: {
        ticker: 'TSLA',
        timestamp: '2023-01-01T00:00:00Z',
        context: 'trading',
        fundamental: { score: 70 },
        technical: { score: 85 },
        esg: { score: 60 },
      },
    };

    mockApiService.getAnalysisForTicker.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useSignalAnalysis());

    await act(async () => {
      await result.current.runAnalysis('TSLA', 'trading');
    });

    // Verify apiService was called with trading context
    expect(mockApiService.getAnalysisForTicker).toHaveBeenCalledWith('TSLA', 'trading');
    expect(result.current.data).toEqual(mockResponse);
  });
});