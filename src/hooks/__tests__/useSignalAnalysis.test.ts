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
        ticker: 'AAPL',
        marketData: {},
        fundamental: {},
        technical: {},
        esg: {},
        verdict: {
          finalScore: 75,
          recommendation: 'Buy',
          bullishFactors: [],
          bearishFactors: [],
          riskLevel: 'Medium',
          timeHorizon: '1M',
          keyInsights: []
        }
      });

      const { result } = renderHook(() => useSignalAnalysis());

      act(() => {
        result.current.runAnalysis('AAPL', 'investment', '1M');
      });

      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('Success Scenarios', () => {
    it('should handle successful analysis response', async () => {
      const mockResponse = {
        ticker: 'AAPL',
        marketData: {
          companyName: 'Apple Inc.',
          currentPrice: 150.00,
          currency: 'USD',
          sharesOutstanding: 16000000000,
          marketCap: 2400000000000,
          volume: 50000000,
          avgVolume: 45000000,
          priceTimestamp: '2023-01-01T00:00:00Z'
        },
        fundamental: { pe_ratio: 25.5 },
        technical: { rsi: 65 },
        esg: { score: 85 },
        verdict: {
          finalScore: 75,
          recommendation: 'Buy' as const,
          bullishFactors: ['Strong fundamentals'],
          bearishFactors: ['High valuation'],
          riskLevel: 'Medium' as const,
          timeHorizon: '1M',
          keyInsights: ['Good investment opportunity']
        }
      };

      mockApiService.getAnalysisForTicker.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useSignalAnalysis());

      await act(async () => {
        await result.current.runAnalysis('AAPL', 'investment', '1M');
      });

      expect(result.current.data).toEqual(mockResponse);
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle trading analysis', async () => {
      const mockResponse = {
        ticker: 'TSLA',
        marketData: {
          companyName: 'Tesla Inc.',
          currentPrice: 200.00,
          currency: 'USD',
          sharesOutstanding: 3000000000,
          marketCap: 600000000000,
          volume: 30000000,
          avgVolume: 25000000,
          priceTimestamp: '2023-01-01T00:00:00Z'
        },
        fundamental: { pe_ratio: 45.2 },
        technical: { rsi: 72 },
        esg: { score: 70 },
        verdict: {
          finalScore: 65,
          recommendation: 'Hold' as const,
          bullishFactors: ['Strong momentum'],
          bearishFactors: ['Overbought'],
          riskLevel: 'High' as const,
          timeHorizon: '1D',
          keyInsights: ['Short-term volatility expected']
        }
      };

      mockApiService.getAnalysisForTicker.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useSignalAnalysis());

      await act(async () => {
        await result.current.runAnalysis('TSLA', 'trading', '1D');
      });

      expect(result.current.data).toEqual(mockResponse);
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle API service errors', async () => {
      mockApiService.getAnalysisForTicker.mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() => useSignalAnalysis());

      await act(async () => {
        await result.current.runAnalysis('AAPL', 'investment', '1M');
      });

      expect(result.current.error).toBe('An unexpected error occurred. Please try again.');
      expect(result.current.data).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Input Validation', () => {
    it('should handle empty ticker input', async () => {
      const { result } = renderHook(() => useSignalAnalysis());

      await act(async () => {
        await result.current.runAnalysis('', 'investment', '1M');
      });

      expect(result.current.error).toBe('Ticker symbol is required');
      expect(result.current.data).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(mockApiService.getAnalysisForTicker).not.toHaveBeenCalled();
    });

    it('should handle ticker input longer than 5 characters', async () => {
      const { result } = renderHook(() => useSignalAnalysis());

      await act(async () => {
        await result.current.runAnalysis('TOOLONG', 'investment', '1M');
      });

      expect(result.current.error).toBe('Ticker symbol must be 5 characters or less');
      expect(result.current.data).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(mockApiService.getAnalysisForTicker).not.toHaveBeenCalled();
    });

    it('should handle ticker input with non-letter characters', async () => {
      const { result } = renderHook(() => useSignalAnalysis());

      await act(async () => {
        await result.current.runAnalysis('AAP12', 'investment', '1M');
      });

      expect(result.current.error).toBe('Ticker symbol must contain only letters');
      expect(result.current.data).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(mockApiService.getAnalysisForTicker).not.toHaveBeenCalled();
    });

    it('should handle whitespace-only ticker input', async () => {
      const { result } = renderHook(() => useSignalAnalysis());

      await act(async () => {
        await result.current.runAnalysis('   ', 'investment', '1M');
      });

      expect(result.current.error).toBe('Ticker symbol is required');
      expect(result.current.data).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(mockApiService.getAnalysisForTicker).not.toHaveBeenCalled();
    });
  });

  describe('Input Processing', () => {
    it('should trim whitespace from ticker input', async () => {
      const mockResponse = {
        ticker: 'AAPL',
        marketData: {
          companyName: 'Apple Inc.',
          currentPrice: 150.00,
          currency: 'USD',
          sharesOutstanding: 16000000000,
          marketCap: 2400000000000,
          volume: 50000000,
          avgVolume: 45000000,
          priceTimestamp: '2023-01-01T00:00:00Z'
        },
        fundamental: {},
        technical: {},
        esg: {},
        verdict: {
          finalScore: 75,
          recommendation: 'Buy' as const,
          bullishFactors: [],
          bearishFactors: [],
          riskLevel: 'Medium' as const,
          timeHorizon: '1M',
          keyInsights: []
        }
      };

      mockApiService.getAnalysisForTicker.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useSignalAnalysis());

      await act(async () => {
        await result.current.runAnalysis('  AAPL  ', 'investment', '1M');
      });

      expect(mockApiService.getAnalysisForTicker).toHaveBeenCalledWith('AAPL', 'investment', '1M');
    });

    it('should convert ticker to uppercase', async () => {
      const mockResponse = {
        ticker: 'MSFT',
        marketData: {
          companyName: 'Microsoft Corp.',
          currentPrice: 300.00,
          currency: 'USD',
          sharesOutstanding: 7500000000,
          marketCap: 2250000000000,
          volume: 25000000,
          avgVolume: 20000000,
          priceTimestamp: '2023-01-01T00:00:00Z'
        },
        fundamental: {},
        technical: {},
        esg: {},
        verdict: {
          finalScore: 80,
          recommendation: 'Buy' as const,
          bullishFactors: [],
          bearishFactors: [],
          riskLevel: 'Low' as const,
          timeHorizon: '1M',
          keyInsights: []
        }
      };

      mockApiService.getAnalysisForTicker.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useSignalAnalysis());

      await act(async () => {
        await result.current.runAnalysis('msft', 'investment', '1M');
      });

      expect(mockApiService.getAnalysisForTicker).toHaveBeenCalledWith('MSFT', 'investment', '1M');
    });
  });
});