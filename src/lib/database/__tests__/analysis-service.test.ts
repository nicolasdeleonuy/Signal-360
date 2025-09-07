// Unit tests for AnalysisService
// Tests CRUD operations, validation, and JSONB handling

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AnalysisService } from '../analysis-service';
import { supabase } from '../../supabaseClient';
import { 
  Analysis, 
  CreateAnalysisInput, 
  AnalysisFilters,
  ConvergenceFactor,
  DivergenceFactor,
  AnalysisReport 
} from '../../../types/database';

// Mock Supabase client
vi.mock('../../supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('AnalysisService', () => {
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockConvergenceFactors: ConvergenceFactor[] = [
    {
      category: 'fundamental',
      description: 'Strong revenue growth',
      weight: 8.5,
      metadata: { growth_rate: 0.15 },
    },
  ];
  const mockDivergenceFactors: DivergenceFactor[] = [
    {
      category: 'technical',
      description: 'Overbought RSI',
      weight: 6.0,
      metadata: { rsi_value: 75 },
    },
  ];
  const mockReport: AnalysisReport = {
    summary: 'Mixed signals with strong fundamentals but technical concerns',
    fundamental: {
      score: 85,
      factors: ['Revenue growth', 'Profit margins'],
      details: { revenue_growth: 0.15, margin: 0.25 },
    },
  };
  const mockAnalysis: Analysis = {
    id: 1,
    user_id: mockUserId,
    created_at: '2024-01-01T00:00:00Z',
    ticker_symbol: 'AAPL',
    analysis_context: 'investment',
    trading_timeframe: null,
    synthesis_score: 75,
    convergence_factors: mockConvergenceFactors,
    divergence_factors: mockDivergenceFactors,
    full_report: mockReport,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createAnalysis', () => {
    it('should create an investment analysis successfully', async () => {
      const input: CreateAnalysisInput = {
        ticker_symbol: 'aapl',
        analysis_context: 'investment',
        synthesis_score: 75,
        convergence_factors: mockConvergenceFactors,
        divergence_factors: mockDivergenceFactors,
        full_report: mockReport,
      };

      const mockSupabaseChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockAnalysis,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockSupabaseChain);

      const result = await AnalysisService.createAnalysis(mockUserId, input);

      expect(supabase.from).toHaveBeenCalledWith('analyses');
      expect(mockSupabaseChain.insert).toHaveBeenCalledWith({
        user_id: mockUserId,
        ticker_symbol: 'AAPL',
        analysis_context: 'investment',
        trading_timeframe: null,
        synthesis_score: 75,
        convergence_factors: mockConvergenceFactors,
        divergence_factors: mockDivergenceFactors,
        full_report: mockReport,
      });
      expect(result).toEqual(mockAnalysis);
    });

    it('should create a trading analysis with timeframe', async () => {
      const input: CreateAnalysisInput = {
        ticker_symbol: 'TSLA',
        analysis_context: 'trading',
        trading_timeframe: '1D',
        synthesis_score: 65,
        convergence_factors: mockConvergenceFactors,
        divergence_factors: mockDivergenceFactors,
        full_report: mockReport,
      };

      const mockSupabaseChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...mockAnalysis, ticker_symbol: 'TSLA', analysis_context: 'trading', trading_timeframe: '1D' },
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockSupabaseChain);

      const result = await AnalysisService.createAnalysis(mockUserId, input);

      expect(mockSupabaseChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          ticker_symbol: 'TSLA',
          analysis_context: 'trading',
          trading_timeframe: '1D',
        })
      );
      expect(result.analysis_context).toBe('trading');
      expect(result.trading_timeframe).toBe('1D');
    });

    it('should throw error for invalid ticker symbol', async () => {
      const input: CreateAnalysisInput = {
        ticker_symbol: '',
        analysis_context: 'investment',
        synthesis_score: 75,
        convergence_factors: [],
        divergence_factors: [],
        full_report: mockReport,
      };

      await expect(AnalysisService.createAnalysis(mockUserId, input)).rejects.toThrow(
        'Failed to create analysis: Ticker symbol is required and must be a string'
      );
    });

    it('should throw error for invalid analysis context', async () => {
      const input: CreateAnalysisInput = {
        ticker_symbol: 'AAPL',
        analysis_context: 'invalid' as any,
        synthesis_score: 75,
        convergence_factors: [],
        divergence_factors: [],
        full_report: mockReport,
      };

      await expect(AnalysisService.createAnalysis(mockUserId, input)).rejects.toThrow(
        'Failed to create analysis: Analysis context must be either "investment" or "trading"'
      );
    });

    it('should throw error for trading analysis without timeframe', async () => {
      const input: CreateAnalysisInput = {
        ticker_symbol: 'AAPL',
        analysis_context: 'trading',
        synthesis_score: 75,
        convergence_factors: [],
        divergence_factors: [],
        full_report: mockReport,
      };

      await expect(AnalysisService.createAnalysis(mockUserId, input)).rejects.toThrow(
        'Failed to create analysis: Trading timeframe is required for trading analysis'
      );
    });

    it('should throw error for invalid synthesis score', async () => {
      const input: CreateAnalysisInput = {
        ticker_symbol: 'AAPL',
        analysis_context: 'investment',
        synthesis_score: 150,
        convergence_factors: [],
        divergence_factors: [],
        full_report: mockReport,
      };

      await expect(AnalysisService.createAnalysis(mockUserId, input)).rejects.toThrow(
        'Failed to create analysis: Synthesis score must be between 0 and 100'
      );
    });
  });

  describe('getAnalysis', () => {
    it('should retrieve analysis by ID', async () => {
      const mockSupabaseChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockAnalysis,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockSupabaseChain);

      const result = await AnalysisService.getAnalysis(1, mockUserId);

      expect(supabase.from).toHaveBeenCalledWith('analyses');
      expect(mockSupabaseChain.select).toHaveBeenCalledWith('*');
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('id', 1);
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('user_id', mockUserId);
      expect(result).toEqual(mockAnalysis);
    });

    it('should return null if analysis not found', async () => {
      const mockSupabaseChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'No rows found' },
        }),
      };

      (supabase.from as any).mockReturnValue(mockSupabaseChain);

      const result = await AnalysisService.getAnalysis(999, mockUserId);

      expect(result).toBeNull();
    });
  });

  describe('getAnalyses', () => {
    it('should retrieve analyses with default ordering', async () => {
      const mockSupabaseChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [mockAnalysis],
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockSupabaseChain);

      const result = await AnalysisService.getAnalyses(mockUserId);

      expect(mockSupabaseChain.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(result).toEqual([mockAnalysis]);
    });

    it('should apply filters correctly', async () => {
      const filters: AnalysisFilters = {
        ticker_symbol: 'aapl',
        analysis_context: 'investment',
        limit: 10,
        offset: 0,
      };

      const mockSupabaseChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [mockAnalysis],
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockSupabaseChain);

      const result = await AnalysisService.getAnalyses(mockUserId, filters);

      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('ticker_symbol', 'AAPL');
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('analysis_context', 'investment');
      expect(mockSupabaseChain.limit).toHaveBeenCalledWith(10);
      expect(result).toEqual([mockAnalysis]);
    });
  });

  describe('getAnalysesByTicker', () => {
    it('should retrieve analyses for specific ticker', async () => {
      const mockSupabaseChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [mockAnalysis],
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockSupabaseChain);

      const result = await AnalysisService.getAnalysesByTicker(mockUserId, 'AAPL');

      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('ticker_symbol', 'AAPL');
      expect(result).toEqual([mockAnalysis]);
    });
  });

  describe('getRecentAnalyses', () => {
    it('should retrieve recent analyses with limit', async () => {
      const mockSupabaseChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [mockAnalysis],
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockSupabaseChain);

      const result = await AnalysisService.getRecentAnalyses(mockUserId, 5);

      expect(mockSupabaseChain.limit).toHaveBeenCalledWith(5);
      expect(mockSupabaseChain.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(result).toEqual([mockAnalysis]);
    });
  });

  describe('deleteAnalysis', () => {
    it('should delete analysis successfully', async () => {
      const mockSupabaseChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockSupabaseChain);

      await AnalysisService.deleteAnalysis(1, mockUserId);

      expect(supabase.from).toHaveBeenCalledWith('analyses');
      expect(mockSupabaseChain.delete).toHaveBeenCalled();
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('id', 1);
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('user_id', mockUserId);
    });

    it('should throw error if analysis ID is missing', async () => {
      await expect(AnalysisService.deleteAnalysis(0, mockUserId)).rejects.toThrow(
        'Failed to delete analysis: Analysis ID and User ID are required'
      );
    });
  });

  describe('getAnalysisStats', () => {
    it('should calculate analysis statistics', async () => {
      const mockAnalyses = [
        { ...mockAnalysis, analysis_context: 'investment', synthesis_score: 80 },
        { ...mockAnalysis, id: 2, analysis_context: 'trading', synthesis_score: 70, ticker_symbol: 'TSLA' },
        { ...mockAnalysis, id: 3, analysis_context: 'investment', synthesis_score: 90 },
      ];

      const mockSupabaseChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockAnalyses,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockSupabaseChain);

      const result = await AnalysisService.getAnalysisStats(mockUserId);

      expect(result).toEqual({
        total_analyses: 3,
        investment_analyses: 2,
        trading_analyses: 1,
        unique_tickers: 2,
        avg_synthesis_score: 80,
      });
    });
  });
});