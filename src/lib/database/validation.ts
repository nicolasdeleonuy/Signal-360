// Validation utilities for database operations
// Provides reusable validation functions for analysis data

import {
  ConvergenceFactor,
  DivergenceFactor,
  AnalysisReport,
  CreateAnalysisInput,
} from '../../types/database';

/**
 * Validation service for analysis data
 * Provides comprehensive validation functions with detailed error messages
 */
export class ValidationService {
  /**
   * Validate analysis context value
   * @param context Analysis context to validate
   * @returns boolean True if valid
   */
  static isValidAnalysisContext(context: string): context is 'investment' | 'trading' {
    return context === 'investment' || context === 'trading';
  }

  /**
   * Validate synthesis score range
   * @param score Score to validate
   * @returns boolean True if valid
   */
  static isValidSynthesisScore(score: number): boolean {
    return typeof score === 'number' && !isNaN(score) && score >= 0 && score <= 100;
  }

  /**
   * Validate ticker symbol format
   * @param ticker Ticker symbol to validate
   * @returns boolean True if valid
   */
  static isValidTickerSymbol(ticker: string): boolean {
    if (!ticker || typeof ticker !== 'string') {
      return false;
    }

    // Basic ticker validation: 1-5 uppercase letters
    const tickerPattern = /^[A-Z]{1,5}$/;
    return tickerPattern.test(ticker.trim().toUpperCase());
  }

  /**
   * Validate trading timeframe format
   * @param timeframe Timeframe to validate
   * @returns boolean True if valid
   */
  static isValidTradingTimeframe(timeframe: string): boolean {
    if (!timeframe || typeof timeframe !== 'string') {
      return false;
    }

    // Common trading timeframes
    const validTimeframes = [
      '1m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h',
      '1D', '1W', '1M', '3M', '6M', '1Y'
    ];

    return validTimeframes.includes(timeframe);
  }

  /**
   * Validate convergence factor structure
   * @param factor Factor to validate
   * @returns ValidationResult Validation result with details
   */
  static validateConvergenceFactor(factor: any): ValidationResult {
    if (!factor || typeof factor !== 'object') {
      return { isValid: false, error: 'Factor must be an object' };
    }

    if (!factor.category || typeof factor.category !== 'string') {
      return { isValid: false, error: 'Factor must have a category string' };
    }

    if (!factor.description || typeof factor.description !== 'string') {
      return { isValid: false, error: 'Factor must have a description string' };
    }

    if (typeof factor.weight !== 'number' || isNaN(factor.weight)) {
      return { isValid: false, error: 'Factor must have a numeric weight' };
    }

    if (factor.weight < 0) {
      return { isValid: false, error: 'Factor weight must be non-negative' };
    }

    // Validate category values
    const validCategories = ['fundamental', 'technical', 'esg', 'sentiment', 'macro'];
    if (!validCategories.includes(factor.category.toLowerCase())) {
      return { 
        isValid: false, 
        error: `Factor category must be one of: ${validCategories.join(', ')}` 
      };
    }

    return { isValid: true };
  }

  /**
   * Validate divergence factor structure
   * @param factor Factor to validate
   * @returns ValidationResult Validation result with details
   */
  static validateDivergenceFactor(factor: any): ValidationResult {
    // Divergence factors have the same structure as convergence factors
    return this.validateConvergenceFactor(factor);
  }

  /**
   * Validate array of factors
   * @param factors Array of factors to validate
   * @param factorType Type of factors for error messages
   * @returns ValidationResult Validation result with details
   */
  static validateFactorsArray(
    factors: any[], 
    factorType: 'convergence' | 'divergence'
  ): ValidationResult {
    if (!Array.isArray(factors)) {
      return { isValid: false, error: `${factorType} factors must be an array` };
    }

    // Allow empty arrays
    if (factors.length === 0) {
      return { isValid: true };
    }

    // Validate each factor
    for (let i = 0; i < factors.length; i++) {
      const validation = factorType === 'convergence' 
        ? this.validateConvergenceFactor(factors[i])
        : this.validateDivergenceFactor(factors[i]);

      if (!validation.isValid) {
        return { 
          isValid: false, 
          error: `${factorType} factor at index ${i}: ${validation.error}` 
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Validate analysis report structure
   * @param report Report to validate
   * @returns ValidationResult Validation result with details
   */
  static validateAnalysisReport(report: any): ValidationResult {
    if (!report || typeof report !== 'object') {
      return { isValid: false, error: 'Analysis report must be an object' };
    }

    if (!report.summary || typeof report.summary !== 'string') {
      return { isValid: false, error: 'Analysis report must have a summary string' };
    }

    if (report.summary.trim().length < 10) {
      return { isValid: false, error: 'Analysis report summary must be at least 10 characters' };
    }

    // Validate optional sections
    const sections = ['fundamental', 'technical', 'esg'];
    for (const section of sections) {
      if (report[section]) {
        const sectionValidation = this.validateReportSection(report[section], section);
        if (!sectionValidation.isValid) {
          return sectionValidation;
        }
      }
    }

    return { isValid: true };
  }

  /**
   * Validate a report section (fundamental, technical, esg)
   * @param section Section to validate
   * @param sectionName Name of the section for error messages
   * @returns ValidationResult Validation result with details
   * @private
   */
  private static validateReportSection(section: any, sectionName: string): ValidationResult {
    if (!section || typeof section !== 'object') {
      return { isValid: false, error: `${sectionName} section must be an object` };
    }

    if (typeof section.score !== 'number' || isNaN(section.score)) {
      return { isValid: false, error: `${sectionName} section must have a numeric score` };
    }

    if (section.score < 0 || section.score > 100) {
      return { isValid: false, error: `${sectionName} section score must be between 0 and 100` };
    }

    if (!Array.isArray(section.factors)) {
      return { isValid: false, error: `${sectionName} section must have a factors array` };
    }

    if (!section.details || typeof section.details !== 'object') {
      return { isValid: false, error: `${sectionName} section must have a details object` };
    }

    return { isValid: true };
  }

  /**
   * Validate complete analysis input
   * @param input Analysis input to validate
   * @returns ValidationResult Validation result with details
   */
  static validateAnalysisInput(input: CreateAnalysisInput): ValidationResult {
    // Validate ticker symbol
    if (!this.isValidTickerSymbol(input.ticker_symbol)) {
      return { 
        isValid: false, 
        error: 'Ticker symbol must be 1-5 uppercase letters' 
      };
    }

    // Validate analysis context
    if (!this.isValidAnalysisContext(input.analysis_context)) {
      return { 
        isValid: false, 
        error: 'Analysis context must be either "investment" or "trading"' 
      };
    }

    // Validate trading timeframe for trading analysis
    if (input.analysis_context === 'trading') {
      if (!input.trading_timeframe) {
        return { 
          isValid: false, 
          error: 'Trading timeframe is required for trading analysis' 
        };
      }

      if (!this.isValidTradingTimeframe(input.trading_timeframe)) {
        return { 
          isValid: false, 
          error: 'Invalid trading timeframe format' 
        };
      }
    }

    // Validate synthesis score
    if (!this.isValidSynthesisScore(input.synthesis_score)) {
      return { 
        isValid: false, 
        error: 'Synthesis score must be a number between 0 and 100' 
      };
    }

    // Validate convergence factors
    const convergenceValidation = this.validateFactorsArray(
      input.convergence_factors, 
      'convergence'
    );
    if (!convergenceValidation.isValid) {
      return convergenceValidation;
    }

    // Validate divergence factors
    const divergenceValidation = this.validateFactorsArray(
      input.divergence_factors, 
      'divergence'
    );
    if (!divergenceValidation.isValid) {
      return divergenceValidation;
    }

    // Validate analysis report
    const reportValidation = this.validateAnalysisReport(input.full_report);
    if (!reportValidation.isValid) {
      return reportValidation;
    }

    return { isValid: true };
  }

  /**
   * Sanitize ticker symbol
   * @param ticker Raw ticker input
   * @returns string Sanitized ticker symbol
   */
  static sanitizeTickerSymbol(ticker: string): string {
    if (!ticker || typeof ticker !== 'string') {
      return '';
    }

    return ticker.trim().toUpperCase().replace(/[^A-Z]/g, '');
  }

  /**
   * Sanitize synthesis score
   * @param score Raw score input
   * @returns number Sanitized score
   */
  static sanitizeSynthesisScore(score: number): number {
    if (typeof score !== 'number' || isNaN(score)) {
      return 0;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Analysis validation constraints
 */
export const VALIDATION_CONSTRAINTS = {
  TICKER_SYMBOL: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 5,
    PATTERN: /^[A-Z]{1,5}$/,
  },
  SYNTHESIS_SCORE: {
    MIN: 0,
    MAX: 100,
  },
  SUMMARY: {
    MIN_LENGTH: 10,
    MAX_LENGTH: 1000,
  },
  FACTOR_CATEGORIES: ['fundamental', 'technical', 'esg', 'sentiment', 'macro'],
  TRADING_TIMEFRAMES: [
    '1m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h',
    '1D', '1W', '1M', '3M', '6M', '1Y'
  ],
} as const;