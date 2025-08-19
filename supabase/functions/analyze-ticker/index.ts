// Main orchestrator Edge Function for Signal-360 analysis
// Coordinates fundamental, technical, and ESG analysis with synthesis

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
 * Analysis orchestration result interface
 */
interface AnalysisOrchestrationResult {
  fundamental: FundamentalAnalysisOutput;
  technical: TechnicalAnalysisOutput;
  esg: ESGAnalysisOutput;
  synthesis: SynthesisOutput;
  executionTime: number;
  analysisId: number;
}

/**
 * Analysis execution metrics interface
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
   * Execute complete analysis workflow
   * @param request Analysis request
   * @param userId Authenticated user ID
   * @returns Promise<AnalysisOrchestrationResult> Complete analysis results
   */
  async executeAnalysis(
    request: AnalysisRequest,
    userId: string
  ): Promise<AnalysisOrchestrationResult> {
    const metrics: AnalysisMetrics = {
      startTime: Date.now(),
      totalTime: 0,
      success: false,
      errors: []
    };

    try {
      // Step 1: Get user's encrypted API key
      const apiKey = await this.getUserApiKey(userId);

      // Step 2: Execute analysis modules concurrently
      const analysisResults = await this.executeAnalysisModules(
        request,
        apiKey,
        metrics
      );

      // Step 3: Synthesize results
      const synthesisResult = await this.executeSynthesis(
        request,
        analysisResults,
        metrics
      );

      // Step 4: Store results in database
      const analysisId = await this.storeAnalysisResults(
        userId,
        request,
        synthesisResult
      );

      // Calculate total execution time
      metrics.totalTime = Date.now() - metrics.startTime;
      metrics.success = true;

      console.log(`Analysis completed for ${request.ticker_symbol} in ${metrics.totalTime}ms`);

      return {
        fundamental: analysisResults.fundamental,
        technical: analysisResults.technical,
        esg: analysisResults.esg,
        synthesis: synthesisResult,
        executionTime: metrics.totalTime,
        analysisId
      };

    } catch (error) {
      metrics.totalTime = Date.now() - metrics.startTime;
      metrics.success = false;
      
      if (error instanceof Error) {
        metrics.errors.push(error.message);
      }

      console.error(`Analysis failed for ${request.ticker_symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get user's decrypted API key
   */
  private async getUserApiKey(userId: string): Promise<string> {
    try {
      const db = new DatabaseService();
      const encryptedKey = await db.getEncryptedApiKey(userId);

      if (!encryptedKey) {
        throw new AppError(
          ERROR_CODES.MISSING_API_KEY,
          'User has not configured a Google API key. Please add your API key in the profile section.'
        );
      }

      // Decrypt the API key using the decrypt-api-key function
      const { data, error } = await this.supabase.functions.invoke('decrypt-api-key', {
        body: { encrypted_key: encryptedKey }
      });

      if (error || !data?.api_key) {
        throw new AppError(
          ERROR_CODES.DECRYPTION_ERROR,
          'Failed to decrypt user API key'
        );
      }

      return data.api_key;

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError(
        ERROR_CODES.PROCESSING_ERROR,
        'Failed to retrieve user API key',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Execute all analysis modules concurrently
   */
  private async executeAnalysisModules(
    request: AnalysisRequest,
    apiKey: string,
    metrics: AnalysisMetrics
  ): Promise<{
    fundamental: FundamentalAnalysisOutput;
    technical: TechnicalAnalysisOutput;
    esg: ESGAnalysisOutput;
  }> {
    const analysisInput = {
      ticker_symbol: request.ticker_symbol,
      api_key: apiKey,
      analysis_context: request.analysis_context,
      trading_timeframe: request.trading_timeframe
    };

    try {
      console.log(`Starting concurrent analysis for ${request.ticker_symbol}`);

      // Execute all three analysis modules concurrently
      const [fundamentalResult, technicalResult, esgResult] = await Promise.all([
        this.executeFundamentalAnalysis(analysisInput, metrics),
        this.executeTechnicalAnalysis(analysisInput, metrics),
        this.executeESGAnalysis(analysisInput, metrics)
      ]);

      return {
        fundamental: fundamentalResult,
        technical: technicalResult,
        esg: esgResult
      };

    } catch (error) {
      throw new AppError(
        ERROR_CODES.PROCESSING_ERROR,
        'Failed to execute analysis modules',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Execute fundamental analysis
   */
  private async executeFundamentalAnalysis(
    input: any,
    metrics: AnalysisMetrics
  ): Promise<FundamentalAnalysisOutput> {
    const startTime = Date.now();
    
    try {
      const { data, error } = await withTimeout(
        this.supabase.functions.invoke('fundamental-analysis', { body: input }),
        this.config.external.apiTimeout,
        'Fundamental analysis timed out'
      );

      if (error || !data) {
        throw new Error(`Fundamental analysis failed: ${error?.message || 'Unknown error'}`);
      }

      metrics.fundamentalTime = Date.now() - startTime;
      console.log(`Fundamental analysis completed in ${metrics.fundamentalTime}ms`);

      return data as FundamentalAnalysisOutput;

    } catch (error) {
      metrics.errors.push(`Fundamental: ${error instanceof Error ? error.message : String(error)}`);
      throw new AppError(
        ERROR_CODES.PROCESSING_ERROR,
        'Fundamental analysis failed',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Execute technical analysis
   */
  private async executeTechnicalAnalysis(
    input: any,
    metrics: AnalysisMetrics
  ): Promise<TechnicalAnalysisOutput> {
    const startTime = Date.now();
    
    try {
      const { data, error } = await withTimeout(
        this.supabase.functions.invoke('technical-analysis', { body: input }),
        this.config.external.apiTimeout,
        'Technical analysis timed out'
      );

      if (error || !data) {
        throw new Error(`Technical analysis failed: ${error?.message || 'Unknown error'}`);
      }

      metrics.technicalTime = Date.now() - startTime;
      console.log(`Technical analysis completed in ${metrics.technicalTime}ms`);

      return data as TechnicalAnalysisOutput;

    } catch (error) {
      metrics.errors.push(`Technical: ${error instanceof Error ? error.message : String(error)}`);
      throw new AppError(
        ERROR_CODES.PROCESSING_ERROR,
        'Technical analysis failed',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Execute ESG analysis
   */
  private async executeESGAnalysis(
    input: any,
    metrics: AnalysisMetrics
  ): Promise<ESGAnalysisOutput> {
    const startTime = Date.now();
    
    try {
      const { data, error } = await withTimeout(
        this.supabase.functions.invoke('esg-analysis', { body: input }),
        this.config.external.apiTimeout,
        'ESG analysis timed out'
      );

      if (error || !data) {
        throw new Error(`ESG analysis failed: ${error?.message || 'Unknown error'}`);
      }

      metrics.esgTime = Date.now() - startTime;
      console.log(`ESG analysis completed in ${metrics.esgTime}ms`);

      return data as ESGAnalysisOutput;

    } catch (error) {
      metrics.errors.push(`ESG: ${error instanceof Error ? error.message : String(error)}`);
      throw new AppError(
        ERROR_CODES.PROCESSING_ERROR,
        'ESG analysis failed',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Execute synthesis of all analysis results
   */
  private async executeSynthesis(
    request: AnalysisRequest,
    analysisResults: {
      fundamental: FundamentalAnalysisOutput;
      technical: TechnicalAnalysisOutput;
      esg: ESGAnalysisOutput;
    },
    metrics: AnalysisMetrics
  ): Promise<SynthesisOutput> {
    const startTime = Date.now();

    try {
      const synthesisInput = {
        ticker_symbol: request.ticker_symbol,
        analysis_context: request.analysis_context,
        trading_timeframe: request.trading_timeframe,
        fundamental_result: analysisResults.fundamental,
        technical_result: analysisResults.technical,
        esg_result: analysisResults.esg
      };

      const { data, error } = await withTimeout(
        this.supabase.functions.invoke('synthesis-engine', { body: synthesisInput }),
        this.config.external.apiTimeout,
        'Synthesis timed out'
      );

      if (error || !data) {
        throw new Error(`Synthesis failed: ${error?.message || 'Unknown error'}`);
      }

      metrics.synthesisTime = Date.now() - startTime;
      console.log(`Synthesis completed in ${metrics.synthesisTime}ms`);

      return data as SynthesisOutput;

    } catch (error) {
      metrics.errors.push(`Synthesis: ${error instanceof Error ? error.message : String(error)}`);
      throw new AppError(
        ERROR_CODES.PROCESSING_ERROR,
        'Analysis synthesis failed',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Store analysis results in database
   */
  private async storeAnalysisResults(
    userId: string,
    request: AnalysisRequest,
    synthesis: SynthesisOutput
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

      const analysis = await db.createAnalysis(userId, analysisData);
      
      console.log(`Analysis stored with ID: ${analysis.id}`);
      return analysis.id;

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
    
    logger.info('Request validated successfully', InputSanitizer.sanitizeForLogging({
      ticker: analysisRequest.ticker_symbol,
      context: analysisRequest.analysis_context,
      timeframe: analysisRequest.trading_timeframe
    }));

    monitor.addMetadata({
      ticker: analysisRequest.ticker_symbol,
      context: analysisRequest.analysis_context,
      timeframe: analysisRequest.trading_timeframe
    });

    // Create orchestrator and execute analysis with performance monitoring
    const orchestrator = new AnalysisOrchestrator();
    
    // Check analysis limits before proceeding
    const limitCheckMonitor = createPerformanceMonitor(logger, 'analysis-limit-check');
    await orchestrator.checkAnalysisLimits(userId);
    limitCheckMonitor.end();

    // Execute complete analysis workflow with retry logic
    const analysisMonitor = createPerformanceMonitor(logger, 'complete-analysis');
    const result = await withRetryAndTimeout(
      () => orchestrator.executeAnalysis(analysisRequest, userId),
      120000, // 2 minute timeout for complete analysis
      DEFAULT_RETRY_CONFIG,
      'ticker-analysis'
    );
    const analysisTime = analysisMonitor.end({
      ticker: analysisRequest.ticker_symbol,
      synthesisScore: result.synthesis.synthesis_score
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
      totalTime: analysisTime
    });

    monitor.end(200, undefined, {
      ticker: analysisRequest.ticker_symbol,
      synthesisScore: result.synthesis.synthesis_score,
      analysisTime
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