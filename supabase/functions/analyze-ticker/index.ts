// High-Performance Analysis Orchestrator for Signal-360
// Optimized for speed with graceful degradation and resilient error handling

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  createRequestHandler,
  parseJsonBody,
  createSuccessHttpResponse,
  createErrorHttpResponse,
  authenticateUser,
  createAuthErrorResponse,
  validateAnalysisRequest,
  createLogger,
  createRequestMonitor,
  createPerformanceMonitor,
  createSecurityMiddleware,
  SecurityHeaders,
  InputSanitizer,
  withRetryAndTimeout,
  DEFAULT_RETRY_CONFIG,
  AppError,
  ERROR_CODES,
  getConfig,
  withTimeout,
  DatabaseService,
  AnalysisRequest,
  AnalysisResponse,
  FundamentalAnalysisOutput,
  TechnicalAnalysisOutput,
  ESGAnalysisOutput,
  SynthesisOutput
} from '../_shared/index.ts';

/**
 * Analysis orchestration result interface with partial results support
 */
interface AnalysisOrchestrationResult {
  fundamental: FundamentalAnalysisOutput | null;
  technical: TechnicalAnalysisOutput | null;
  esg: ESGAnalysisOutput | null;
  synthesis: SynthesisOutput;
  executionTime: number;
  analysisId: number;
  completedAnalyses: string[];
  failedAnalyses: string[];
}

/**
 * Enhanced analysis execution metrics interface
 */
interface AnalysisMetrics {
  startTime: number;
  fundamentalTime?: number;
  technicalTime?: number;
  esgTime?: number;
  synthesisTime?: number;
  totalTime: number;
  success: boolean;
  errors: string[];
  completedCount: number;
  failedCount: number;
}

/**
 * Individual analysis result wrapper
 */
interface AnalysisResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  executionTime: number;
}

/**
 * Main analysis orchestrator class
 */
class AnalysisOrchestrator {
  private config: any;
  private supabase: any;

  constructor() {
    this.config = getConfig();
    
    // Create Supabase client for function invocations
    const { createClient } = require('https://esm.sh/@supabase/supabase-js@2');
    this.supabase = createClient(
      this.config.supabase.url,
      this.config.supabase.anonKey
    );
  }

  /**
   * SMOKE TEST: Simplified analysis workflow to test basic functionality
   * @param request Analysis request
   * @param userId Authenticated user ID
   * @param jobId Optional job ID for asynchronous workflow
   * @returns Promise<AnalysisOrchestrationResult> Analysis results (partial if needed)
   */
  async executeAnalysis(
    request: AnalysisRequest,
    userId: string,
    jobId?: string
  ): Promise<AnalysisOrchestrationResult> {
    // SMOKE TEST: Comment out all complex logic and implement simple test
    console.log(`[SMOKE TEST] Orchestrator started for ticker: ${request.ticker_symbol}, JobID: ${jobId}`);
    
    // Simulate a 15-second analysis workload
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    console.log(`[SMOKE TEST] Simulated analysis complete. Storing dummy results for JobID: ${jobId}`);
    
    // Create dummy synthesis result
    const dummySynthesisResult: SynthesisOutput = {
      synthesis_score: 99,
      convergence_factors: [{ 
        category: 'Test', 
        description: 'Smoke Test Successful', 
        weight: 1, 
        supporting_analyses: ['system'],
        metadata: { test: true }
      }],
      divergence_factors: [],
      trade_parameters: { 
        entry_price: 100, 
        stop_loss: 95, 
        take_profit_levels: [105, 110],
        risk_reward_ratio: 1.5,
        position_size_recommendation: 5,
        confidence: 1.0,
        methodology: 'smoke-test',
        metadata: {
          calculation_timestamp: new Date().toISOString(),
          volatility_used: 0.2,
          support_resistance_levels: { support: [95], resistance: [110] },
          risk_metrics: {
            max_drawdown_risk: 0.05,
            expected_return: 0.1,
            sharpe_estimate: 1.5
          }
        }
      },
      full_report: {
        summary: 'This is a successful smoke test. The async workflow is operational.',
        recommendation: 'buy',
        fundamental: null,
        technical: null,
        esg: null,
        synthesis_methodology: 'smoke-test-methodology',
        limitations: ['This is a smoke test - not real analysis'],
        actionable_insights: ['Smoke test completed successfully'],
        metadata: {
          analysis_timestamp: new Date().toISOString(),
          data_sources: ['smoke-test'],
          api_version: '1.0-smoke-test',
          confidence_score: 1.0,
          factor_analysis_summary: {
            convergence_factors: 1,
            divergence_factors: 0,
            net_sentiment: 99
          }
        }
      },
      confidence: 1.0
    };
    
    // Store the dummy results
    const analysisId = await this.storeAnalysisResults(
      userId,
      request,
      dummySynthesisResult,
      jobId
    );
    
    console.log(`[SMOKE TEST] Dummy results stored successfully for JobID: ${jobId}`);
    
    // Return simplified result for the orchestrator's return type
    return {
      fundamental: null,
      technical: null,
      esg: null,
      synthesis: dummySynthesisResult,
      analysisId: analysisId,
      executionTime: 15000,
      completedAnalyses: ['smoke-test'],
      failedAnalyses: []
    };
  }

  // COMMENTED OUT FOR SMOKE TEST - All complex analysis methods removed

  /**
   * Store analysis results in database
   */
  private async storeAnalysisResults(
    userId: string,
    request: AnalysisRequest,
    synthesis: SynthesisOutput,
    jobId?: string
  ): Promise<number> {
    try {
      const db = new DatabaseService();
      
      const analysisData = {
        ticker_symbol: request.ticker_symbol,
        analysis_context: request.analysis_context,
        trading_timeframe: request.trading_timeframe,
        synthesis_score: synthesis.synthesis_score,
        convergence_factors: synthesis.convergence_factors,
        divergence_factors: synthesis.divergence_factors,
        full_report: synthesis.full_report
      };

      if (jobId) {
        // Asynchronous workflow: Update existing job in jobs table
        // This updates the job status to 'completed' and stores the full analysis result
        console.log(`Updating job ${jobId} with analysis results`);
        
        const { data, error } = await this.supabase
          .from('analysis_jobs')
          .update({
            status: 'completed',
            progress_percentage: 100,
            current_phase: 'completed',
            result_data: analysisData,
            updated_at: new Date().toISOString()
          })
          .eq('id', jobId)
          .eq('user_id', userId) // Ensure user can only update their own jobs
          .select('id')
          .single();

        if (error) {
          throw new Error(`Failed to update job: ${error.message}`);
        }

        if (!data) {
          throw new Error(`Job ${jobId} not found or access denied`);
        }

        console.log(`Job ${jobId} updated successfully`);
        return parseInt(jobId); // Return jobId as number for consistency

      } else {
        // Synchronous workflow: Create new analysis record in analyses table
        // This maintains backward compatibility with existing synchronous calls
        const analysis = await db.createAnalysis(userId, analysisData);
        
        console.log(`Analysis stored with ID: ${analysis.id}`);
        return analysis.id;
      }

    } catch (error) {
      // Log error but don't fail the entire analysis
      console.error('Failed to store analysis results:', error);
      
      throw new AppError(
        ERROR_CODES.DATABASE_ERROR,
        'Failed to store analysis results',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Check if user has reached analysis limits
   */
  private async checkAnalysisLimits(userId: string): Promise<void> {
    try {
      const db = new DatabaseService();
      const hasReachedLimit = await db.hasReachedAnalysisLimit(userId);

      if (hasReachedLimit) {
        throw new AppError(
          ERROR_CODES.RATE_LIMIT_EXCEEDED,
          'Analysis limit reached. Please wait before requesting another analysis.',
          'User has exceeded hourly analysis limit'
        );
      }

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      // If we can't check limits, log warning but allow analysis
      console.warn('Failed to check analysis limits:', error);
    }
  }
}

/**
 * Enhanced main request handler with comprehensive security and validation
 */
const handleAnalyzeTickerRequest = async (request: Request, requestId: string): Promise<Response> => {
  const logger = createLogger('analyze-ticker', requestId);
  const monitor = createRequestMonitor('analyze-ticker', requestId, request.method, logger);
  const security = createSecurityMiddleware(logger, 'ANALYSIS');

  try {
    logger.info('Starting ticker analysis request');

    // Security validation (rate limiting, headers, etc.)
    await security.validateRequest(request);

    // Authenticate user
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      monitor.end(401, authResult.error?.code);
      throw new AppError(
        authResult.error?.code || ERROR_CODES.INVALID_TOKEN,
        authResult.error?.message || 'Authentication failed'
      );
    }

    const userId = authResult.user!.user_id;
    logger.info('User authenticated successfully', { userId });
    monitor.addMetadata({ userId });

    // Parse and validate request body with enhanced validation
    const body = await parseJsonBody(request);
    const validation = validateAnalysisRequest(body);
    
    if (!validation.isValid) {
      monitor.end(400, ERROR_CODES.INVALID_REQUEST);
      throw new AppError(
        ERROR_CODES.INVALID_REQUEST,
        `Validation failed: ${validation.error}`
      );
    }

    const analysisRequest = validation.sanitizedData as AnalysisRequest;
    
    // Additional security: sanitize ticker symbol
    analysisRequest.ticker_symbol = InputSanitizer.sanitizeTicker(analysisRequest.ticker_symbol);
    
    // Validate jobId if provided (for asynchronous workflow)
    if (analysisRequest.jobId) {
      // Validate jobId format (should be a valid UUID or string)
      if (typeof analysisRequest.jobId !== 'string' || analysisRequest.jobId.trim().length === 0) {
        monitor.end(400, ERROR_CODES.INVALID_PARAMETER);
        throw new AppError(
          ERROR_CODES.INVALID_PARAMETER,
          'Invalid jobId format'
        );
      }
      analysisRequest.jobId = analysisRequest.jobId.trim();
    }
    
    logger.info('Request validated successfully', InputSanitizer.sanitizeForLogging({
      ticker: analysisRequest.ticker_symbol,
      context: analysisRequest.analysis_context,
      timeframe: analysisRequest.trading_timeframe,
      jobId: analysisRequest.jobId,
      isAsync: !!analysisRequest.jobId
    }));

    monitor.addMetadata({
      ticker: analysisRequest.ticker_symbol,
      context: analysisRequest.analysis_context,
      timeframe: analysisRequest.trading_timeframe,
      jobId: analysisRequest.jobId,
      isAsync: !!analysisRequest.jobId
    });

    // Create orchestrator and execute analysis with performance monitoring
    const orchestrator = new AnalysisOrchestrator();
    
    // Check analysis limits before proceeding - COMMENTED OUT FOR SMOKE TEST
    const limitCheckMonitor = createPerformanceMonitor(logger, 'analysis-limit-check');
    // await orchestrator.checkAnalysisLimits(userId);
    limitCheckMonitor.end();

    // Execute optimized analysis workflow with extended timeout
    const analysisMonitor = createPerformanceMonitor(logger, 'complete-analysis');
    const result = await withRetryAndTimeout(
      () => orchestrator.executeAnalysis(analysisRequest, userId, analysisRequest.jobId),
      90000, // Reduced to 90 seconds but with better internal optimization
      {
        maxAttempts: 1, // No retries for the full workflow to save time
        baseDelay: 0,
        maxDelay: 0,
        backoffMultiplier: 1,
        jitter: false
      },
      'ticker-analysis'
    );
    const analysisTime = analysisMonitor.end({
      ticker: analysisRequest.ticker_symbol,
      synthesisScore: result.synthesis.synthesis_score,
      completedAnalyses: result.completedAnalyses.length,
      failedAnalyses: result.failedAnalyses.length
    });

    // Format response with security headers
    const responseData: AnalysisResponse['data'] = {
      analysis_id: result.analysisId,
      ticker_symbol: analysisRequest.ticker_symbol,
      synthesis_score: result.synthesis.synthesis_score,
      convergence_factors: result.synthesis.convergence_factors,
      divergence_factors: result.synthesis.divergence_factors,
      full_report: result.synthesis.full_report
    };

    logger.info('Analysis completed successfully', {
      ticker: analysisRequest.ticker_symbol,
      synthesisScore: result.synthesis.synthesis_score,
      analysisId: result.analysisId,
      totalTime: analysisTime,
      jobId: analysisRequest.jobId,
      isAsync: !!analysisRequest.jobId
    });

    monitor.end(200, undefined, {
      ticker: analysisRequest.ticker_symbol,
      synthesisScore: result.synthesis.synthesis_score,
      analysisTime,
      jobId: analysisRequest.jobId,
      isAsync: !!analysisRequest.jobId
    });

    security.recordResult(request, true);

    // Create response with security headers
    const response = createSuccessHttpResponse(responseData, requestId);
    
    // Add additional security headers
    const securityHeaders = SecurityHeaders.getSecurityHeaders();
    for (const [key, value] of Object.entries(securityHeaders)) {
      response.headers.set(key, value);
    }

    return response;

  } catch (error) {
    logger.error('Analysis request failed', error, {
      ticker: (request as any).ticker_symbol,
      userId: (request as any).userId
    });

    monitor.end(error.statusCode || 500, error.code, {
      errorType: error.constructor.name
    });

    security.recordResult(request, false);

    const errorResponse = createErrorHttpResponse(error, requestId);
    
    // Add security headers to error responses too
    const securityHeaders = SecurityHeaders.getSecurityHeaders();
    for (const [key, value] of Object.entries(securityHeaders)) {
      errorResponse.headers.set(key, value);
    }

    return errorResponse;
  }
};

// Create and serve the request handler
const handler = createRequestHandler(handleAnalyzeTickerRequest, ['POST']);

serve(handler);