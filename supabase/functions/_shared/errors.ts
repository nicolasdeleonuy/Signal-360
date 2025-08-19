// Error handling utilities for Edge Functions
// Provides standardized error responses and logging

import { ErrorResponse } from './types.ts';

/**
 * Error codes used throughout the application
 */
export const ERROR_CODES = {
  // Validation errors (400)
  INVALID_REQUEST: 'INVALID_REQUEST',
  INVALID_TICKER: 'INVALID_TICKER',
  MISSING_PARAMETER: 'MISSING_PARAMETER',
  INVALID_PARAMETER: 'INVALID_PARAMETER',
  
  // Authentication errors (401)
  MISSING_TOKEN: 'MISSING_TOKEN',
  INVALID_TOKEN: 'INVALID_TOKEN',
  EXPIRED_TOKEN: 'EXPIRED_TOKEN',
  
  // Authorization errors (403)
  MISSING_API_KEY: 'MISSING_API_KEY',
  INVALID_API_KEY: 'INVALID_API_KEY',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  
  // External API errors (502/503)
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  API_TIMEOUT: 'API_TIMEOUT',
  
  // Internal errors (500)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  PROCESSING_ERROR: 'PROCESSING_ERROR',
  ENCRYPTION_ERROR: 'ENCRYPTION_ERROR',
  DECRYPTION_ERROR: 'DECRYPTION_ERROR'
} as const;

/**
 * HTTP status codes for different error types
 */
export const ERROR_STATUS_CODES: Record<string, number> = {
  [ERROR_CODES.INVALID_REQUEST]: 400,
  [ERROR_CODES.INVALID_TICKER]: 400,
  [ERROR_CODES.MISSING_PARAMETER]: 400,
  [ERROR_CODES.INVALID_PARAMETER]: 400,
  
  [ERROR_CODES.MISSING_TOKEN]: 401,
  [ERROR_CODES.INVALID_TOKEN]: 401,
  [ERROR_CODES.EXPIRED_TOKEN]: 401,
  
  [ERROR_CODES.MISSING_API_KEY]: 403,
  [ERROR_CODES.INVALID_API_KEY]: 403,
  [ERROR_CODES.INSUFFICIENT_PERMISSIONS]: 403,
  
  [ERROR_CODES.EXTERNAL_API_ERROR]: 502,
  [ERROR_CODES.RATE_LIMIT_EXCEEDED]: 429,
  [ERROR_CODES.SERVICE_UNAVAILABLE]: 503,
  [ERROR_CODES.API_TIMEOUT]: 504,
  
  [ERROR_CODES.INTERNAL_ERROR]: 500,
  [ERROR_CODES.DATABASE_ERROR]: 500,
  [ERROR_CODES.PROCESSING_ERROR]: 500,
  [ERROR_CODES.ENCRYPTION_ERROR]: 500,
  [ERROR_CODES.DECRYPTION_ERROR]: 500
};

/**
 * Application error class with structured information
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: string;
  public readonly retryAfter?: number;

  constructor(
    code: string,
    message: string,
    details?: string,
    retryAfter?: number
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = ERROR_STATUS_CODES[code] || 500;
    this.details = details;
    this.retryAfter = retryAfter;
  }
}

/**
 * Generate unique request ID for tracking
 * @returns string Unique request identifier
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Retry configuration interface
 */
export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // Base delay in milliseconds
  maxDelay: number; // Maximum delay in milliseconds
  backoffMultiplier: number;
  jitter: boolean; // Add random jitter to prevent thundering herd
}

/**
 * Default retry configuration for external API calls
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  jitter: true
};

/**
 * Retry configuration for rate-limited APIs
 */
export const RATE_LIMITED_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 5,
  baseDelay: 2000, // 2 seconds
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 1.5,
  jitter: true
};

/**
 * Calculate delay for exponential backoff with jitter
 */
function calculateDelay(attempt: number, config: RetryConfig): number {
  const exponentialDelay = Math.min(
    config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
    config.maxDelay
  );

  if (config.jitter) {
    // Add random jitter (±25% of the delay)
    const jitterRange = exponentialDelay * 0.25;
    const jitter = (Math.random() - 0.5) * 2 * jitterRange;
    return Math.max(0, exponentialDelay + jitter);
  }

  return exponentialDelay;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Determine if an error is retryable
 */
function isRetryableError(error: any): boolean {
  // Network errors
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return true;
  }

  // HTTP status codes that are retryable
  if (error.status) {
    const retryableStatuses = [408, 429, 500, 502, 503, 504];
    return retryableStatuses.includes(error.status);
  }

  // AppError codes that are retryable
  if (error instanceof AppError) {
    const retryableCodes = [
      ERROR_CODES.EXTERNAL_API_ERROR,
      ERROR_CODES.RATE_LIMIT_EXCEEDED,
      ERROR_CODES.SERVICE_UNAVAILABLE,
      ERROR_CODES.API_TIMEOUT
    ];
    return retryableCodes.includes(error.code);
  }

  return false;
}

/**
 * Execute function with retry logic
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  operationName: string = 'operation'
): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Don't retry if it's the last attempt or error is not retryable
      if (attempt === config.maxAttempts || !isRetryableError(error)) {
        break;
      }

      const delay = calculateDelay(attempt, config);
      console.warn(`${operationName} failed (attempt ${attempt}/${config.maxAttempts}), retrying in ${delay}ms:`, error);
      
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Execute function with timeout
 */
export async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  operationName: string = 'operation'
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new AppError(
        ERROR_CODES.API_TIMEOUT,
        `${operationName} timed out after ${timeoutMs}ms`
      ));
    }, timeoutMs);
  });

  return Promise.race([operation(), timeoutPromise]);
}

/**
 * Execute function with both retry and timeout
 */
export async function withRetryAndTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG,
  operationName: string = 'operation'
): Promise<T> {
  return withRetry(
    () => withTimeout(operation, timeoutMs, operationName),
    retryConfig,
    operationName
  );
}

/**
 * Circuit breaker state
 */
enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening
  recoveryTimeout: number; // Time to wait before trying again (ms)
  monitoringPeriod: number; // Time window for failure counting (ms)
}

/**
 * Circuit breaker implementation
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private config: CircuitBreakerConfig;
  private name: string;

  constructor(name: string, config: CircuitBreakerConfig) {
    this.name = name;
    this.config = config;
  }

  /**
   * Execute operation with circuit breaker protection
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime < this.config.recoveryTimeout) {
        throw new AppError(
          ERROR_CODES.SERVICE_UNAVAILABLE,
          `Circuit breaker ${this.name} is OPEN`
        );
      } else {
        this.state = CircuitState.HALF_OPEN;
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = CircuitState.CLOSED;
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
      console.warn(`Circuit breaker ${this.name} opened after ${this.failures} failures`);
    }
  }

  /**
   * Get current circuit breaker status
   */
  getStatus(): { state: CircuitState; failures: number } {
    return {
      state: this.state,
      failures: this.failures
    };
  }
}

/**
 * Create standardized error response
 * @param error Error object or AppError
 * @param requestId Request ID for tracking
 * @returns ErrorResponse object
 */
export function createErrorResponse(error: Error | AppError, requestId: string): ErrorResponse {
  let code = ERROR_CODES.INTERNAL_ERROR;
  let message = 'An unexpected error occurred';
  let details: string | undefined;
  let retryAfter: number | undefined;

  if (error instanceof AppError) {
    code = error.code;
    message = error.message;
    details = error.details;
    retryAfter = error.retryAfter;
  } else {
    // Log unexpected errors for debugging
    console.error('Unexpected error:', error);
    details = process.env.NODE_ENV === 'development' ? error.message : undefined;
  }

  return {
    success: false,
    error: {
      code,
      message,
      details,
      retry_after: retryAfter
    },
    request_id: requestId,
    timestamp: new Date().toISOString()
  };
}

/**
 * Create HTTP response from error
 * @param error Error object or AppError
 * @param requestId Request ID for tracking
 * @returns Response object
 */
export function createErrorHttpResponse(error: Error | AppError, requestId: string): Response {
  const errorResponse = createErrorResponse(error, requestId);
  const statusCode = error instanceof AppError ? error.statusCode : 500;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
  };

  // Add retry-after header for rate limit errors
  if (error instanceof AppError && error.retryAfter) {
    headers['Retry-After'] = error.retryAfter.toString();
  }

  return new Response(JSON.stringify(errorResponse), {
    status: statusCode,
    headers
  });
}

/**
 * Log error with context information
 * @param error Error to log
 * @param context Additional context information
 * @param requestId Request ID for tracking
 */
export function logError(
  error: Error | AppError,
  context: Record<string, any>,
  requestId: string
): void {
  const logData = {
    request_id: requestId,
    timestamp: new Date().toISOString(),
    error: {
      name: error.name,
      message: error.message,
      code: error instanceof AppError ? error.code : 'UNKNOWN_ERROR',
      stack: error.stack
    },
    context
  };

  // In production, this would integrate with a proper logging service
  console.error('Error occurred:', JSON.stringify(logData, null, 2));
}

/**
 * Wrap async function with error handling
 * @param fn Async function to wrap
 * @param requestId Request ID for tracking
 * @returns Wrapped function that returns Response
 */
export function withErrorHandling(
  fn: () => Promise<Response>,
  requestId: string
): Promise<Response> {
  return fn().catch((error) => {
    logError(error, { function: fn.name }, requestId);
    return createErrorHttpResponse(error, requestId);
  });
}

/**
 * Retry function with exponential backoff
 * @param fn Function to retry
 * @param maxRetries Maximum number of retries
 * @param baseDelay Base delay in milliseconds
 * @returns Promise with result or throws last error
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxRetries) {
        throw lastError;
      }

      // Calculate delay with exponential backoff and jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Timeout wrapper for promises
 * @param promise Promise to wrap
 * @param timeoutMs Timeout in milliseconds
 * @param errorMessage Error message for timeout
 * @returns Promise that rejects on timeout
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new AppError(ERROR_CODES.API_TIMEOUT, errorMessage));
      }, timeoutMs);
    })
  ]);
}