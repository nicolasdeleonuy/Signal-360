// Unit tests for JSONB helper utilities
// Tests JSONB data manipulation and querying functions

import { describe, it, expect } from 'vitest';
import { JsonbHelpers } from '../jsonb-helpers';
import { 
  ConvergenceFactor, 
  DivergenceFactor, 
  AnalysisReport, 
  Analysis 
} from '../../../types/database';

describe('JsonbHelpers', () => {
  const mockConvergenceFactors: ConvergenceFactor[] = [
    {
      category: 'fundamental',
      description: 'Strong revenue growth',
      weight: 8.5,
      metadata: { growth_rate: 0.15 },
    },
    {
      category: 'technical',
      description: 'Bullish trend',
      weight: 7.0,
      metadata: { trend_strength: 0.8 },
    },
    {
      category: 'fundamental',
      description: 'High profit margins',
      weight: 6.5,
      metadata: { margin: 0.25 },
    },
  ];

  const mockDivergenceFactors: DivergenceFactor[] = [
    {
      category: 'technical',
      description: 'Overbought RSI',
      weight: 6.0,
      metadata: { rsi_value: 75 },
    },
    {
      category: 'esg',
      description: 'Environmental concerns',
      weight: 4.5,
      metadata: { esg_score: 45 },
    },
  ];

  const mockReport: AnalysisReport = {
    summary: 'Mixed signals with strong fundamentals but technical concerns',
    fundamental: {
      score: 85,
      factors: ['Revenue growth', 'Profit margins'],
      details: { revenue_growth: 0.15, margin: 0.25 },
    },
    technical: {
      score: 65,
      factors: ['Moving averages', 'RSI'],
      details: { rsi: 75, ma_trend: 'bullish' },
    },
    esg: {
      score: 50,
      factors: ['Environmental impact'],
      details: { carbon_footprint: 'high' },
    },
  };

  describe('getConvergenceFactorsByCategory', () => {
    it('should filter convergence factors by category', () => {
      const fundamentalFactors = JsonbHelpers.getConvergenceFactorsByCategory(
        mockConvergenceFactors,
        'fundamental'
      );

      expect(fundamentalFactors).toHaveLength(2);
      expect(fundamentalFactors[0].description).toBe('Strong revenue growth');
      expect(fundamentalFactors[1].description).toBe('High profit margins');
    });

    it('should return empty array for non-existent category', () => {
      const result = JsonbHelpers.getConvergenceFactorsByCategory(
        mockConvergenceFactors,
        'nonexistent'
      );

      expect(result).toHaveLength(0);
    });

    it('should handle empty factors array', () => {
      const result = JsonbHelpers.getConvergenceFactorsByCategory([], 'fundamental');
      expect(result).toHaveLength(0);
    });

    it('should handle invalid input', () => {
      const result = JsonbHelpers.getConvergenceFactorsByCategory(null as any, 'fundamental');
      expect(result).toHaveLength(0);
    });
  });

  describe('getDivergenceFactorsByCategory', () => {
    it('should filter divergence factors by category', () => {
      const technicalFactors = JsonbHelpers.getDivergenceFactorsByCategory(
        mockDivergenceFactors,
        'technical'
      );

      expect(technicalFactors).toHaveLength(1);
      expect(technicalFactors[0].description).toBe('Overbought RSI');
    });
  });

  describe('getTotalWeightByCategory', () => {
    it('should calculate total weight for category', () => {
      const fundamentalWeight = JsonbHelpers.getTotalWeightByCategory(
        mockConvergenceFactors,
        'fundamental'
      );

      expect(fundamentalWeight).toBe(15.0); // 8.5 + 6.5
    });

    it('should return 0 for non-existent category', () => {
      const weight = JsonbHelpers.getTotalWeightByCategory(
        mockConvergenceFactors,
        'nonexistent'
      );

      expect(weight).toBe(0);
    });

    it('should handle empty factors array', () => {
      const weight = JsonbHelpers.getTotalWeightByCategory([], 'fundamental');
      expect(weight).toBe(0);
    });
  });

  describe('getUniqueCategories', () => {
    it('should return unique categories from both factor arrays', () => {
      const categories = JsonbHelpers.getUniqueCategories(
        mockConvergenceFactors,
        mockDivergenceFactors
      );

      expect(categories).toHaveLength(3);
      expect(categories).toContain('fundamental');
      expect(categories).toContain('technical');
      expect(categories).toContain('esg');
    });

    it('should handle empty arrays', () => {
      const categories = JsonbHelpers.getUniqueCategories([], []);
      expect(categories).toHaveLength(0);
    });

    it('should handle invalid input', () => {
      const categories = JsonbHelpers.getUniqueCategories(null as any, undefined as any);
      expect(categories).toHaveLength(0);
    });
  });

  describe('getFactorDistribution', () => {
    it('should calculate factor distribution by category', () => {
      const distribution = JsonbHelpers.getFactorDistribution(
        mockConvergenceFactors,
        mockDivergenceFactors
      );

      expect(distribution.fundamental).toEqual({
        convergence: 15.0,
        divergence: 0,
        total: 15.0,
      });

      expect(distribution.technical).toEqual({
        convergence: 7.0,
        divergence: 6.0,
        total: 13.0,
      });

      expect(distribution.esg).toEqual({
        convergence: 0,
        divergence: 4.5,
        total: 4.5,
      });
    });
  });

  describe('getReportSection', () => {
    it('should extract fundamental section', () => {
      const section = JsonbHelpers.getReportSection(mockReport, 'fundamental');

      expect(section).toEqual({
        score: 85,
        factors: ['Revenue growth', 'Profit margins'],
        details: { revenue_growth: 0.15, margin: 0.25 },
      });
    });

    it('should return null for non-existent section', () => {
      const reportWithoutTechnical = {
        summary: 'Test summary',
        fundamental: mockReport.fundamental,
      };

      const section = JsonbHelpers.getReportSection(reportWithoutTechnical, 'technical');
      expect(section).toBeNull();
    });

    it('should handle invalid report', () => {
      const section = JsonbHelpers.getReportSection(null as any, 'fundamental');
      expect(section).toBeNull();
    });
  });

  describe('calculateWeightedScore', () => {
    it('should calculate weighted average with default weights', () => {
      const score = JsonbHelpers.calculateWeightedScore(mockReport);

      // (85 * 0.4) + (65 * 0.4) + (50 * 0.2) = 34 + 26 + 10 = 70
      expect(score).toBe(70);
    });

    it('should calculate weighted average with custom weights', () => {
      const customWeights = { fundamental: 0.6, technical: 0.3, esg: 0.1 };
      const score = JsonbHelpers.calculateWeightedScore(mockReport, customWeights);

      // (85 * 0.6) + (65 * 0.3) + (50 * 0.1) = 51 + 19.5 + 5 = 75.5 -> 76
      expect(score).toBe(76);
    });

    it('should handle missing sections', () => {
      const partialReport = {
        summary: 'Test summary',
        fundamental: mockReport.fundamental,
      };

      const score = JsonbHelpers.calculateWeightedScore(partialReport);
      expect(score).toBe(85); // Only fundamental section available
    });
  });

  describe('searchFactorsByDescription', () => {
    it('should find factors by description text', () => {
      const results = JsonbHelpers.searchFactorsByDescription(
        mockConvergenceFactors,
        'revenue'
      );

      expect(results).toHaveLength(1);
      expect(results[0].description).toBe('Strong revenue growth');
    });

    it('should be case insensitive', () => {
      const results = JsonbHelpers.searchFactorsByDescription(
        mockConvergenceFactors,
        'REVENUE'
      );

      expect(results).toHaveLength(1);
    });

    it('should return empty array for no matches', () => {
      const results = JsonbHelpers.searchFactorsByDescription(
        mockConvergenceFactors,
        'nonexistent'
      );

      expect(results).toHaveLength(0);
    });

    it('should handle invalid input', () => {
      const results = JsonbHelpers.searchFactorsByDescription(null as any, 'test');
      expect(results).toHaveLength(0);
    });
  });

  describe('getTopFactorsByWeight', () => {
    it('should return top factors by weight', () => {
      const topFactors = JsonbHelpers.getTopFactorsByWeight(mockConvergenceFactors, 2);

      expect(topFactors).toHaveLength(2);
      expect(topFactors[0].weight).toBe(8.5);
      expect(topFactors[1].weight).toBe(7.0);
    });

    it('should handle limit larger than array', () => {
      const topFactors = JsonbHelpers.getTopFactorsByWeight(mockConvergenceFactors, 10);

      expect(topFactors).toHaveLength(3);
    });

    it('should handle empty array', () => {
      const topFactors = JsonbHelpers.getTopFactorsByWeight([], 5);
      expect(topFactors).toHaveLength(0);
    });
  });

  describe('mergeAnalysisReports', () => {
    it('should merge multiple reports', () => {
      const report1: AnalysisReport = {
        summary: 'First report',
        fundamental: { score: 80, factors: ['Factor 1'], details: { detail1: 'value1' } },
      };

      const report2: AnalysisReport = {
        summary: 'Second report',
        fundamental: { score: 90, factors: ['Factor 2'], details: { detail2: 'value2' } },
        technical: { score: 70, factors: ['Tech factor'], details: { tech: 'value' } },
      };

      const merged = JsonbHelpers.mergeAnalysisReports([report1, report2]);

      expect(merged.summary).toBe('First report | Second report');
      expect(merged.fundamental?.score).toBe(85); // Average of 80 and 90
      expect(merged.fundamental?.factors).toEqual(['Factor 1', 'Factor 2']);
      expect(merged.technical?.score).toBe(70);
    });

    it('should handle single report', () => {
      const merged = JsonbHelpers.mergeAnalysisReports([mockReport]);
      expect(merged).toEqual(mockReport);
    });

    it('should handle empty array', () => {
      const merged = JsonbHelpers.mergeAnalysisReports([]);
      expect(merged.summary).toBe('No reports to merge');
    });
  });

  describe('createAnalysisSummary', () => {
    it('should create analysis summary', () => {
      const mockAnalysis: Analysis = {
        id: 1,
        user_id: 'user123',
        created_at: '2024-01-01T00:00:00Z',
        ticker_symbol: 'AAPL',
        analysis_context: 'investment',
        trading_timeframe: null,
        synthesis_score: 75,
        convergence_factors: mockConvergenceFactors,
        divergence_factors: mockDivergenceFactors,
        full_report: mockReport,
      };

      const summary = JsonbHelpers.createAnalysisSummary(mockAnalysis);

      expect(summary.ticker).toBe('AAPL');
      expect(summary.context).toBe('investment');
      expect(summary.score).toBe(75);
      expect(summary.topConvergenceFactors).toHaveLength(3);
      expect(summary.topDivergenceFactors).toHaveLength(2);
      expect(summary.categoryDistribution).toHaveProperty('fundamental');
      expect(summary.reportSummary).toBe(mockReport.summary);
    });
  });

  describe('validateJsonbStructure', () => {
    it('should validate factors structure', () => {
      const validFactors = [
        {
          category: 'fundamental',
          description: 'Test factor',
          weight: 5.0,
        },
      ];

      expect(JsonbHelpers.validateJsonbStructure(validFactors, 'factors')).toBe(true);
    });

    it('should reject invalid factors structure', () => {
      const invalidFactors = [
        {
          category: 'fundamental',
          // missing description and weight
        },
      ];

      expect(JsonbHelpers.validateJsonbStructure(invalidFactors, 'factors')).toBe(false);
    });

    it('should validate report structure', () => {
      const validReport = {
        summary: 'Test summary',
        fundamental: { score: 80, factors: [], details: {} },
      };

      expect(JsonbHelpers.validateJsonbStructure(validReport, 'report')).toBe(true);
    });

    it('should reject invalid report structure', () => {
      const invalidReport = {
        // missing summary
        fundamental: { score: 80, factors: [], details: {} },
      };

      expect(JsonbHelpers.validateJsonbStructure(invalidReport, 'report')).toBe(false);
    });
  });
});