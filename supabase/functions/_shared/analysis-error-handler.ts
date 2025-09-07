// Enhanced error handling and monitoring specifically for Signal-360 analysis pipeline
// Provides specialized error handling, rate limiting, and monitoring for analysis functions

import {
  AppError,
  ERROR_CODES,
  withRetryAndTimeout,
  DEFAULT_RETRY_CONFIG,
  RATE_LIMITED_RETRY_CONFIG,
  CircuitBreaker,
  createLogger,
  createRequestMonitor,
  Logger
} from './index.ts';

/**
 * Analysis-specific error codes
 */
export const ANALYSIS_ERROR_CODES = {
  ...ERROR_CODES,
  TICKER_VALIDATION_FAILED: 'TICKER_VALIDATION_FAILED',
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',
  ANALYSIS_TIMEOUT: 'ANALYSIS_TIMEOUT',
  SYNTHESIS_FAILED: 'SYNTHESIS_FAILED',
  TRADE_PARAMS_FAILED: 'TRADE_PARAMS_FAILED',
  PARTIAL_ANALYSIS_FAILURE: 'PARTIAL_ANALYSIS_FAILURE',
  DATA_QUALITY_INSUFFICIENT: 'DATA_QUALITY_INSUFFICIENT',
  API_QUOTA_EXCEEDED: 'API_QUOTA_EXCEEDED',
  MARKET_DATA_STALE: 'MARKET_DATA_STALE',
  CONFIDENCE_TOO_LOW: 'CONFIDENCE_TOO_LOW'
} as const;

/**
 * Analysis pipeline stages for monitoring
 */
export enum AnalysisStage {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  API_KEY_DECRYPTION = 'api_key_decryption',
  FUNDAMENTAL_ANALYSIS = 'fundamental_analysis',
  TECHNICAL_ANALYSIS = 'technical_analysis',
  SENTIMENT_ECO_ANALYSIS = 'sentiment_eco_analysis',
  SYNTHESIS = 'synthesis',
  TRADE_PARAMETERS = 'trade_parameters',
  RESPONSE_FORMATTING = 'response_formatting'
}

/**
 * Analysis error with additional context
 */
export class AnalysisError extends AppError {
  public readonly stage: AnalysisStage;
  public readonly ticker?: string;
  public readonly analysisContext?: 'investment' | 'trading';
  public readonly partialResults?: any;

  constructor(
    code: string,
    message: string,
    stage: AnalysisStage,
    details?: string,
    retryAfter?: number,
    ticker?: string,
    analysisContext?: 'investment' | 'trading',
    partialResults?: any
  ) {
    super(code, message, details, retryAfter);
    this.stage = stage;
    this.ticker = ticker;
    this.analysisContext = analysisContext;
    this.partialResults = partialResults;
  }
}

/**
 * Rate limiter for external APIs
 */
export class AnalysisRateLimiter {
  private quotas: Map<string, { count: number; resetTime: number; limit: number }> = new Map();
  private readonly defaultLimits = {
    'google-api': { limit: 100, windowMs: 60000 }, // 100 requests per minute
    'financial-data': { limit: 50, windowMs: 60000 }, // 50 requests per minute
    'news-api': { limit: 200, windowMs: 60000 } // 200 requests per minute
  };

  /**
   * Check if request is within rate limits
   */
  checkRateLimit(apiName: string, customLimit?: { limit: number; windowMs: number }): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
  } {
    const now = Date.now();
    const limits = customLimit || this.defaultLimits[apiName] || this.defaultLimits['google-api'];
    
    let quota = this.quotas.get(apiName);
    
    // Initialize or reset quota if window expired
    if (!quota || now >= quota.resetTime) {
      quota = {
        count: 0,
        resetTime: now + limits.windowMs,
        limit: limits.limit
      };
      this.quotas.set(apiName, quota);
    }

    // Check if within limits
    if (quota.count >= quota.limit) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: quota.resetTime,
        retryAfter: Math.ceil((quota.resetTime - now) / 1000)
      };
    }

    // Increment count and allow request
    quota.count++;
    this.quotas.set(apiName, quota);

    return {
      allowed: true,
      remaining: quota.limit - quota.count,
      resetTime: quota.resetTime
    };
  }

  /**
   * Get current quota status
   */
  getQuotaStatus(apiName: string): {
    used: number;
    limit: number;
    remaining: number;
    resetTime: number;
  } {
    const quota = this.quotas.get(apiName);
    const limits = this.defaultLimits[apiName] || this.defaultLimits['google-api'];
    
    if (!quota) {
      return {
        used: 0,
        limit: limits.limit,
        remaining: limits.limit,
        resetTime: Date.now() + limits.windowMs
      };
    }

    return {
      used: quota.count,
      limit: quota.limit,
      remaining: Math.max(0, quota.limit - quota.count),
      resetTime: quota.resetTime
    };
  }
}

/**
 * Global rate limiter instance
 */
export const globalRateLimiter = new AnalysisRateLimiter();

/**
 * Circuit breakers for different services
 */
export class AnalysisCircuitBreakers {
  private breakers: Map<string, CircuitBreaker> = new Map();

  constructor() {
    // Initialize circuit breakers for different services
    this.breakers.set('google-api', new CircuitBreaker('google-api', {
      failureThreshold: 5,
      recoveryTimeout: 60000, // 1 minute
      monitoringPeriod: 300000 // 5 minutes
    }));

    this.breakers.set('financial-data', new CircuitBreaker('financial-data', {
      failureThreshold: 3,
      recoveryTimeout: 30000, // 30 seconds
      monitoringPeriod: 180000 // 3 minutes
    }));

    this.breakers.set('news-api', new CircuitBreaker('news-api', {
      failureThreshold: 5,
      recoveryTimeout: 120000, // 2 minutes
      monitoringPeriod: 300000 // 5 minutes
    }));

    this.breakers.set('database', new CircuitBreaker('database', {
      failureThreshold: 3,
      recoveryTimeout: 15000, // 15 seconds
      monitoringPeriod: 60000 // 1 minute
    }));
  }

  /**
   * Get circuit breaker for service
   */
  getBreaker(serviceName: string): CircuitBreaker {
    const breaker = this.breakers.get(serviceName);
    if (!breaker) {
      throw new Error(`No circuit breaker configured for service: ${serviceName}`);
    }
    return breaker;
  }

  /**
   * Execute operation with circuit breaker
   */
  async execute<T>(serviceName: string, operation: () => Promise<T>): Promise<T> {
    const breaker = this.getBreaker(serviceName);
    return await breaker.execute(operation);
  }

  /**
   * Get status of all circuit breakers
   */
  getStatus(): Record<string, { state: string; failures: number; lastFailure?: Date }> {
    const status: Record<string, any> = {};
    
    for (const [name, breaker] of this.breakers) {
      status[name] = {
        state: breaker.getState(),
        failures: breaker.getFailureCount(),
        lastFailure: breaker.getLastFailureTime()
      };
    }
    
    return status;
  }
}

/**
 * Global circuit breakers instance
 */
export const globalCircuitBreakers = new AnalysisCircuitBreakers();

/**
 * Analysis pipeline monitor
 */
export class AnalysisPipelineMonitor {
  private logger: Logger;
  private requestId: string;
  private ticker: string;
  private analysisContext: 'investment' | 'trading';
  private startTime: number;
  private stageTimings: Map<AnalysisStage, { start: number; end?: number; duration?: number }> = new Map();
  private errors: AnalysisError[] = [];
  private warnings: string[] = [];
  private partialResults: Map<AnalysisStage, any> = new Map();

  constructor(
    requestId: string,
    ticker: string,
    analysisContext: 'investment' | 'trading',
    logger?: Logger
  ) {
    this.requestId = requestId;
    this.ticker = ticker;
    this.analysisContext = analysisContext;
    this.logger = logger || createLogger('analysis-pipeline', requestId);
    this.startTime = Date.now();
  }

  /**
   * Start monitoring a stage
   */
  startStage(stage: AnalysisStage): void {
    this.stageTimings.set(stage, { start: Date.now() });
    this.logger.info(`Starting ${stage}`, {
      ticker: this.ticker,
      context: this.analysisContext,
      stage
    });
  }

  /**
   * End monitoring a stage
   */
  endStage(stage: AnalysisStage, result?: any, error?: AnalysisError): void {
    const timing = this.stageTimings.get(stage);
    if (!timing) {
      this.logger.warn(`Attempted to end stage ${stage} that was never started`);
      return;
    }

    const now = Date.now();
    timing.end = now;
    timing.duration = now - timing.start;

    if (error) {
      this.errors.push(error);
      this.logger.error(`Stage ${stage} failed`, error, {
        ticker: this.ticker,
        context: this.analysisContext,
        stage,
        duration: timing.duration
      });
    } else {
      if (result) {
        this.partialResults.set(stage, result);
      }
      this.logger.info(`Stage ${stage} completed`, {
        ticker: this.ticker,
        context: this.analysisContext,
        stage,
        duration: timing.duration
      });
    }

    // Check for slow stages
    if (timing.duration && timing.duration > 10000) { // 10 seconds
      this.addWarning(`Stage ${stage} took ${timing.duration}ms (>10s)`);
    }
  }

  /**
   * Add a warning
   */
  addWarning(message: string): void {
    this.warnings.push(message);
    this.logger.warn(message, {
      ticker: this.ticker,
      context: this.analysisContext
    });
  }

  /**
   * Get pipeline summary
   */
  getSummary(): {
    requestId: string;
    ticker: string;
    analysisContext: string;
    totalDuration: number;
    stageTimings: Record<string, number>;
    errors: AnalysisError[];
    warnings: string[];
    success: boolean;
    partialResults: Record<string, any>;
  } {
    const now = Date.now();
    const stageTimings: Record<string, number> = {};
    
    for (const [stage, timing] of this.stageTimings) {
      stageTimings[stage] = timing.duration || (now - timing.start);
    }

    const partialResults: Record<string, any> = {};
    for (const [stage, result] of this.partialResults) {
      partialResults[stage] = result;
    }

    return {
      requestId: this.requestId,
      ticker: this.ticker,
      analysisContext: this.analysisContext,
      totalDuration: now - this.startTime,
      stageTimings,
      errors: this.errors,
      warnings: this.warnings,
      success: this.errors.length === 0,
      partialResults
    };
  }

  /**
   * Check if pipeline can continue with partial results
   */
  canContinueWithPartialResults(): boolean {
    // Must have at least 2 out of 3 analysis results
    const analysisStages = [
      AnalysisStage.FUNDAMENTAL_ANALYSIS,
      AnalysisStage.TECHNICAL_ANALYSIS,
      AnalysisStage.SENTIMENT_ECO_ANALYSIS
    ];

    const completedAnalyses = analysisStages.filter(stage => 
      this.partialResults.has(stage)
    ).length;

    return completedAnalyses >= 2;
  }

  /**
   * Get partial results for synthesis
   */
  getPartialResultsForSynthesis(): {
    fundamental_result?: any;
    technical_result?: any;
    esg_result?: any;
  } {
    return {
      fundamental_result: this.partialResults.get(AnalysisStage.FUNDAMENTAL_ANALYSIS),
      technical_result: this.partialResults.get(AnalysisStage.TECHNICAL_ANALYSIS),
      esg_result: this.partialResults.get(AnalysisStage.SENTIMENT_ECO_ANALYSIS)
    };
  }
}

/**
 * Ticker validation utility
 */
export class TickerValidator {
  private static readonly VALID_TICKER_PATTERN = /^[A-Z]{1,5}(\.[A-Z]{1,2})?$/;
  private static readonly COMMON_INVALID_TICKERS = new Set([
    'TEST', 'DEMO', 'SAMPLE', 'EXAMPLE', 'NULL', 'UNDEFINED'
  ]);

  /**
   * Validate ticker symbol format and content
   */
  static validate(ticker: string): {
    valid: boolean;
    normalized?: string;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!ticker) {
      errors.push('Ticker symbol is required');
      return { valid: false, errors };
    }

    if (typeof ticker !== 'string') {
      errors.push('Ticker symbol must be a string');
      return { valid: false, errors };
    }

    const normalized = ticker.trim().toUpperCase();

    if (normalized.length === 0) {
      errors.push('Ticker symbol cannot be empty');
      return { valid: false, errors };
    }

    if (normalized.length > 7) {
      errors.push('Ticker symbol too long (max 7 characters)');
    }

    if (!this.VALID_TICKER_PATTERN.test(normalized)) {
      errors.push('Invalid ticker format (must be 1-5 letters, optionally followed by .XX)');
    }

    if (this.COMMON_INVALID_TICKERS.has(normalized)) {
      errors.push('Invalid ticker symbol (reserved/test ticker)');
    }

    return {
      valid: errors.length === 0,
      normalized: errors.length === 0 ? normalized : undefined,
      errors
    };
  }
}

/**
 * Enhanced external API call wrapper with analysis-specific error handling
 */
export async function callExternalAnalysisAPI<T>(
  apiName: string,
  operation: () => Promise<T>,
  options: {
    timeout?: number;
    retryConfig?: any;
    stage: AnalysisStage;
    ticker?: string;
    monitor?: AnalysisPipelineMonitor;
  }
): Promise<T> {
  const { timeout = 30000, retryConfig = DEFAULT_RETRY_CONFIG, stage, ticker, monitor } = options;

  // Check rate limits
  const rateLimitCheck = globalRateLimiter.checkRateLimit(apiName);
  if (!rateLimitCheck.allowed) {
    const error = new AnalysisError(
      ANALYSIS_ERROR_CODES.API_QUOTA_EXCEEDED,
      `Rate limit exceeded for ${apiName}`,
      stage,
      `Retry after ${rateLimitCheck.retryAfter} seconds`,
      rateLimitCheck.retryAfter,
      ticker
    );
    
    if (monitor) {
      monitor.endStage(stage, undefined, error);
    }
    
    throw error;
  }

  try {
    // Execute with circuit breaker and retry logic
    const result = await globalCircuitBreakers.execute(apiName, async () => {
      return await withRetryAndTimeout(
        operation,
        timeout,
        retryConfig,
        `${apiName}-${stage}`
      );
    });

    return result;

  } catch (error) {
    let analysisError: AnalysisError;

    if (error instanceof AnalysisError) {
      analysisError = error;
    } else if (error instanceof AppError) {
      analysisError = new AnalysisError(
        error.code,
        error.message,
        stage,
        error.details,
        error.retryAfter,
        ticker
      );
    } else {
      analysisError = new AnalysisError(
        ANALYSIS_ERROR_CODES.EXTERNAL_API_ERROR,
        `${apiName} API call failed`,
        stage,
        error instanceof Error ? error.message : String(error),
        undefined,
        ticker
      );
    }

    if (monitor) {
      monitor.endStage(stage, undefined, analysisError);
    }

    throw analysisError;
  }
}

/**
 * Graceful degradation handler
 */
export class GracefulDegradationHandler {
  /**
   * Handle partial analysis failure and determine if synthesis can continue
   */
  static handlePartialFailure(
    monitor: AnalysisPipelineMonitor,
    failedStage: AnalysisStage,
    error: AnalysisError
  ): {
    canContinue: boolean;
    fallbackData?: any;
    adjustedConfidence: number;
  } {
    const summary = monitor.getSummary();
    
    // Check if we can continue with partial results
    const canContinue = monitor.canContinueWithPartialResults();
    
    if (!canContinue) {
      return {
        canContinue: false,
        adjustedConfidence: 0
      };
    }

    // Generate fallback data for missing analysis
    const fallbackData = this.generateFallbackData(failedStage, summary.partialResults);
    
    // Adjust confidence based on missing data
    const adjustedConfidence = this.calculateAdjustedConfidence(failedStage, summary.errors.length);

    return {
      canContinue: true,
      fallbackData,
      adjustedConfidence
    };
  }

  /**
   * Generate fallback data for failed analysis stage
   */
  private static generateFallbackData(stage: AnalysisStage, partialResults: Record<string, any>): any {
    switch (stage) {
      case AnalysisStage.FUNDAMENTAL_ANALYSIS:
        return {
          score: 50, // Neutral score
          factors: [{
            category: 'unavailable',
            type: 'neutral',
            description: 'Fundamental analysis data unavailable',
            weight: 0.1,
            confidence: 0.1
          }],
          confidence: 0.1
        };

      case AnalysisStage.TECHNICAL_ANALYSIS:
        return {
          score: 50, // Neutral score
          factors: [{
            category: 'unavailable',
            type: 'neutral',
            description: 'Technical analysis data unavailable',
            weight: 0.1,
            confidence: 0.1
          }],
          details: {
            trend_indicators: {},
            support_resistance: { support_levels: [], resistance_levels: [] }
          },
          confidence: 0.1
        };

      case AnalysisStage.SENTIMENT_ECO_ANALYSIS:
        return {
          score: 50, // Neutral score
          factors: [{
            category: 'unavailable',
            type: 'neutral',
            description: 'Sentiment/ESG analysis data unavailable',
            weight: 0.1,
            confidence: 0.1
          }],
          key_ecos: [{
            source: 'System',
            headline: 'Sentiment data unavailable',
            sentiment: 'neutral'
          }],
          confidence: 0.1
        };

      default:
        return null;
    }
  }

  /**
   * Calculate adjusted confidence based on failed stages
   */
  private static calculateAdjustedConfidence(failedStage: AnalysisStage, totalErrors: number): number {
    let baseConfidence = 0.8;

    // Reduce confidence based on failed stage importance
    switch (failedStage) {
      case AnalysisStage.FUNDAMENTAL_ANALYSIS:
        baseConfidence *= 0.7; // 30% reduction
        break;
      case AnalysisStage.TECHNICAL_ANALYSIS:
        baseConfidence *= 0.8; // 20% reduction
        break;
      case AnalysisStage.SENTIMENT_ECO_ANALYSIS:
        baseConfidence *= 0.9; // 10% reduction
        break;
      default:
        baseConfidence *= 0.95; // 5% reduction
    }

    // Additional reduction for multiple errors
    if (totalErrors > 1) {
      baseConfidence *= Math.pow(0.9, totalErrors - 1);
    }

    return Math.max(0.1, baseConfidence); // Minimum 10% confidence
  }
}

/**
 * Performance monitoring for analysis pipeline
 */
export class AnalysisPerformanceMonitor {
  private static metrics: Map<string, {
    count: number;
    totalDuration: number;
    errors: number;
    lastReset: number;
  }> = new Map();

  /**
   * Record analysis performance metrics
   */
  static recordAnalysis(
    ticker: string,
    analysisContext: 'investment' | 'trading',
    duration: number,
    success: boolean,
    stageTimings: Record<string, number>
  ): void {
    const key = `${ticker}-${analysisContext}`;
    const now = Date.now();
    
    let metric = this.metrics.get(key);
    if (!metric || now - metric.lastReset > 3600000) { // Reset every hour
      metric = {
        count: 0,
        totalDuration: 0,
        errors: 0,
        lastReset: now
      };
    }

    metric.count++;
    metric.totalDuration += duration;
    if (!success) {
      metric.errors++;
    }

    this.metrics.set(key, metric);

    // Log performance warning if analysis is slow
    if (duration > 15000) { // 15 seconds
      console.warn(`Slow analysis detected for ${ticker}`, {
        duration,
        stageTimings,
        context: analysisContext
      });
    }
  }

  /**
   * Get performance statistics
   */
  static getStats(): Record<string, {
    averageDuration: number;
    errorRate: number;
    totalAnalyses: number;
  }> {
    const stats: Record<string, any> = {};
    
    for (const [key, metric] of this.metrics) {
      stats[key] = {
        averageDuration: metric.count > 0 ? metric.totalDuration / metric.count : 0,
        errorRate: metric.count > 0 ? metric.errors / metric.count : 0,
        totalAnalyses: metric.count
      };
    }
    
    return stats;
  }
}

/**
 * Export all utilities for easy access
 */
export {
  AnalysisError,
  AnalysisStage,
  AnalysisPipelineMonitor,
  TickerValidator,
  callExternalAnalysisAPI,
  GracefulDegradationHandler,
  AnalysisPerformanceMonitor,
  globalRateLimiter,
  globalCircuitBreakers
};