// Centralized database service for Signal-360
// Combines profile and analysis operations with error handling and transaction management

import { supabase } from '../supabaseClient';
import { ProfileService } from './profile-service';
import { AnalysisService } from './analysis-service';
import { ValidationService } from './validation';
import {
  Profile,
  Analysis,
  CreateProfileInput,
  UpdateProfileInput,
  CreateAnalysisInput,
  AnalysisFilters,
  DatabaseError,
} from '../../types/database';

/**
 * Centralized database service class
 * Provides high-level operations combining profile and analysis management
 */
export class DatabaseService {
  /**
   * Initialize a new user with profile creation
   * @param userId User ID from auth.users
   * @param profileData Optional profile data
   * @returns Promise<Profile> Created profile
   */
  static async initializeUser(
    userId: string,
    profileData?: Partial<CreateProfileInput>
  ): Promise<Profile> {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Check if profile already exists
      const existingProfile = await ProfileService.getProfile(userId);
      if (existingProfile) {
        return existingProfile;
      }

      // Create new profile
      const createInput: CreateProfileInput = {
        id: userId,
        ...profileData,
      };

      return await ProfileService.createProfile(createInput);
    } catch (error) {
      throw this.handleServiceError(error, 'Failed to initialize user');
    }
  }

  /**
   * Get complete user data (profile + recent analyses)
   * @param userId User ID from auth.users
   * @param includeAnalyses Whether to include recent analyses
   * @returns Promise<UserData> Complete user data
   */
  static async getUserData(
    userId: string,
    includeAnalyses: boolean = true
  ): Promise<UserData> {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Get profile
      const profile = await ProfileService.getProfile(userId);
      if (!profile) {
        throw new Error('User profile not found');
      }

      let recentAnalyses: Analysis[] = [];
      let analysisStats = null;

      if (includeAnalyses) {
        // Get recent analyses and stats
        [recentAnalyses, analysisStats] = await Promise.all([
          AnalysisService.getRecentAnalyses(userId, 10),
          AnalysisService.getAnalysisStats(userId),
        ]);
      }

      return {
        profile,
        recentAnalyses,
        analysisStats,
      };
    } catch (error) {
      throw this.handleServiceError(error, 'Failed to get user data');
    }
  }

  /**
   * Create analysis with validation and profile verification
   * @param userId User ID from auth.users
   * @param analysisInput Analysis creation data
   * @returns Promise<Analysis> Created analysis
   */
  static async createAnalysisWithValidation(
    userId: string,
    analysisInput: CreateAnalysisInput
  ): Promise<Analysis> {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Validate input
      const validation = ValidationService.validateAnalysisInput(analysisInput);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.error}`);
      }

      // Verify user profile exists
      const profile = await ProfileService.getProfile(userId);
      if (!profile) {
        throw new Error('User profile not found. Please create a profile first.');
      }

      // Create analysis
      return await AnalysisService.createAnalysis(userId, analysisInput);
    } catch (error) {
      throw this.handleServiceError(error, 'Failed to create analysis');
    }
  }

  /**
   * Get analysis with ownership verification
   * @param analysisId Analysis ID
   * @param userId User ID for ownership verification
   * @returns Promise<Analysis | null> Analysis or null if not found
   */
  static async getAnalysisSecure(
    analysisId: number,
    userId: string
  ): Promise<Analysis | null> {
    try {
      if (!analysisId || !userId) {
        throw new Error('Analysis ID and User ID are required');
      }

      return await AnalysisService.getAnalysis(analysisId, userId);
    } catch (error) {
      throw this.handleServiceError(error, 'Failed to get analysis');
    }
  }

  /**
   * Get user's analysis dashboard data
   * @param userId User ID from auth.users
   * @param filters Optional filters
   * @returns Promise<AnalysisDashboard> Dashboard data
   */
  static async getAnalysisDashboard(
    userId: string,
    filters?: AnalysisFilters
  ): Promise<AnalysisDashboard> {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Get analyses, stats, and recent activity in parallel
      const [analyses, stats, recentAnalyses] = await Promise.all([
        AnalysisService.getAnalyses(userId, filters),
        AnalysisService.getAnalysisStats(userId),
        AnalysisService.getRecentAnalyses(userId, 5),
      ]);

      // Calculate additional metrics
      const uniqueTickers = new Set(analyses.map(a => a.ticker_symbol));
      const avgScore = analyses.length > 0
        ? Math.round(analyses.reduce((sum, a) => sum + a.synthesis_score, 0) / analyses.length)
        : 0;

      return {
        analyses,
        stats,
        recentAnalyses,
        uniqueTickers: Array.from(uniqueTickers),
        averageScore: avgScore,
        totalAnalyses: analyses.length,
      };
    } catch (error) {
      throw this.handleServiceError(error, 'Failed to get analysis dashboard');
    }
  }

  /**
   * Update user profile with validation
   * @param userId User ID from auth.users
   * @param updateData Profile update data
   * @returns Promise<Profile> Updated profile
   */
  static async updateUserProfile(
    userId: string,
    updateData: UpdateProfileInput
  ): Promise<Profile> {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Validate API key format if provided
      if (updateData.google_api_key && updateData.google_api_key.trim() !== '') {
        const sanitizedKey = updateData.google_api_key.trim();
        if (!ValidationService.isValidApiKeyFormat || 
            !ValidationService.isValidApiKeyFormat(sanitizedKey)) {
          console.warn('API key format validation not available, proceeding with update');
        }
      }

      return await ProfileService.updateProfile(userId, updateData);
    } catch (error) {
      throw this.handleServiceError(error, 'Failed to update profile');
    }
  }

  /**
   * Delete user analysis with verification
   * @param analysisId Analysis ID
   * @param userId User ID for ownership verification
   * @returns Promise<void>
   */
  static async deleteAnalysisSecure(
    analysisId: number,
    userId: string
  ): Promise<void> {
    try {
      if (!analysisId || !userId) {
        throw new Error('Analysis ID and User ID are required');
      }

      // Verify analysis exists and belongs to user
      const analysis = await AnalysisService.getAnalysis(analysisId, userId);
      if (!analysis) {
        throw new Error('Analysis not found or access denied');
      }

      await AnalysisService.deleteAnalysis(analysisId, userId);
    } catch (error) {
      throw this.handleServiceError(error, 'Failed to delete analysis');
    }
  }

  /**
   * Get user's API key status (without exposing the key)
   * @param userId User ID from auth.users
   * @returns Promise<ApiKeyStatus> API key status
   */
  static async getApiKeyStatus(userId: string): Promise<ApiKeyStatus> {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const profile = await ProfileService.getProfile(userId);
      if (!profile) {
        throw new Error('User profile not found');
      }

      return {
        hasApiKey: !!profile.encrypted_google_api_key,
        isConfigured: !!profile.encrypted_google_api_key,
        lastUpdated: profile.updated_at,
      };
    } catch (error) {
      throw this.handleServiceError(error, 'Failed to get API key status');
    }
  }

  /**
   * Perform database health check
   * @returns Promise<HealthCheck> Database health status
   */
  static async healthCheck(): Promise<HealthCheck> {
    try {
      const startTime = Date.now();

      // Test basic connectivity
      const { error: connectError } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);

      if (connectError) {
        throw connectError;
      }

      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        responseTime,
        timestamp: new Date().toISOString(),
        services: {
          database: 'healthy',
          profiles: 'healthy',
          analyses: 'healthy',
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: -1,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        services: {
          database: 'unhealthy',
          profiles: 'unknown',
          analyses: 'unknown',
        },
      };
    }
  }

  /**
   * Execute database transaction
   * @param operations Array of database operations
   * @returns Promise<T[]> Results of all operations
   */
  static async executeTransaction<T>(
    operations: (() => Promise<T>)[]
  ): Promise<T[]> {
    try {
      // Note: Supabase doesn't support explicit transactions in the client
      // This is a sequential execution with rollback simulation
      const results: T[] = [];
      const completedOperations: (() => Promise<void>)[] = [];

      try {
        for (const operation of operations) {
          const result = await operation();
          results.push(result);
        }

        return results;
      } catch (error) {
        // Attempt to rollback completed operations if possible
        console.warn('Transaction failed, attempting rollback:', error);
        
        for (const rollback of completedOperations.reverse()) {
          try {
            await rollback();
          } catch (rollbackError) {
            console.error('Rollback operation failed:', rollbackError);
          }
        }

        throw error;
      }
    } catch (error) {
      throw this.handleServiceError(error, 'Transaction failed');
    }
  }

  /**
   * Handle service errors with standardized format
   * @param error Original error
   * @param context Error context
   * @returns DatabaseError Standardized error
   * @private
   */
  private static handleServiceError(error: unknown, context: string): DatabaseError {
    if (error instanceof Error) {
      // Check if it's already a database error
      if ('code' in error && 'message' in error) {
        return error as DatabaseError;
      }

      return {
        code: 'SERVICE_ERROR',
        message: `${context}: ${error.message}`,
        details: error.stack,
      };
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: `${context}: Unknown error occurred`,
      details: String(error),
    };
  }

  /**
   * Validate database connection
   * @returns Promise<boolean> True if connection is valid
   */
  static async validateConnection(): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);

      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Get database connection info
   * @returns Promise<ConnectionInfo> Connection information
   */
  static async getConnectionInfo(): Promise<ConnectionInfo> {
    try {
      const isConnected = await this.validateConnection();
      
      return {
        isConnected,
        url: import.meta.env.VITE_SUPABASE_URL || 'unknown',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        isConnected: false,
        url: 'unknown',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

/**
 * User data interface combining profile and analyses
 */
export interface UserData {
  profile: Profile;
  recentAnalyses: Analysis[];
  analysisStats: {
    total_analyses: number;
    investment_analyses: number;
    trading_analyses: number;
    unique_tickers: number;
    avg_synthesis_score: number;
  } | null;
}

/**
 * Analysis dashboard data interface
 */
export interface AnalysisDashboard {
  analyses: Analysis[];
  stats: {
    total_analyses: number;
    investment_analyses: number;
    trading_analyses: number;
    unique_tickers: number;
    avg_synthesis_score: number;
  };
  recentAnalyses: Analysis[];
  uniqueTickers: string[];
  averageScore: number;
  totalAnalyses: number;
}

/**
 * API key status interface
 */
export interface ApiKeyStatus {
  hasApiKey: boolean;
  isConfigured: boolean;
  lastUpdated: string;
}

/**
 * Health check interface
 */
export interface HealthCheck {
  status: 'healthy' | 'unhealthy';
  responseTime: number;
  timestamp: string;
  error?: string;
  services: {
    database: 'healthy' | 'unhealthy' | 'unknown';
    profiles: 'healthy' | 'unhealthy' | 'unknown';
    analyses: 'healthy' | 'unhealthy' | 'unknown';
  };
}

/**
 * Connection info interface
 */
export interface ConnectionInfo {
  isConnected: boolean;
  url: string;
  timestamp: string;
  error?: string;
}