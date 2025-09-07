// --- START OF REPLACEMENT CODE FOR errorHandler.ts ---

/**
 * Comprehensive Error Handling System for Signal-360
 * Provides error classification, transformation, and recovery mechanisms
 */

// Error classification types
export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  SERVER = 'SERVER',
  TIMEOUT = 'TIMEOUT',
  RATE_LIMIT = 'RATE_LIMIT',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  UNKNOWN = 'UNKNOWN',
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// Error recovery strategies
export enum RecoveryStrategy {
  RETRY = 'RETRY',
  FALLBACK = 'FALLBACK',
  USER_ACTION = 'USER_ACTION',
  NONE = 'NONE',
}

// Enhanced error interface
export interface ClassifiedError {
  type: ErrorType;
  severity: ErrorSeverity;
  code: string;
  message: string;
  userMessage: string;
  details?: string;
  recoverable: boolean;
  retryable: boolean;
  recoveryStrategy: RecoveryStrategy;
  retryAfter?: number;
  actionable: boolean;
  timestamp: string;
  context?: Record<string, any>;
}

// Error recovery action interface
export interface ErrorRecoveryAction {
  label: string;
  action: () => void | Promise<void>;
  primary?: boolean;
}

// Error classification rules
interface ErrorClassificationRule {
  condition: (error: any) => boolean;
  classify: (error: any) => Partial<ClassifiedError>;
}

/**
 * Comprehensive Error Handler Class
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private classificationRules: ErrorClassificationRule[] = [];

  private constructor() {
    this.initializeDefaultRules();
  }

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Initialize default error classification rules
   */
  private initializeDefaultRules(): void {
    // Network errors
    this.addRule(
      (error) => 
        error?.message?.includes('network') || 
        error?.message?.includes('fetch') ||
        error?.code === 'NETWORK_ERROR',
      (error) => ({
        type: ErrorType.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        code: 'NETWORK_ERROR',
        userMessage: 'Network error. Please check your connection and try again.',
        recoverable: true,
        retryable: true,
        recoveryStrategy: RecoveryStrategy.RETRY,
        actionable: true,
      })
    );

    // Authentication errors
    this.addRule(
      (error) => 
        error?.message?.includes('JWT') || 
        error?.message?.includes('auth') ||
        error?.code === 'AUTHENTICATION_ERROR' ||
        error?.status === 401,
      (error) => ({
        type: ErrorType.AUTHENTICATION,
        severity: ErrorSeverity.HIGH,
        code: 'AUTHENTICATION_ERROR',
        userMessage: 'Authentication failed. Please log in again.',
        recoverable: true,
        retryable: false,
        recoveryStrategy: RecoveryStrategy.USER_ACTION,
        actionable: true,
      })
    );

    // Authorization errors
    this.addRule(
      (error) => 
        error?.status === 403 ||
        error?.code === 'AUTHORIZATION_ERROR',
      (error) => ({
        type: ErrorType.AUTHORIZATION,
        severity: ErrorSeverity.HIGH,
        code: 'AUTHORIZATION_ERROR',
        userMessage: 'Access denied. Please check your permissions.',
        recoverable: false,
        retryable: false,
        recoveryStrategy: RecoveryStrategy.USER_ACTION,
        actionable: true,
      })
    );

    // Validation errors
    this.addRule(
      (error) => 
        error?.message?.includes('Ticker symbol') ||
        error?.code === 'VALIDATION_ERROR' ||
        error?.status === 400,
      (error) => ({
        type: ErrorType.VALIDATION,
        severity: ErrorSeverity.LOW,
        code: 'VALIDATION_ERROR',
        userMessage: error?.message || 'Invalid input. Please check your data and try again.',
        recoverable: true,
        retryable: false,
        recoveryStrategy: RecoveryStrategy.USER_ACTION,
        actionable: true,
      })
    );

    // Timeout errors
    this.addRule(
      (error) => 
        error?.message?.includes('timeout') ||
        error?.code === 'TIMEOUT_ERROR' ||
        error?.code === 'ECONNABORTED',
      (error) => ({
        type: ErrorType.TIMEOUT,
        severity: ErrorSeverity.MEDIUM,
        code: 'TIMEOUT_ERROR',
        userMessage: 'Request timed out. The analysis is taking longer than expected. Please try again.',
        recoverable: true,
        retryable: true,
        recoveryStrategy: RecoveryStrategy.RETRY,
        retryAfter: 5000, // 5 seconds
        actionable: true,
      })
    );

    // Rate limit errors
    this.addRule(
      (error) => 
        error?.status === 429 ||
        error?.code === 'RATE_LIMIT_EXCEEDED',
      (error) => ({
        type: ErrorType.RATE_LIMIT,
        severity: ErrorSeverity.MEDIUM,
        code: 'RATE_LIMIT_EXCEEDED',
        userMessage: 'Too many requests. Please wait a moment and try again.',
        recoverable: true,
        retryable: true,
        recoveryStrategy: RecoveryStrategy.RETRY,
        retryAfter: 60000, // 1 minute
        actionable: true,
      })
    );

    // Server errors
    this.addRule(
      (error) => 
        (error?.status >= 500 && error?.status < 600) ||
        error?.code === 'SERVER_ERROR' ||
        error?.code === 'INTERNAL_ERROR',
      (error) => ({
        type: ErrorType.SERVER,
        severity: ErrorSeverity.HIGH,
        code: 'SERVER_ERROR',
        userMessage: 'Server error. Please try again later.',
        recoverable: true,
        retryable: true,
        recoveryStrategy: RecoveryStrategy.RETRY,
        retryAfter: 30000, // 30 seconds
        actionable: true,
      })
    );

    // Service unavailable
    this.addRule(
      (error) => 
        error?.status === 503 ||
        error?.code === 'SERVICE_UNAVAILABLE',
      (error) => ({
        type: ErrorType.SERVICE_UNAVAILABLE,
        severity: ErrorSeverity.HIGH,
        code: 'SERVICE_UNAVAILABLE',
        userMessage: 'Analysis service temporarily unavailable. Please try again later.',
        recoverable: true,
        retryable: true,
        recoveryStrategy: RecoveryStrategy.RETRY,
        retryAfter: 60000, // 1 minute
        actionable: true,
      })
    );
  }

  /**
   * Add a custom error classification rule
   */
  public addRule(condition: (error: any) => boolean, classify: (error: any) => Partial<ClassifiedError>): void {
    this.classificationRules.unshift({ condition, classify });
  }

  /**
   * Classify an error based on its characteristics
   */
  public classifyError(error: any, context?: Record<string, any>): ClassifiedError {
    // Find matching rule
    for (const rule of this.classificationRules) {
      if (rule.condition(error)) {
        const classification = rule.classify(error);
        return {
          type: ErrorType.UNKNOWN,
          severity: ErrorSeverity.MEDIUM,
          code: 'UNKNOWN_ERROR',
          message: error?.message || String(error),
          userMessage: 'An unexpected error occurred. Please try again.',
          details: error?.stack || error?.details,
          recoverable: false,
          retryable: false,
          recoveryStrategy: RecoveryStrategy.NONE,
          actionable: false,
          timestamp: new Date().toISOString(),
          context,
          ...classification,
        };
      }
    }
    
    // FIX: Enhanced default classification for unknown errors
    // This will prevent '[object Object]' by serializing objects into readable JSON.
    const getErrorDetails = (err: any): string => {
        if (err instanceof Error) {
            return err.stack || err.message;
        }
        if (typeof err === 'object' && err !== null) {
            try {
                // Using Object.getOwnPropertyNames to include non-enumerable properties like 'message' from Error objects
                return JSON.stringify(err, Object.getOwnPropertyNames(err), 2);
            } catch {
                return 'Could not stringify error object';
            }
        }
        return String(err);
    };

    // Default classification for unknown errors
    return {
      type: ErrorType.UNKNOWN,
      severity: ErrorSeverity.MEDIUM,
      code: 'UNKNOWN_ERROR',
      message: error?.message || 'An unexpected error occurred. Please see details.',
      userMessage: 'An unexpected error occurred. Please try again.',
      details: getErrorDetails(error),
      recoverable: false,
      retryable: false,
      recoveryStrategy: RecoveryStrategy.NONE,
      actionable: false,
      timestamp: new Date().toISOString(),
      context,
    };
  }

  /**
   * Determine if an error should be retried
   */
  public shouldRetry(error: ClassifiedError, attemptCount: number, maxAttempts: number): boolean {
    if (attemptCount >= maxAttempts) {
      return false;
    }

    return error.retryable && error.recoverable;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  public getRetryDelay(attemptCount: number, baseDelay: number = 1000, maxDelay: number = 30000): number {
    const exponentialDelay = baseDelay * Math.pow(2, attemptCount - 1);
    const jitteredDelay = exponentialDelay + Math.random() * 1000; // Add jitter
    return Math.min(jitteredDelay, maxDelay);
  }

  /**
   * Get suggested recovery actions for an error
   */
  public getRecoveryActions(error: ClassifiedError): ErrorRecoveryAction[] {
    const actions: ErrorRecoveryAction[] = [];

    switch (error.recoveryStrategy) {
      case RecoveryStrategy.RETRY:
        actions.push({
          label: 'Try Again',
          action: () => {}, // Will be implemented by the caller
          primary: true,
        });
        break;

      case RecoveryStrategy.USER_ACTION:
        if (error.type === ErrorType.AUTHENTICATION) {
          actions.push({
            label: 'Log In Again',
            action: () => {}, // Will be implemented by the caller
            primary: true,
          });
        } else if (error.type === ErrorType.VALIDATION) {
          actions.push({
            label: 'Check Input',
            action: () => {}, // Will be implemented by the caller
            primary: true,
          });
        }
        break;

      case RecoveryStrategy.FALLBACK:
        actions.push({
          label: 'Use Alternative',
          action: () => {}, // Will be implemented by the caller
          primary: true,
        });
        break;
    }

    // Always provide a dismiss option
    actions.push({
      label: 'Dismiss',
      action: () => {},
      primary: false,
    });

    return actions;
  }

  /**
   * Log error for monitoring and debugging
   */
  public logError(error: ClassifiedError): void {
    const logLevel = this.getLogLevel(error.severity);
    const logData = {
      type: error.type,
      code: error.code,
      message: error.message,
      severity: error.severity,
      timestamp: error.timestamp,
      context: error.context,
      details: error.details,
    };

    console[logLevel](`[ErrorHandler] ${error.type}: ${error.message}`, logData);

    // In production, you might want to send this to a monitoring service
    if (error.severity === ErrorSeverity.CRITICAL || error.severity === ErrorSeverity.HIGH) {
      // Send to monitoring service (e.g., Sentry, LogRocket, etc.)
      this.sendToMonitoring(error);
    }
  }

  /**
   * Get appropriate log level for error severity
   */
  private getLogLevel(severity: ErrorSeverity): 'error' | 'warn' | 'info' {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return 'error';
      case ErrorSeverity.MEDIUM:
        return 'warn';
      case ErrorSeverity.LOW:
      default:
        return 'info';
    }
  }

  /**
   * Send error to monitoring service (placeholder)
   */
  private sendToMonitoring(error: ClassifiedError): void {
    // Placeholder for monitoring service integration
    // In a real application, you would integrate with services like:
    // - Sentry: Sentry.captureException(error)
    // - LogRocket: LogRocket.captureException(error)
    // - Custom analytics service
    
    if (process.env.NODE_ENV === 'development') {
      console.warn('[ErrorHandler] Would send to monitoring service:', {
        type: error.type,
        code: error.code,
        severity: error.severity,
        timestamp: error.timestamp,
      });
    }
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();

// Utility functions for common error handling patterns
export const handleError = (error: any, context?: Record<string, any>): ClassifiedError => {
  const classifiedError = errorHandler.classifyError(error, context);
  errorHandler.logError(classifiedError);
  return classifiedError;
};

export const shouldRetryError = (error: ClassifiedError, attemptCount: number, maxAttempts: number = 3): boolean => {
  return errorHandler.shouldRetry(error, attemptCount, maxAttempts);
};

export const getRetryDelay = (attemptCount: number, baseDelay: number = 1000): number => {
  return errorHandler.getRetryDelay(attemptCount, baseDelay);
};

export const getErrorRecoveryActions = (error: ClassifiedError): ErrorRecoveryAction[] => {
  return errorHandler.getRecoveryActions(error);
};

// --- END OF REPLACEMENT CODE FOR errorHandler.ts ---