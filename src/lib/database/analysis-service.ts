// Analysis management service for Signal-360
// Handles CRUD operations for analysis results with validation and JSONB support

import { supabase } from '../supabaseClient';
import {
  Analysis,
  CreateAnalysisInput,
  AnalysisFilters,
  QueryOptions,
  DatabaseError,
  ConvergenceFactor,
  DivergenceFactor,
  AnalysisReport,
} from '../../types/database';

/**
 * Service class for managing analysis results
 * Provides CRUD operations with validation and JSONB handling
 */
export class AnalysisService {
  /**
   * Create a new analysis record
   * @param userId User ID from auth.users
   * @param input Analysis creation data
   * @returns Promise<Analysis> The created analysis
   * @throws DatabaseError if creation fails
   */
  static async createAnalysis(userId: string, input: CreateAnalysisInput): Promise<Analysis> {
    try {
      // Validate input
      this.validateCreateInput(input);
      
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Prepare analysis data
      const analysisData = {
        user_id: userId,
        ticker_symbol: this.normalizeTickerSymbol(input.ticker_symbol),
        analysis_context: input.analysis_context,
        trading_timeframe: input.trading_timeframe || null,
        synthesis_score: this.validateSynthesisScore(input.synthesis_score),
        convergence_factors: this.validateFactors(input.convergence_factors),
        divergence_factors: this.validateFactors(input.divergence_factors),
        full_report: this.validateReport(input.full_report),
      };

      // Insert analysis into database
      const { data, error } = await supabase
        .from('analyses')
        .insert(analysisData)
        .select()
        .single();

      if (error) {
        throw this.handleDatabaseError(error);
      }

      return data as Analysis;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to create analysis: ${error.message}`);
      }
      throw new Error('Failed to create analysis: Unknown error');
    }
  }

  /**
   * Get analysis by ID
   * @param analysisId Analysis ID
   * @param userId User ID for ownership verification
   * @returns Promise<Analysis | null> The analysis or null if not found
   */
  static async getAnalysis(analysisId: number, userId: string): Promise<Analysis | null> {
    try {
      if (!analysisId || !userId) {
        throw new Error('Analysis ID and User ID are required');
      }

      const { data, error } = await supabase
        .from('analyses')
        .select('*')
        .eq('id', analysisId)
        .eq('user_id', userId)
        .single();

      if (error) {
        // Return null if analysis not found
        if (error.code === 'PGRST116') {
          return null;
        }
        throw this.handleDatabaseError(error);
      }

      return data as Analysis;
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get analyses for a user with filtering and pagination
   * @param userId User ID from auth.users
   * @param filters Optional filters and pagination
   * @returns Promise<Analysis[]> Array of analyses
   */
  static async getAnalyses(userId: string, filters?: AnalysisFilters): Promise<Analysis[]> {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      let query = supabase
        .from('analyses')
        .select('*')
        .eq('user_id', userId);

      // Apply filters
      if (filters) {
        if (filters.ticker_symbol) {
          query = query.eq('ticker_symbol', this.normalizeTickerSymbol(filters.ticker_symbol));
        }
        
        if (filters.analysis_context) {
          query = query.eq('analysis_context', filters.analysis_context);
        }
        
        if (filters.trading_timeframe) {
          query = query.eq('trading_timeframe', filters.trading_timeframe);
        }
        
        if (filters.date_from) {
          query = query.gte('created_at', filters.date_from);
        }
        
        if (filters.date_to) {
          query = query.lte('created_at', filters.date_to);
        }

        // Apply ordering
        const orderBy = filters.order_by || 'created_at';
        const ascending = filters.ascending ?? false;
        query = query.order(orderBy, { ascending });

        // Apply pagination - use range if offset is provided, otherwise use limit
        if (filters.offset !== undefined) {
          const limit = filters.limit || 50;
          query = query.range(filters.offset, filters.offset + limit - 1);
        } else if (filters.limit) {
          query = query.limit(filters.limit);
        }
      } else {
        // Default ordering
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;

      if (error) {
        throw this.handleDatabaseError(error);
      }

      return data as Analysis[];
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get analyses: ${error.message}`);
      }
      throw new Error('Failed to get analyses: Unknown error');
    }
  }

  /**
   * Get analyses by ticker symbol for a user
   * @param userId User ID from auth.users
   * @param tickerSymbol Stock ticker symbol
   * @param options Optional query options
   * @returns Promise<Analysis[]> Array of analyses for the ticker
   */
  static async getAnalysesByTicker(
    userId: string,
    tickerSymbol: string,
    options?: QueryOptions
  ): Promise<Analysis[]> {
    const filters: AnalysisFilters = {
      ticker_symbol: tickerSymbol,
      ...options,
    };

    return this.getAnalyses(userId, filters);
  }

  /**
   * Get recent analyses for a user
   * @param userId User ID from auth.users
   * @param limit Number of analyses to return (default: 10)
   * @returns Promise<Analysis[]> Array of recent analyses
   */
  static async getRecentAnalyses(userId: string, limit: number = 10): Promise<Analysis[]> {
    const filters: AnalysisFilters = {
      limit,
      order_by: 'created_at',
      ascending: false,
    };

    return this.getAnalyses(userId, filters);
  }

  /**
   * Delete an analysis
   * @param analysisId Analysis ID
   * @param userId User ID for ownership verification
   * @returns Promise<void>
   * @throws DatabaseError if deletion fails
   */
  static async deleteAnalysis(analysisId: number, userId: string): Promise<void> {
    try {
      if (!analysisId || !userId) {
        throw new Error('Analysis ID and User ID are required');
      }

      const { error } = await supabase
        .from('analyses')
        .delete()
        .eq('id', analysisId)
        .eq('user_id', userId);

      if (error) {
        throw this.handleDatabaseError(error);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to delete analysis: ${error.message}`);
      }
      throw new Error('Failed to delete analysis: Unknown error');
    }
  }

  /**
   * Get analysis statistics for a user
   * @param userId User ID from auth.users
   * @returns Promise<object> Analysis statistics
   */
  static async getAnalysisStats(userId: string): Promise<{
    total_analyses: number;
    investment_analyses: number;
    trading_analyses: number;
    unique_tickers: number;
    avg_synthesis_score: number;
  }> {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Get all analyses for the user
      const analyses = await this.getAnalyses(userId);

      const stats = {
        total_analyses: analyses.length,
        investment_analyses: analyses.filter(a => a.analysis_context === 'investment').length,
        trading_analyses: analyses.filter(a => a.analysis_context === 'trading').length,
        unique_tickers: new Set(analyses.map(a => a.ticker_symbol)).size,
        avg_synthesis_score: analyses.length > 0 
          ? Math.round(analyses.reduce((sum, a) => sum + a.synthesis_score, 0) / analyses.length)
          : 0,
      };

      return stats;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get analysis stats: ${error.message}`);
      }
      throw new Error('Failed to get analysis stats: Unknown error');
    }
  }

  /**
   * Validate analysis creation input
   * @param input Analysis creation data
   * @throws Error if validation fails
   * @private
   */
  private static validateCreateInput(input: CreateAnalysisInput): void {
    if (!input.ticker_symbol || typeof input.ticker_symbol !== 'string') {
      throw new Error('Ticker symbol is required and must be a string');
    }

    if (!input.analysis_context || !['investment', 'trading'].includes(input.analysis_context)) {
      throw new Error('Analysis context must be either "investment" or "trading"');
    }

    if (input.analysis_context === 'trading' && !input.trading_timeframe) {
      throw new Error('Trading timeframe is required for trading analysis');
    }

    if (input.synthesis_score === undefined || input.synthesis_score === null) {
      throw new Error('Synthesis score is required');
    }

    if (!Array.isArray(input.convergence_factors)) {
      throw new Error('Convergence factors must be an array');
    }

    if (!Array.isArray(input.divergence_factors)) {
      throw new Error('Divergence factors must be an array');
    }

    if (!input.full_report || typeof input.full_report !== 'object') {
      throw new Error('Full report is required and must be an object');
    }
  }

  /**
   * Validate and normalize synthesis score
   * @param score Synthesis score to validate
   * @returns number Validated score
   * @throws Error if score is invalid
   * @private
   */
  private static validateSynthesisScore(score: number): number {
    if (typeof score !== 'number' || isNaN(score)) {
      throw new Error('Synthesis score must be a number');
    }

    if (score < 0 || score > 100) {
      throw new Error('Synthesis score must be between 0 and 100');
    }

    return Math.round(score);
  }

  /**
   * Validate factors array
   * @param factors Array of factors to validate
   * @returns ConvergenceFactor[] | DivergenceFactor[] Validated factors
   * @throws Error if factors are invalid
   * @private
   */
  private static validateFactors(factors: ConvergenceFactor[] | DivergenceFactor[]): any[] {
    if (!Array.isArray(factors)) {
      throw new Error('Factors must be an array');
    }

    // Validate each factor
    factors.forEach((factor, index) => {
      if (!factor || typeof factor !== 'object') {
        throw new Error(`Factor at index ${index} must be an object`);
      }

      if (!factor.category || typeof factor.category !== 'string') {
        throw new Error(`Factor at index ${index} must have a category string`);
      }

      if (!factor.description || typeof factor.description !== 'string') {
        throw new Error(`Factor at index ${index} must have a description string`);
      }

      if (typeof factor.weight !== 'number' || isNaN(factor.weight)) {
        throw new Error(`Factor at index ${index} must have a numeric weight`);
      }
    });

    return factors;
  }

  /**
   * Validate analysis report
   * @param report Analysis report to validate
   * @returns AnalysisReport Validated report
   * @throws Error if report is invalid
   * @private
   */
  private static validateReport(report: AnalysisReport): AnalysisReport {
    if (!report || typeof report !== 'object') {
      throw new Error('Analysis report must be an object');
    }

    if (!report.summary || typeof report.summary !== 'string') {
      throw new Error('Analysis report must have a summary string');
    }

    // Validate optional sections
    ['fundamental', 'technical', 'esg'].forEach(section => {
      if (report[section as keyof AnalysisReport]) {
        const sectionData = report[section as keyof AnalysisReport] as any;
        if (typeof sectionData.score !== 'number' || !Array.isArray(sectionData.factors)) {
          throw new Error(`${section} section must have a numeric score and factors array`);
        }
      }
    });

    return report;
  }

  /**
   * Normalize ticker symbol to uppercase
   * @param ticker Ticker symbol to normalize
   * @returns string Normalized ticker symbol
   * @private
   */
  private static normalizeTickerSymbol(ticker: string): string {
    if (!ticker || typeof ticker !== 'string') {
      throw new Error('Ticker symbol must be a non-empty string');
    }

    return ticker.trim().toUpperCase();
  }

  /**
   * Handle database errors and convert to standardized format
   * @param error Supabase error object
   * @returns DatabaseError Standardized error
   * @private
   */
  private static handleDatabaseError(error: any): DatabaseError {
    return {
      code: error.code || 'UNKNOWN',
      message: error.message || 'Database operation failed',
      details: error.details,
      hint: error.hint,
    };
  }
}