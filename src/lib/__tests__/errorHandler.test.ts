import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  ErrorHandler, 
  ErrorType, 
  ErrorSeverity, 
  RecoveryStrategy,
  errorHandler,
  handleError,
  shouldRetryError,
  getRetryDelay 
} from '../errorHandler';

describe('ErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Error Classification', () => {
    it('should classify network errors correctly', () => {
      const networkError = new Error('network error occurred');
      const classified = errorHandler.classifyError(networkError);

      expect(classified.type).toBe(ErrorType.NETWORK);
      expect(classified.severity).toBe(ErrorSeverity.MEDIUM);
      expect(classified.code).toBe('NETWORK_ERROR');
      expect(classified.retryable).toBe(true);
      expect(classified.recoverable).toBe(true);
      expect(classified.recoveryStrategy).toBe(RecoveryStrategy.RETRY);
    });

    it('should classify authentication errors correctly', () => {
      const authError = { message: 'JWT token expired', status: 401 };
      const classified = errorHandler.classifyError(authError);

      expect(classified.type).toBe(ErrorType.AUTHENTICATION);
      expect(classified.severity).toBe(ErrorSeverity.HIGH);
      expect(classified.code).toBe('AUTHENTICATION_ERROR');
      expect(classified.retryable).toBe(false);
      expect(classified.recoverable).toBe(true);
      expect(classified.recoveryStrategy).toBe(RecoveryStrategy.USER_ACTION);
    });

    it('should classify validation errors correctly', () => {
      const validationError = new Error('Ticker symbol must be 5 characters or less');
      const classified = errorHandler.classifyError(validationError);

      expect(classified.type).toBe(ErrorType.VALIDATION);
      expect(classified.severity).toBe(ErrorSeverity.LOW);
      expect(classified.code).toBe('VALIDATION_ERROR');
      expect(classified.retryable).toBe(false);
      expect(classified.recoverable).toBe(true);
      expect(classified.recoveryStrategy).toBe(RecoveryStrategy.USER_ACTION);
    });

    it('should classify timeout errors correctly', () => {
      const timeoutError = { code: 'ECONNABORTED', message: 'timeout of 5000ms exceeded' };
      const classified = errorHandler.classifyError(timeoutError);

      expect(classified.type).toBe(ErrorType.TIMEOUT);
      expect(classified.severity).toBe(ErrorSeverity.MEDIUM);
      expect(classified.code).toBe('TIMEOUT_ERROR');
      expect(classified.retryable).toBe(true);
      expect(classified.recoverable).toBe(true);
      expect(classified.retryAfter).toBe(5000);
    });

    it('should classify server errors correctly', () => {
      const serverError = { status: 500, message: 'Internal server error' };
      const classified = errorHandler.classifyError(serverError);

      expect(classified.type).toBe(ErrorType.SERVER);
      expect(classified.severity).toBe(ErrorSeverity.HIGH);
      expect(classified.code).toBe('SERVER_ERROR');
      expect(classified.retryable).toBe(true);
      expect(classified.recoverable).toBe(true);
      expect(classified.retryAfter).toBe(30000);
    });

    it('should classify rate limit errors correctly', () => {
      const rateLimitError = { status: 429, message: 'Too many requests' };
      const classified = errorHandler.classifyError(rateLimitError);

      expect(classified.type).toBe(ErrorType.RATE_LIMIT);
      expect(classified.severity).toBe(ErrorSeverity.MEDIUM);
      expect(classified.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(classified.retryAfter).toBe(60000);
    });

    it('should handle unknown errors with default classification', () => {
      const unknownError = { someProperty: 'unknown error' };
      const classified = errorHandler.classifyError(unknownError);

      expect(classified.type).toBe(ErrorType.UNKNOWN);
      expect(classified.severity).toBe(ErrorSeverity.MEDIUM);
      expect(classified.code).toBe('UNKNOWN_ERROR');
      expect(classified.retryable).toBe(false);
      expect(classified.recoverable).toBe(false);
      expect(classified.recoveryStrategy).toBe(RecoveryStrategy.NONE);
    });

    it('should include context in classified error', () => {
      const error = new Error('test error');
      const context = { userId: '123', action: 'analysis' };
      const classified = errorHandler.classifyError(error, context);

      expect(classified.context).toEqual(context);
      expect(classified.timestamp).toBeDefined();
    });
  });

  describe('Retry Logic', () => {
    it('should determine retry eligibility correctly', () => {
      const retryableError = errorHandler.classifyError(new Error('network error'));
      const nonRetryableError = errorHandler.classifyError({ status: 401 });

      expect(errorHandler.shouldRetry(retryableError, 1, 3)).toBe(true);
      expect(errorHandler.shouldRetry(retryableError, 3, 3)).toBe(false);
      expect(errorHandler.shouldRetry(nonRetryableError, 1, 3)).toBe(false);
    });

    it('should calculate retry delay with exponential backoff', () => {
      const delay1 = errorHandler.getRetryDelay(1, 1000);
      const delay2 = errorHandler.getRetryDelay(2, 1000);
      const delay3 = errorHandler.getRetryDelay(3, 1000);

      expect(delay1).toBeGreaterThanOrEqual(1000);
      expect(delay1).toBeLessThan(3000); // 1000 + jitter
      expect(delay2).toBeGreaterThanOrEqual(2000);
      expect(delay2).toBeLessThan(4000); // 2000 + jitter
      expect(delay3).toBeGreaterThanOrEqual(4000);
      expect(delay3).toBeLessThan(6000); // 4000 + jitter
    });

    it('should respect maximum delay', () => {
      const delay = errorHandler.getRetryDelay(10, 1000, 5000);
      expect(delay).toBeLessThanOrEqual(5000);
    });
  });

  describe('Recovery Actions', () => {
    it('should provide retry actions for retryable errors', () => {
      const retryableError = errorHandler.classifyError(new Error('network error'));
      const actions = errorHandler.getRecoveryActions(retryableError);

      expect(actions).toHaveLength(2); // Try Again + Dismiss
      expect(actions[0].label).toBe('Try Again');
      expect(actions[0].primary).toBe(true);
      expect(actions[1].label).toBe('Dismiss');
    });

    it('should provide login actions for authentication errors', () => {
      const authError = errorHandler.classifyError({ status: 401 });
      const actions = errorHandler.getRecoveryActions(authError);

      expect(actions).toHaveLength(2); // Log In Again + Dismiss
      expect(actions[0].label).toBe('Log In Again');
      expect(actions[0].primary).toBe(true);
    });

    it('should provide input validation actions for validation errors', () => {
      const validationError = errorHandler.classifyError(new Error('Ticker symbol invalid'));
      const actions = errorHandler.getRecoveryActions(validationError);

      expect(actions).toHaveLength(2); // Check Input + Dismiss
      expect(actions[0].label).toBe('Check Input');
      expect(actions[0].primary).toBe(true);
    });
  });

  describe('Custom Rules', () => {
    it('should allow adding custom classification rules', () => {
      const customHandler = ErrorHandler.getInstance();
      
      customHandler.addRule(
        (error) => error.message === 'custom error',
        (_error) => ({
          type: ErrorType.VALIDATION,
          code: 'CUSTOM_ERROR',
          userMessage: 'This is a custom error',
          severity: ErrorSeverity.LOW,
        })
      );

      const customError = new Error('custom error');
      const classified = customHandler.classifyError(customError);

      expect(classified.code).toBe('CUSTOM_ERROR');
      expect(classified.userMessage).toBe('This is a custom error');
    });
  });

  describe('Logging', () => {
    it('should log errors with appropriate level based on severity', () => {
      const criticalError = {
        ...errorHandler.classifyError(new Error('test')),
        severity: ErrorSeverity.CRITICAL,
      };
      const lowError = {
        ...errorHandler.classifyError(new Error('test')),
        severity: ErrorSeverity.LOW,
      };

      errorHandler.logError(criticalError);
      errorHandler.logError(lowError);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('[ErrorHandler]'),
        expect.any(Object)
      );
      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('[ErrorHandler]'),
        expect.any(Object)
      );
    });
  });

  describe('Utility Functions', () => {
    it('should handle errors using utility function', () => {
      const error = new Error('test error');
      const context = { test: true };
      
      const classified = handleError(error, context);

      expect(classified.message).toBe('test error');
      expect(classified.context).toEqual(context);
      expect(classified.timestamp).toBeDefined();
    });

    it('should determine retry eligibility using utility function', () => {
      const retryableError = errorHandler.classifyError(new Error('network error'));
      const nonRetryableError = errorHandler.classifyError({ status: 401 });

      expect(shouldRetryError(retryableError, 1, 3)).toBe(true);
      expect(shouldRetryError(nonRetryableError, 1, 3)).toBe(false);
    });

    it('should calculate retry delay using utility function', () => {
      const delay = getRetryDelay(2, 1000);
      expect(delay).toBeGreaterThanOrEqual(2000);
      expect(delay).toBeLessThan(4000);
    });
  });
});