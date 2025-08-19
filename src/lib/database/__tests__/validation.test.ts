// Unit tests for validation utilities
// Tests validation functions for analysis data

import { describe, it, expect } from 'vitest';
import { ValidationService, VALIDATION_CONSTRAINTS } from '../validation';
import { CreateAnalysisInput, ConvergenceFactor, AnalysisReport } from '../../../types/database';

describe('ValidationService', () => {
  describe('isValidAnalysisContext', () => {
    it('should validate correct analysis contexts', () => {
      expect(ValidationService.isValidAnalysisContext('investment')).toBe(true);
      expect(ValidationService.isValidAnalysisContext('trading')).toBe(true);
    });

    it('should reject invalid analysis contexts', () => {
      expect(ValidationService.isValidAnalysisContext('invalid')).toBe(false);
      expect(ValidationService.isValidAnalysisContext('')).toBe(false);
      expect(ValidationService.isValidAnalysisContext('INVESTMENT')).toBe(false);
    });
  });

  describe('isValidSynthesisScore', () => {
    it('should validate correct synthesis scores', () => {
      expect(ValidationService.isValidSynthesisScore(0)).toBe(true);
      expect(ValidationService.isValidSynthesisScore(50)).toBe(true);
      expect(ValidationService.isValidSynthesisScore(100)).toBe(true);
      expect(ValidationService.isValidSynthesisScore(75.5)).toBe(true);
    });

    it('should reject invalid synthesis scores', () => {
      expect(ValidationService.isValidSynthesisScore(-1)).toBe(false);
      expect(ValidationService.isValidSynthesisScore(101)).toBe(false);
      expect(ValidationService.isValidSynthesisScore(NaN)).toBe(false);
      expect(ValidationService.isValidSynthesisScore('50' as any)).toBe(false);
    });
  });

  describe('isValidTickerSymbol', () => {
    it('should validate correct ticker symbols', () => {
      expect(ValidationService.isValidTickerSymbol('AAPL')).toBe(true);
      expect(ValidationService.isValidTickerSymbol('TSLA')).toBe(true);
      expect(ValidationService.isValidTickerSymbol('A')).toBe(true);
      expect(ValidationService.isValidTickerSymbol('GOOGL')).toBe(true);
    });

    it('should reject invalid ticker symbols', () => {
      expect(ValidationService.isValidTickerSymbol('aapl')).toBe(false);
      expect(ValidationService.isValidTickerSymbol('TOOLONG')).toBe(false);
      expect(ValidationService.isValidTickerSymbol('')).toBe(false);
      expect(ValidationService.isValidTickerSymbol('123')).toBe(false);
      expect(ValidationService.isValidTickerSymbol('AA-PL')).toBe(false);
    });
  });

  describe('isValidTradingTimeframe', () => {
    it('should validate correct trading timeframes', () => {
      expect(ValidationService.isValidTradingTimeframe('1m')).toBe(true);
      expect(ValidationService.isValidTradingTimeframe('1D')).toBe(true);
      expect(ValidationService.isValidTradingTimeframe('1W')).toBe(true);
      expect(ValidationService.isValidTradingTimeframe('1M')).toBe(true);
      expect(ValidationService.isValidTradingTimeframe('4h')).toBe(true);
    });

    it('should reject invalid trading timeframes', () => {
      expect(ValidationService.isValidTradingTimeframe('1x')).toBe(false);
      expect(ValidationService.isValidTradingTimeframe('invalid')).toBe(false);
      expect(ValidationService.isValidTradingTimeframe('')).toBe(false);
      expect(ValidationService.isValidTradingTimeframe('1 day')).toBe(false);
    });
  });

  describe('validateConvergenceFactor', () => {
    it('should validate correct convergence factor', () => {
      const factor: ConvergenceFactor = {
        category: 'fundamental',
        description: 'Strong revenue growth',
        weight: 8.5,
        metadata: { growth_rate: 0.15 },
      };

      const result = ValidationService.validateConvergenceFactor(factor);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject factor without category', () => {
      const factor = {
        description: 'Strong revenue growth',
        weight: 8.5,
      };

      const result = ValidationService.validateConvergenceFactor(factor);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Factor must have a category string');
    });

    it('should reject factor without description', () => {
      const factor = {
        category: 'fundamental',
        weight: 8.5,
      };

      const result = ValidationService.validateConvergenceFactor(factor);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Factor must have a description string');
    });

    it('should reject factor with invalid weight', () => {
      const factor = {
        category: 'fundamental',
        description: 'Strong revenue growth',
        weight: 'invalid',
      };

      const result = ValidationService.validateConvergenceFactor(factor);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Factor must have a numeric weight');
    });

    it('should reject factor with negative weight', () => {
      const factor = {
        category: 'fundamental',
        description: 'Strong revenue growth',
        weight: -5,
      };

      const result = ValidationService.validateConvergenceFactor(factor);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Factor weight must be non-negative');
    });

    it('should reject factor with invalid category', () => {
      const factor = {
        category: 'invalid_category',
        description: 'Strong revenue growth',
        weight: 8.5,
      };

      const result = ValidationService.validateConvergenceFactor(factor);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Factor category must be one of');
    });
  });

  describe('validateFactorsArray', () => {
    it('should validate empty factors array', () => {
      const result = ValidationService.validateFactorsArray([], 'convergence');
      expect(result.isValid).toBe(true);
    });

    it('should validate array with valid factors', () => {
      const factors = [
        {
          category: 'fundamental',
          description: 'Strong revenue growth',
          weight: 8.5,
        },
        {
          category: 'technical',
          description: 'Bullish trend',
          weight: 7.0,
        },
      ];

      const result = ValidationService.validateFactorsArray(factors, 'convergence');
      expect(result.isValid).toBe(true);
    });

    it('should reject non-array input', () => {
      const result = ValidationService.validateFactorsArray('not an array' as any, 'convergence');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('convergence factors must be an array');
    });

    it('should reject array with invalid factor', () => {
      const factors = [
        {
          category: 'fundamental',
          description: 'Strong revenue growth',
          weight: 8.5,
        },
        {
          category: 'technical',
          // missing description
          weight: 7.0,
        },
      ];

      const result = ValidationService.validateFactorsArray(factors, 'convergence');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('convergence factor at index 1');
    });
  });

  describe('validateAnalysisReport', () => {
    it('should validate correct analysis report', () => {
      const report: AnalysisReport = {
        summary: 'This is a comprehensive analysis summary with sufficient detail',
        fundamental: {
          score: 85,
          factors: ['Revenue growth', 'Profit margins'],
          details: { revenue_growth: 0.15 },
        },
        technical: {
          score: 70,
          factors: ['Moving averages', 'RSI'],
          details: { rsi: 65 },
        },
      };

      const result = ValidationService.validateAnalysisReport(report);
      expect(result.isValid).toBe(true);
    });

    it('should reject report without summary', () => {
      const report = {
        fundamental: {
          score: 85,
          factors: ['Revenue growth'],
          details: {},
        },
      };

      const result = ValidationService.validateAnalysisReport(report);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Analysis report must have a summary string');
    });

    it('should reject report with short summary', () => {
      const report = {
        summary: 'Short',
      };

      const result = ValidationService.validateAnalysisReport(report);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Analysis report summary must be at least 10 characters');
    });

    it('should reject report with invalid section', () => {
      const report = {
        summary: 'This is a comprehensive analysis summary with sufficient detail',
        fundamental: {
          score: 'invalid',
          factors: ['Revenue growth'],
          details: {},
        },
      };

      const result = ValidationService.validateAnalysisReport(report);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('fundamental section must have a numeric score');
    });
  });

  describe('validateAnalysisInput', () => {
    const validInput: CreateAnalysisInput = {
      ticker_symbol: 'AAPL',
      analysis_context: 'investment',
      synthesis_score: 75,
      convergence_factors: [
        {
          category: 'fundamental',
          description: 'Strong revenue growth',
          weight: 8.5,
        },
      ],
      divergence_factors: [
        {
          category: 'technical',
          description: 'Overbought RSI',
          weight: 6.0,
        },
      ],
      full_report: {
        summary: 'This is a comprehensive analysis summary with sufficient detail',
        fundamental: {
          score: 85,
          factors: ['Revenue growth'],
          details: { revenue_growth: 0.15 },
        },
      },
    };

    it('should validate correct analysis input', () => {
      const result = ValidationService.validateAnalysisInput(validInput);
      expect(result.isValid).toBe(true);
    });

    it('should validate trading analysis with timeframe', () => {
      const tradingInput = {
        ...validInput,
        analysis_context: 'trading' as const,
        trading_timeframe: '1D',
      };

      const result = ValidationService.validateAnalysisInput(tradingInput);
      expect(result.isValid).toBe(true);
    });

    it('should reject trading analysis without timeframe', () => {
      const tradingInput = {
        ...validInput,
        analysis_context: 'trading' as const,
      };

      const result = ValidationService.validateAnalysisInput(tradingInput);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Trading timeframe is required for trading analysis');
    });

    it('should reject invalid ticker symbol', () => {
      const invalidInput = {
        ...validInput,
        ticker_symbol: 'invalid123',
      };

      const result = ValidationService.validateAnalysisInput(invalidInput);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Ticker symbol must be 1-5 uppercase letters');
    });

    it('should reject invalid synthesis score', () => {
      const invalidInput = {
        ...validInput,
        synthesis_score: 150,
      };

      const result = ValidationService.validateAnalysisInput(invalidInput);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Synthesis score must be a number between 0 and 100');
    });
  });

  describe('sanitizeTickerSymbol', () => {
    it('should sanitize ticker symbols correctly', () => {
      expect(ValidationService.sanitizeTickerSymbol('aapl')).toBe('AAPL');
      expect(ValidationService.sanitizeTickerSymbol('  tsla  ')).toBe('TSLA');
      expect(ValidationService.sanitizeTickerSymbol('goog123')).toBe('GOOG');
      expect(ValidationService.sanitizeTickerSymbol('aa-pl')).toBe('AAPL');
    });

    it('should handle invalid input', () => {
      expect(ValidationService.sanitizeTickerSymbol('')).toBe('');
      expect(ValidationService.sanitizeTickerSymbol(null as any)).toBe('');
      expect(ValidationService.sanitizeTickerSymbol('123')).toBe('');
    });
  });

  describe('sanitizeSynthesisScore', () => {
    it('should sanitize synthesis scores correctly', () => {
      expect(ValidationService.sanitizeSynthesisScore(75.7)).toBe(76);
      expect(ValidationService.sanitizeSynthesisScore(-10)).toBe(0);
      expect(ValidationService.sanitizeSynthesisScore(150)).toBe(100);
      expect(ValidationService.sanitizeSynthesisScore(50.4)).toBe(50);
    });

    it('should handle invalid input', () => {
      expect(ValidationService.sanitizeSynthesisScore(NaN)).toBe(0);
      expect(ValidationService.sanitizeSynthesisScore('invalid' as any)).toBe(0);
    });
  });

  describe('VALIDATION_CONSTRAINTS', () => {
    it('should have correct constraint values', () => {
      expect(VALIDATION_CONSTRAINTS.TICKER_SYMBOL.MIN_LENGTH).toBe(1);
      expect(VALIDATION_CONSTRAINTS.TICKER_SYMBOL.MAX_LENGTH).toBe(5);
      expect(VALIDATION_CONSTRAINTS.SYNTHESIS_SCORE.MIN).toBe(0);
      expect(VALIDATION_CONSTRAINTS.SYNTHESIS_SCORE.MAX).toBe(100);
      expect(VALIDATION_CONSTRAINTS.FACTOR_CATEGORIES).toContain('fundamental');
      expect(VALIDATION_CONSTRAINTS.TRADING_TIMEFRAMES).toContain('1D');
    });
  });
});