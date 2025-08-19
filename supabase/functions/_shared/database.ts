// Database utilities for Edge Functions
// Provides database operations for profiles and analyses

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Profile, Analysis, ConvergenceFactor, DivergenceFactor, AnalysisReport } from './types.ts';
import { AppError, ERROR_CODES } from './errors.ts';
import { getConfig } from './config.ts';

/**
 * Database service class for Edge Functions
 */
export class DatabaseService {
  private supabase: SupabaseClient;

  constructor(serviceRoleKey?: string) {
    const config = getConfig();
    
    this.supabase = createClient(
      config.supabase.url,
      serviceRoleKey || config.supabase.serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
  }

  /**
   * Get user profile by ID
   * @param userId User ID from auth.users
   * @returns Promise<Profile | null> User profile or null if not found
   */
  async getProfile(userId: string): Promise<Profile | null> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        throw new AppError(
          ERROR_CODES.DATABASE_ERROR,
          'Failed to fetch user profile',
          error.message
        );
      }

      return data;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        ERROR_CODES.DATABASE_ERROR,
        'Database operation failed',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Get user's encrypted API key
   * @param userId User ID from auth.users
   * @returns Promise<string | null> Encrypted API key or null if not set
   */
  async getEncryptedApiKey(userId: string): Promise<string | null> {
    const profile = await this.getProfile(userId);
    return profile?.encrypted_google_api_key || null;
  }

  /**
   * Create new analysis record
   * @param userId User ID from auth.users
   * @param analysisData Analysis data to store
   * @returns Promise<Analysis> Created analysis record
   */
  async createAnalysis(
    userId: string,
    analysisData: {
      ticker_symbol: string;
      analysis_context: 'investment' | 'trading';
      trading_timeframe?: string;
      synthesis_score: number;
      convergence_factors: ConvergenceFactor[];
      divergence_factors: DivergenceFactor[];
      full_report: AnalysisReport;
    }
  ): Promise<Analysis> {
    try {
      const { data, error } = await this.supabase
        .from('analyses')
        .insert({
          user_id: userId,
          ticker_symbol: analysisData.ticker_symbol,
          analysis_context: analysisData.analysis_context,
          trading_timeframe: analysisData.trading_timeframe,
          synthesis_score: analysisData.synthesis_score,
          convergence_factors: analysisData.convergence_factors,
          divergence_factors: analysisData.divergence_factors,
          full_report: analysisData.full_report
        })
        .select()
        .single();

      if (error) {
        throw new AppError(
          ERROR_CODES.DATABASE_ERROR,
          'Failed to create analysis record',
          error.message
        );
      }

      return data;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        ERROR_CODES.DATABASE_ERROR,
        'Database operation failed',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Get analysis by ID with user ownership verification
   * @param analysisId Analysis ID
   * @param userId User ID for ownership verification
   * @returns Promise<Analysis | null> Analysis record or null if not found/not owned
   */
  async getAnalysis(analysisId: number, userId: string): Promise<Analysis | null> {
    try {
      const { data, error } = await this.supabase
        .from('analyses')
        .select('*')
        .eq('id', analysisId)
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        throw new AppError(
          ERROR_CODES.DATABASE_ERROR,
          'Failed to fetch analysis',
          error.message
        );
      }

      return data;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        ERROR_CODES.DATABASE_ERROR,
        'Database operation failed',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Get user's recent analyses
   * @param userId User ID from auth.users
   * @param limit Number of analyses to return (default: 10)
   * @returns Promise<Analysis[]> Array of recent analyses
   */
  async getRecentAnalyses(userId: string, limit: number = 10): Promise<Analysis[]> {
    try {
      const { data, error } = await this.supabase
        .from('analyses')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw new AppError(
          ERROR_CODES.DATABASE_ERROR,
          'Failed to fetch recent analyses',
          error.message
        );
      }

      return data || [];
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        ERROR_CODES.DATABASE_ERROR,
        'Database operation failed',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Get analysis statistics for user
   * @param userId User ID from auth.users
   * @returns Promise<AnalysisStats> User's analysis statistics
   */
  async getAnalysisStats(userId: string): Promise<AnalysisStats> {
    try {
      const { data, error } = await this.supabase
        .from('analyses')
        .select('analysis_context, synthesis_score, ticker_symbol')
        .eq('user_id', userId);

      if (error) {
        throw new AppError(
          ERROR_CODES.DATABASE_ERROR,
          'Failed to fetch analysis statistics',
          error.message
        );
      }

      const analyses = data || [];
      const totalAnalyses = analyses.length;
      const investmentAnalyses = analyses.filter(a => a.analysis_context === 'investment').length;
      const tradingAnalyses = analyses.filter(a => a.analysis_context === 'trading').length;
      const uniqueTickers = new Set(analyses.map(a => a.ticker_symbol)).size;
      const avgSynthesisScore = totalAnalyses > 0
        ? Math.round(analyses.reduce((sum, a) => sum + a.synthesis_score, 0) / totalAnalyses)
        : 0;

      return {
        total_analyses: totalAnalyses,
        investment_analyses: investmentAnalyses,
        trading_analyses: tradingAnalyses,
        unique_tickers: uniqueTickers,
        avg_synthesis_score: avgSynthesisScore
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        ERROR_CODES.DATABASE_ERROR,
        'Database operation failed',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Check if user has reached analysis limits
   * @param userId User ID from auth.users
   * @param timeWindow Time window in milliseconds (default: 1 hour)
   * @param maxAnalyses Maximum analyses allowed in time window (default: 10)
   * @returns Promise<boolean> True if user has reached limit
   */
  async hasReachedAnalysisLimit(
    userId: string,
    timeWindow: number = 3600000, // 1 hour
    maxAnalyses: number = 10
  ): Promise<boolean> {
    try {
      const cutoffTime = new Date(Date.now() - timeWindow).toISOString();

      const { count, error } = await this.supabase
        .from('analyses')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', cutoffTime);

      if (error) {
        throw new AppError(
          ERROR_CODES.DATABASE_ERROR,
          'Failed to check analysis limits',
          error.message
        );
      }

      return (count || 0) >= maxAnalyses;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        ERROR_CODES.DATABASE_ERROR,
        'Database operation failed',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Test database connectivity
   * @returns Promise<boolean> True if database is accessible
   */
  async testConnection(): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('profiles')
        .select('count')
        .limit(1);

      return !error;
    } catch {
      return false;
    }
  }
}

/**
 * Analysis statistics interface
 */
export interface AnalysisStats {
  total_analyses: number;
  investment_analyses: number;
  trading_analyses: number;
  unique_tickers: number;
  avg_synthesis_score: number;
}

/**
 * Create database service instance
 * @param serviceRoleKey Optional service role key (uses config default if not provided)
 * @returns DatabaseService instance
 */
export function createDatabaseService(serviceRoleKey?: string): DatabaseService {
  return new DatabaseService(serviceRoleKey);
}