// --- START OF REPLACEMENT CODE FOR apiService.ts ---

// Removed unused axios imports
import { supabase } from './supabaseClient';
import { errorHandler, ClassifiedError, shouldRetryError, getRetryDelay } from './errorHandler';

// Request interfaces
export interface AnalysisRequest {
  ticker: string;
  context?: 'investment' | 'trading';
}

export interface StartAnalysisRequest {
  ticker: string;
  context?: 'investment' | 'trading';
}

export interface StartAnalysisResponse {
  success: boolean;
  jobId?: string;
  message?: string;
  error?: ApiError;
}

export interface AnalysisStatusRequest {
  jobId: string;
}

export interface AnalysisStatusResponse {
  success: boolean;
  status?: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress?: number;
  currentPhase?: string;
  results?: AnalysisData;
  error?: ApiError;
  message?: string;
}

// Response interfaces based on Edge Function implementation
export interface AnalysisApiResponse {
  success: boolean;
  data?: AnalysisData;
  error?: ApiError;
  partial?: boolean;
  failedAnalyses?: string[];
  message?: string;
  timestamp?: string;
  executionTime?: number;
  ticker?: string;
}

export interface AnalysisData {
  ticker: string;
  timestamp: string;
  context: string;
  fundamental?: FundamentalAnalysis;
  technical?: TechnicalAnalysis;
  esg?: ESGAnalysis;
  synthesis?: SynthesisResult;
}

export interface FundamentalAnalysis {
  score: number;
  factors: any[];
  details: Record<string, any>;
  confidence: number;
}

export interface TechnicalAnalysis {
  score: number;
  factors: any[];
  details: Record<string, any>;
  confidence: number;
}

export interface ESGAnalysis {
  score: number;
  factors: any[];
  details: Record<string, any>;
  confidence: number;
}

export interface SynthesisResult {
  overallScore: number;
  recommendation: string;
  convergence: string[];
  divergence: string[];
  confidence: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: string | Array<{
    field: string;
    message: string;
    code: string;
  }>;
}

// Error response interface
export interface ErrorResponse {
  success: false;
  error: ApiError;
}

// Configuration interface
interface ApiServiceConfig {
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  enableLogging: boolean;
}

// Default configuration
const DEFAULT_CONFIG: ApiServiceConfig = {
  timeout: 60000, // 60 seconds for analysis operations
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
  enableLogging: true,
};

/**
 * Centralized API Service for Signal-360 backend communications
 * Handles all interactions with Supabase Edge Functions
 */
class ApiService {
  private config: ApiServiceConfig;
  private requestId: string = '';

  constructor(config: Partial<ApiServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generates a unique request ID for logging and debugging
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Logs API requests and responses for debugging
   */
  private log(level: 'info' | 'error' | 'warn', message: string, data?: any): void {
    if (!this.config.enableLogging) return;

    const logData = {
      requestId: this.requestId,
      timestamp: new Date().toISOString(),
      message,
      ...(data && { data }),
    };

    console[level](`[ApiService] ${message}`, logData);
  }

  /**
   * Transforms various error types into user-friendly messages using the centralized error handler
   */
  private transformError(error: any): ApiError {
    // Use the centralized error handler for classification
    const classifiedError = errorHandler.classifyError(error, {
      source: 'ApiService',
      requestId: this.requestId,
    });

    // Log the classified error
    errorHandler.logError(classifiedError);

    // Return in the expected ApiError format
    return {
      code: classifiedError.code,
      message: classifiedError.userMessage,
      details: classifiedError.details,
    };
  }

  // Removed unused legacyTransformError method

  // Removed unused getErrorMessage method

  /**
   * Validates ticker input
   */
  private validateTicker(ticker: string): void {
    if (!ticker || ticker.trim().length === 0) {
      throw new Error('Ticker symbol is required');
    }

    const cleanTicker = ticker.trim().toUpperCase();

    // Must be 1-5 uppercase letters only (matches backend validation)
    if (!/^[A-Z]{1,5}$/.test(cleanTicker)) {
      throw new Error('Ticker symbol must be 1-5 letters only (A-Z)');
    }
  }

  /**
   * Implements retry logic for transient failures using the centralized error handler
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    maxAttempts: number = this.config.retryAttempts
  ): Promise<T> {
    let lastError: any;
    let classifiedError: ClassifiedError | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        // Classify the error using the centralized error handler
        classifiedError = errorHandler.classifyError(error, {
          source: 'ApiService.withRetry',
          requestId: this.requestId,
          attemptNumber: attempt,
        });

        // Check if we should retry using the centralized logic
        if (!shouldRetryError(classifiedError, attempt, maxAttempts)) {
          this.log('warn', `Error not retryable: ${classifiedError.code}`, { error: classifiedError });
          throw error;
        }

        // Don't retry on the last attempt
        if (attempt === maxAttempts) {
          break;
        }

        // Calculate retry delay using the centralized logic
        const delay = getRetryDelay(attempt, this.config.retryDelay);
        this.log('warn', `Attempt ${attempt} failed, retrying in ${delay}ms`, { 
          error: classifiedError,
          nextAttempt: attempt + 1,
          maxAttempts 
        });
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * Main function to get analysis for a ticker symbol
   * Uses Supabase Edge Functions for secure backend communication
   */
  async getAnalysisForTicker(ticker: string, context: 'investment' | 'trading' = 'investment'): Promise<AnalysisApiResponse> {
    this.requestId = this.generateRequestId();
    
    try {
      // Validate input
      this.validateTicker(ticker);

      const cleanTicker = ticker.trim().toUpperCase();
      
      this.log('info', 'Starting analysis request', { 
        ticker: cleanTicker, 
        context,
        timeout: this.config.timeout 
      });

      // Prepare request payload
      const requestPayload: AnalysisRequest = {
        ticker: cleanTicker,
        context,
      };

      // Execute with retry logic
      const result = await this.withRetry(async () => {
        // Call Supabase Edge Function
        const { data: responseData, error: supabaseError } = await supabase.functions.invoke(
          'signal-360-analysis',
          {
            body: requestPayload,
          }
        );

        // Handle Supabase client errors
        if (supabaseError) {
          this.log('error', 'Supabase function invocation error', supabaseError);
          throw supabaseError;
        }

        return responseData;
      });

      // Handle Edge Function error responses
      if (result && !result.success) {
        const errorResponse = result as ErrorResponse;
        const apiError = this.transformError(errorResponse);
        
        this.log('error', 'Edge Function returned error', errorResponse);
        
        return {
          success: false,
          error: apiError,
        };
      }

      // Handle successful response
      if (result && result.success) {
        this.log('info', 'Analysis completed successfully', { 
          ticker: result.ticker,
          partial: result.partial,
          executionTime: result.executionTime 
        });

        // Log partial results warning if applicable
        if (result.partial && result.failedAnalyses) {
          this.log('warn', 'Analysis completed with partial results', { 
            failedAnalyses: result.failedAnalyses 
          });
        }

        return {
          success: true,
          data: {
            ticker: result.ticker || cleanTicker,
            timestamp: result.timestamp || new Date().toISOString(),
            context: result.context || context,
            fundamental: result.data?.fundamental,
            technical: result.data?.technical,
            esg: result.data?.esg,
            synthesis: result.data?.synthesis,
          },
          partial: result.partial,
          failedAnalyses: result.failedAnalyses,
          message: result.message,
          executionTime: result.executionTime,
        };
      }

      // Handle unexpected response format
      this.log('error', 'Received unexpected response format', result);
      throw new Error('Received unexpected response format from analysis service');

    } catch (error) {
      this.log('error', 'Analysis request failed', error);
      
      const apiError = this.transformError(error);
      
      return {
        success: false,
        error: apiError,
      };
    }
  }

  /**
   * Start asynchronous analysis for a ticker symbol
   * Returns a jobId for tracking progress
   */
  async startAnalysis(ticker: string, context: 'investment' | 'trading' = 'investment', accessToken?: string): Promise<StartAnalysisResponse> {
    this.requestId = this.generateRequestId();
    
    try {
      // Validate input
      this.validateTicker(ticker);

      const cleanTicker = ticker.trim().toUpperCase();
      
      this.log('info', 'Starting asynchronous analysis request', { 
        ticker: cleanTicker, 
        context 
      });

      // Prepare request payload
      const requestPayload: StartAnalysisRequest = {
        ticker: cleanTicker,
        context,
      };

      // Execute with retry logic
      const result = await this.withRetry(async () => {
        // Validate access token is provided
        if (!accessToken) {
          throw new Error('Authentication token is required');
        }

        // Construct the Edge Function URL
        const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/start-analysis`;
        
        // Make direct fetch call with proper authentication headers
        const response = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify(requestPayload),
        });

        // Handle HTTP errors
        if (!response.ok) {
          const errorText = await response.text();
          this.log('error', 'HTTP request failed', { 
            status: response.status, 
            statusText: response.statusText,
            error: errorText 
          });
          // Throw an object to be classified by the error handler
          throw { 
            status: response.status, 
            message: `HTTP ${response.status}: ${errorText}` 
          };
        }

        // Parse and return the response
        const responseData = await response.json();
        return responseData;
      });

      // Handle Edge Function error responses
      if (result && !result.success) {
        const apiError = this.transformError(result);
        
        this.log('error', 'Start analysis returned error', result);
        
        return {
          success: false,
          error: apiError,
        };
      }
      
      // FIX: The core issue is here. The check for `result.data?.jobId` was incorrect.
      // The `StartAnalysisResponse` interface defines `jobId` at the top level.
      // We now check for `result.jobId` directly.
      if (result && result.success && result.jobId) {
        this.log('info', 'Analysis started successfully', { 
          ticker: cleanTicker,
          jobId: result.jobId 
        });

        return {
          success: true,
          jobId: result.jobId,
          message: result.message,
        };
      }

      // If we reach here, the response was successful but had an unexpected format.
      // We throw the result object itself so it can be properly logged by our improved error handler.
      this.log('error', 'Received unexpected successful response format from start-analysis', result);
      throw result;

    } catch (error) {
      this.log('error', 'Start analysis request failed', error);
      
      const apiError = this.transformError(error);
      
      return {
        success: false,
        error: apiError,
      };
    }
  }

  /**
   * Check the status of an ongoing analysis
   * Returns current progress and results when completed
   */
  async getAnalysisStatus(jobId: string, accessToken?: string): Promise<AnalysisStatusResponse> {
    this.requestId = this.generateRequestId();
    
    try {
      if (!jobId || jobId.trim().length === 0) {
        throw new Error('Job ID is required');
      }

      this.log('info', 'Checking analysis status', { jobId });

      // Prepare request payload
      const requestPayload: AnalysisStatusRequest = {
        jobId: jobId.trim(),
      };

      // Execute with retry logic (fewer retries for status checks)
      const result = await this.withRetry(async () => {
        // Validate access token is provided
        if (!accessToken) {
          throw new Error('Authentication token is required');
        }

        // Construct the Edge Function URL
        const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analysis-status`;
        
        // Make direct fetch call with proper authentication headers
        const response = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify(requestPayload),
        });

        // Handle HTTP errors
        if (!response.ok) {
          const errorText = await response.text();
          this.log('error', 'HTTP request failed', { 
            status: response.status, 
            statusText: response.statusText,
            error: errorText 
          });
          // Throw an object to be classified by the error handler
          throw { 
            status: response.status, 
            message: `HTTP ${response.status}: ${errorText}` 
          };
        }

        // Parse and return the response
        const responseData = await response.json();
        return responseData;
      }, 2); // Only 2 retries for status checks

      // Handle Edge Function error responses
      if (result && !result.success) {
        const apiError = this.transformError(result);
        
        this.log('error', 'Analysis status returned error', result);
        
        return {
          success: false,
          error: apiError,
        };
      }

      // Handle successful response
      if (result && result.success) {
        this.log('info', 'Analysis status retrieved successfully', { 
          jobId,
          status: result.status,
          progress: result.progress 
        });

        return {
          success: true,
          status: result.status,
          progress: result.progress,
          currentPhase: result.currentPhase,
          results: result.results,
          message: result.message,
        };
      }

      // If we reach here, the response was successful but had an unexpected format.
      // We throw the result object itself so it can be properly logged.
      this.log('error', 'Received unexpected response format from analysis-status', result);
      throw result;

    } catch (error) {
      this.log('error', 'Analysis status request failed', error);
      
      const apiError = this.transformError(error);
      
      return {
        success: false,
        error: apiError,
      };
    }
  }

  /**
   * Health check function to verify API connectivity
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; message: string }> {
    try {
      // Simple health check - attempt to call a lightweight function or check auth
      const { error } = await supabase.auth.getSession();
      
      if (error) {
        return {
          status: 'unhealthy',
          message: 'Authentication service unavailable',
        };
      }

      return {
        status: 'healthy',
        message: 'API service is operational',
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'API service unavailable',
      };
    }
  }
}

// Export singleton instance
export const apiService = new ApiService();

// Export class for testing
export { ApiService };

// --- END OF REPLACEMENT CODE FOR apiService.ts ---