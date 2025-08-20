// Analysis repository implementation
// Extends base repository with analysis-specific operations and optimizations

import { BaseRepository, PaginatedResult } from './base-repository';
import { ValidationService } from '../validation';
import { JsonbHelpers } from '../jsonb-helpers';
import { DatabaseOperation } from '../error-handler';
import {
  Analysis,
  CreateAnalysisInput,
  AnalysisFilters,
  QueryOptions,
  ConvergenceFactor,
  DivergenceFactor,
} from '../../../types/database';

/**
 * Analysis repository implementing repository pattern
 * Provides optimized queries and analysis-specific operations
 */
export class AnalysisRepository extends BaseRepository<Analysis, CreateAnalysisInput, never> {
  constructor() {
    super('analyses');
  }

  /**
   * Create analysis with validation and normalization
   * @param userId User ID
   * @param data Analysis creation data
   * @returns Promise<Analysis> Created analysis
   */
  async createForUser(userId: string, data: CreateAnalysisInput): Promise<Analysis> {
    return DatabaseOperation.execute(
      async () => {
        // Validate input
        const validation = ValidationService.validateAnalysisInput(data);
        if (!validation.isValid) {
          throw new Error(`Validation failed: ${validation.error}`);
        }

        // Prepare analysis data with normalization
        const analysisData = {
          user_id: userId,
          ticker_symbol: ValidationService.sanitizeTickerSymbol(data.ticker_symbol),
          analysis_context: data.analysis_context,
          trading_timeframe: data.trading_timeframe ?? null,
          synthesis_score: ValidationService.sanitizeSynthesisScore(data.synthesis_score),
          convergence_factors: data.convergence_factors,
          divergence_factors: data.divergence_factors,
          full_report: data.full_report,
        };

        return super.create(analysisData);
      },
      'Create analysis for user'
    );
  }

  /**
   * Find analyses for specific user
   * @param userId User ID
   * @param filters Additional filters
   * @param options Query options
   * @returns Promise<Analysis[]> User's analyses
   */
  async findByUser(
    userId: string,
    filters: Omit<AnalysisFilters, 'user_id'> = {},
    options: QueryOptions = {}
  ): Promise<Analysis[]> {
    const allFilters = { user_id: userId, ...filters };
    return this.find(allFilters, options);
  }

  /**
   * Find analyses by ticker symbol for user
   * @param userId User ID
   * @param tickerSymbol Ticker symbol
   * @param options Query options
   * @returns Promise<Analysis[]> Analyses for ticker
   */
  async findByUserAndTicker(
    userId: string,
    tickerSymbol: string,
    options: QueryOptions = {}
  ): Promise<Analysis[]> {
    const normalizedTicker = ValidationService.sanitizeTickerSymbol(tickerSymbol);
    return this.findByUser(userId, { ticker_symbol: normalizedTicker }, options);
  }

  /**
   * Find analyses by context for user
   * @param userId User ID
   * @param context Analysis context
   * @param options Query options
   * @returns Promise<Analysis[]> Analyses by context
   */
  async findByUserAndContext(
    userId: string,
    context: 'investment' | 'trading',
    options: QueryOptions = {}
  ): Promise<Analysis[]> {
    return this.findByUser(userId, { analysis_context: context }, options);
  }

  /**
   * Get recent analyses for user
   * @param userId User ID
   * @param limit Number of analyses to return
   * @returns Promise<Analysis[]> Recent analyses
   */
  async getRecentByUser(userId: string, limit: number = 10): Promise<Analysis[]> {
    return this.findByUser(userId, {}, {
      limit,
      order_by: 'created_at',
      ascending: false,
    });
  }

  /**
   * Get top performing analyses for user
   * @param userId User ID
   * @param limit Number of analyses to return
   * @returns Promise<Analysis[]> Top performing analyses
   */
  async getTopPerformingByUser(userId: string, limit: number = 10): Promise<Analysis[]> {
    return this.findByUser(userId, {}, {
      limit,
      order_by: 'synthesis_score',
      ascending: false,
    });
  }

  /**
   * Get analyses within score range for user
   * @param userId User ID
   * @param minScore Minimum synthesis score
   * @param maxScore Maximum synthesis score
   * @param options Query options
   * @returns Promise<Analysis[]> Analyses in score range
   */
  async findByUserAndScoreRange(
    userId: string,
    minScore: number,
    maxScore: number,
    options: QueryOptions = {}
  ): Promise<Analysis[]> {
    return this.findWithComplexFilters(
      (query) => query
        .eq('user_id', userId)
        .gte('synthesis_score', minScore)
        .lte('synthesis_score', maxScore),
      options
    );
  }

  /**
   * Get analyses within date range for user
   * @param userId User ID
   * @param startDate Start date
   * @param endDate End date
   * @param options Query options
   * @returns Promise<Analysis[]> Analyses in date range
   */
  async findByUserAndDateRange(
    userId: string,
    startDate: string,
    endDate: string,
    options: QueryOptions = {}
  ): Promise<Analysis[]> {
    return this.findWithComplexFilters(
      (query) => query
        .eq('user_id', userId)
        .gte('created_at', startDate)
        .lte('created_at', endDate),
      { ...options, order_by: 'created_at', ascending: false }
    );
  }

  /**
   * Search analyses by ticker pattern for user
   * @param userId User ID
   * @param tickerPattern Ticker pattern (supports wildcards)
   * @param options Query options
   * @returns Promise<Analysis[]> Matching analyses
   */
  async searchByUserAndTicker(
    userId: string,
    tickerPattern: string,
    options: QueryOptions = {}
  ): Promise<Analysis[]> {
    const normalizedPattern = tickerPattern.toUpperCase();
    return this.findWithComplexFilters(
      (query) => query
        .eq('user_id', userId)
        .ilike('ticker_symbol', `%${normalizedPattern}%`),
      options
    );
  }

  /**
   * Get paginated analyses for user with advanced filtering
   * @param userId User ID
   * @param filters Analysis filters
   * @param options Query options
   * @returns Promise<PaginatedResult<Analysis>> Paginated results
   */
  async paginateByUser(
    userId: string,
    filters: Omit<AnalysisFilters, 'user_id'> = {},
    options: QueryOptions = {}
  ): Promise<PaginatedResult<Analysis>> {
    const allFilters = { user_id: userId, ...filters };
    return this.paginate(allFilters, options);
  }

  /**
   * Get analysis statistics for user
   * @param userId User ID
   * @returns Promise<AnalysisStats> Analysis statistics
   */
  async getStatsByUser(userId: string): Promise<AnalysisStats> {
    return DatabaseOperation.execute(
      async () => {
        const analyses = await this.findByUser(userId);

        const stats = {
          totalAnalyses: analyses.length,
          investmentAnalyses: analyses.filter(a => a.analysis_context === 'investment').length,
          tradingAnalyses: analyses.filter(a => a.analysis_context === 'trading').length,
          uniqueTickers: new Set(analyses.map(a => a.ticker_symbol)).size,
          averageSynthesisScore: analyses.length > 0
            ? Math.round(analyses.reduce((sum, a) => sum + a.synthesis_score, 0) / analyses.length)
            : 0,
          highestScore: analyses.length > 0
            ? Math.max(...analyses.map(a => a.synthesis_score))
            : 0,
          lowestScore: analyses.length > 0
            ? Math.min(...analyses.map(a => a.synthesis_score))
            : 0,
          analysesThisMonth: analyses.filter(a => {
            const analysisDate = new Date(a.created_at);
            const now = new Date();
            return analysisDate.getMonth() === now.getMonth() && 
                   analysisDate.getFullYear() === now.getFullYear();
          }).length,
        };

        return stats;
      },
      'Get analysis statistics by user'
    );
  }

  /**
   * Get factor analysis for user
   * @param userId User ID
   * @returns Promise<FactorAnalysis> Factor analysis results
   */
  async getFactorAnalysisByUser(userId: string): Promise<FactorAnalysis> {
    return DatabaseOperation.execute(
      async () => {
        const analyses = await this.findByUser(userId);

        const allConvergenceFactors = analyses.flatMap(a => a.convergence_factors);
        const allDivergenceFactors = analyses.flatMap(a => a.divergence_factors);

        const categoryDistribution = JsonbHelpers.getFactorDistribution(
          allConvergenceFactors,
          allDivergenceFactors
        );

        const topConvergenceFactors = JsonbHelpers.getTopFactorsByWeight(
          allConvergenceFactors,
          10
        );

        const topDivergenceFactors = JsonbHelpers.getTopFactorsByWeight(
          allDivergenceFactors,
          10
        );

        return {
          categoryDistribution,
          topConvergenceFactors,
          topDivergenceFactors,
          totalFactors: allConvergenceFactors.length + allDivergenceFactors.length,
          convergenceFactorCount: allConvergenceFactors.length,
          divergenceFactorCount: allDivergenceFactors.length,
        };
      },
      'Get factor analysis by user'
    );
  }

  /**
   * Delete analysis with user verification
   * @param analysisId Analysis ID
   * @param userId User ID for verification
   * @returns Promise<void>
   */
  async deleteByUserAndId(analysisId: number, userId: string): Promise<void> {
    return DatabaseOperation.execute(
      async () => {
        // Verify ownership before deletion
        const analysis = await this.findWithComplexFilters(
          (query) => query.eq('id', analysisId).eq('user_id', userId)
        );

        if (analysis.length === 0) {
          throw new Error('Analysis not found or access denied');
        }

        await this.delete(analysisId);
      },
      'Delete analysis by user and ID'
    );
  }

  /**
   * Bulk delete analyses for user
   * @param analysisIds Array of analysis IDs
   * @param userId User ID for verification
   * @returns Promise<number> Number of deleted analyses
   */
  async bulkDeleteByUser(analysisIds: number[], userId: string): Promise<number> {
    return DatabaseOperation.execute(
      async () => {
        let deletedCount = 0;

        for (const analysisId of analysisIds) {
          try {
            await this.deleteByUserAndId(analysisId, userId);
            deletedCount++;
          } catch (error) {
            // Log error but continue with other deletions
            console.warn(`Failed to delete analysis ${analysisId}:`, error);
          }
        }

        return deletedCount;
      },
      'Bulk delete analyses by user'
    );
  }

  /**
   * Get trending tickers for user
   * @param userId User ID
   * @param limit Number of tickers to return
   * @param days Number of days to look back
   * @returns Promise<TickerTrend[]> Trending tickers
   */
  async getTrendingTickersByUser(
    userId: string,
    limit: number = 10,
    days: number = 30
  ): Promise<TickerTrend[]> {
    return DatabaseOperation.execute(
      async () => {
        const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        
        const recentAnalyses = await this.findWithComplexFilters(
          (query) => query
            .eq('user_id', userId)
            .gte('created_at', cutoffDate),
          { order_by: 'created_at', ascending: false }
        );

        // Handle case where no analyses are found
        if (!recentAnalyses || recentAnalyses.length === 0) {
          return [];
        }

        // Count analyses per ticker
        const tickerCounts = recentAnalyses.reduce((acc, analysis) => {
          const ticker = analysis.ticker_symbol;
          if (!acc[ticker]) {
            acc[ticker] = {
              ticker,
              count: 0,
              averageScore: 0,
              latestAnalysis: analysis.created_at,
            };
          }
          acc[ticker].count++;
          acc[ticker].averageScore += analysis.synthesis_score;
          if (analysis.created_at > acc[ticker].latestAnalysis) {
            acc[ticker].latestAnalysis = analysis.created_at;
          }
          return acc;
        }, {} as Record<string, TickerTrend>);

        // Calculate average scores and sort by count
        const trends = Object.values(tickerCounts)
          .map(trend => ({
            ...trend,
            averageScore: Math.round(trend.averageScore / trend.count),
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, limit);

        return trends;
      },
      'Get trending tickers by user'
    );
  }
}

/**
 * Analysis statistics interface
 */
export interface AnalysisStats {
  totalAnalyses: number;
  investmentAnalyses: number;
  tradingAnalyses: number;
  uniqueTickers: number;
  averageSynthesisScore: number;
  highestScore: number;
  lowestScore: number;
  analysesThisMonth: number;
}

/**
 * Factor analysis interface
 */
export interface FactorAnalysis {
  categoryDistribution: Record<string, { convergence: number; divergence: number; total: number }>;
  topConvergenceFactors: ConvergenceFactor[];
  topDivergenceFactors: DivergenceFactor[];
  totalFactors: number;
  convergenceFactorCount: number;
  divergenceFactorCount: number;
}

/**
 * Ticker trend interface
 */
export interface TickerTrend {
  ticker: string;
  count: number;
  averageScore: number;
  latestAnalysis: string;
}