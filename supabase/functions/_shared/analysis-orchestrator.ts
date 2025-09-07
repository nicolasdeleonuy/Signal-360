// Analysis Orchestrator Utilities
// Helper functions for coordinating analysis pipeline with secure API key management

import { createLogger, Logger } from './logging.ts';
import { getDecryptedApiKeySimple, validateApiKeyComplete } from './api-key-service.ts';
import { AppError, ERROR_CODES } from './index.ts';

/**
 * Analysis orchestrator for managing the complete analysis pipeline
 */
export class AnalysisOrchestrator {
  private logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger || createLogger('analysis-orchestrator');
  }

  /**
   * Validate and retrieve API key for analysis
   * @param userId User ID
   * @param requestId Request ID for tracking
   * @returns Promise<string> Validated API key
   */
  async validateAndGetApiKey(userId: string, requestId?: string): Promise<string> {
    try {
      this.logger.info('Validating API key for analysis', { userId, requestId });

      // Get decrypted API key
      const apiKey = await getDecryptedApiKeySimple(userId, 'google_api', requestId, this.logger);

      // Validate the key format and functionality
      const validation = await validateApiKeyComplete(apiKey, 'google_api');
      
      if (!validation.isValid) {
        this.logger.error('API key validation failed', { 
          userId, 
          requestId, 
          errors: validation.errors 
        });
        
        throw new AppError(
          ERROR_CODES.INVALID_API_KEY,
          `API key validation failed: ${validation.errors.join(', ')}`
        );
      }

      this.logger.info('API key validated successfully', { userId, requestId });
      return apiKey;

    } catch (error) {
      this.logger.error('API key validation error', { error, userId, requestId });
      
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError(
        ERROR_CODES.MISSING_API_KEY,
        'Failed to retrieve or validate API key. Please ensure your Google API key is configured in your profile.',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Execute analysis with proper error handling and progress tracking
   * @param userId User ID
   * @param ticker Stock ticker
   * @param context Analysis context
   * @param progressCallback Optional callback for progress updates
   * @returns Promise<any> Analysis results
   */
  async executeAnalysis(
    userId: string,
    ticker: string,
    context: 'investment' | 'trading',
    progressCallback?: (progress: number, phase: string) => void
  ): Promise<any> {
    try {
      this.logger.info('Starting analysis execution', { userId, ticker, context });

      // Step 1: Validate API key (5% progress)
      progressCallback?.(5, 'api_key_validation');
      const apiKey = await this.validateAndGetApiKey(userId);

      // Step 2: Data fetching (25% progress)
      progressCallback?.(25, 'data_fetching');
      // This would call the actual analysis functions
      
      // Step 3: Analysis processing (75% progress)
      progressCallback?.(75, 'analysis_processing');
      // This would process the analysis results
      
      // Step 4: Synthesis (90% progress)
      progressCallback?.(90, 'synthesis');
      // This would synthesize the final results
      
      // Step 5: Complete (100% progress)
      progressCallback?.(100, 'completed');

      this.logger.info('Analysis execution completed', { userId, ticker, context });

      // Return mock results for now - this will be replaced with actual analysis
      return {
        synthesis_score: 75,
        recommendation: 'BUY',
        confidence: 85,
        convergence_factors: ['Strong fundamentals', 'Positive technical indicators'],
        divergence_factors: ['High valuation'],
        metadata: {
          analysis_timestamp: new Date().toISOString(),
          ticker_symbol: ticker,
          analysis_context: context
        }
      };

    } catch (error) {
      this.logger.error('Analysis execution failed', { error, userId, ticker, context });
      throw error;
    }
  }

  /**
   * Get user's API key status and information
   * @param userId User ID
   * @returns Promise<object> API key status information
   */
  async getApiKeyStatus(userId: string): Promise<{
    hasKey: boolean;
    isValid: boolean;
    keyType: string;
    lastUsed?: string;
    errors: string[];
  }> {
    try {
      // Try to get the API key
      const apiKey = await getDecryptedApiKeySimple(userId, 'google_api');
      
      // Validate the key
      const validation = await validateApiKeyComplete(apiKey, 'google_api');
      
      return {
        hasKey: true,
        isValid: validation.isValid,
        keyType: 'google_api',
        errors: validation.errors
      };

    } catch (error) {
      this.logger.warn('Could not retrieve API key status', { error, userId });
      
      return {
        hasKey: false,
        isValid: false,
        keyType: 'google_api',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }
}

/**
 * Simple helper function to create an orchestrator instance
 * @param logger Optional logger instance
 * @returns AnalysisOrchestrator instance
 */
export function createAnalysisOrchestrator(logger?: Logger): AnalysisOrchestrator {
  return new AnalysisOrchestrator(logger);
}

/**
 * Quick API key validation for analysis functions
 * @param userId User ID
 * @param requestId Optional request ID
 * @returns Promise<string> Validated API key
 */
export async function getValidatedApiKey(userId: string, requestId?: string): Promise<string> {
  const orchestrator = new AnalysisOrchestrator();
  return orchestrator.validateAndGetApiKey(userId, requestId);
}