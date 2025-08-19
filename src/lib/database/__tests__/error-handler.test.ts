// Unit tests for database error handling utilities
// Tests error handling, categorization, and retry logic

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  DatabaseErrorHandler, 
  ErrorRetryHandler, 
  DatabaseOperation 
} from '../error-handler';
import { DatabaseError } from '../../../types/database';

describe('DatabaseErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('handleSupabaseError', () => {
    it('should handle unique constraint violation', () => {
      const supabaseError = {
        code: '23505',
        message: 'duplicate key value violates unique constraint',
        details: 'Key (id)=(123) already exists',
      };

      const result = DatabaseErrorHandler.handleSupabaseError(supabaseError, 'Create profile');

      expect(result.code).toBe('23505');
      expect(result.message).toBe('Create profile failed: Duplicate entry');
      expect(result.hint).toBe('This record already exists');
      expect(result.details).toBe(supabaseError.details);
    });

    it('should handle foreign key constraint violation', () => {
      const supabaseError = {
        code: '23503',
        message: 'insert or update on table violates foreign key constraint',
      };

      const result = DatabaseErrorHandler.handleSupabaseError(supabaseError, 'Create analysis');

      expect(result.code).toBe('23503');
      expect(result.message).toBe('Create analysis failed: Referenced record not found');
      expect(result.hint).toBe('Ensure all referenced records exist');
    });

    it('should handle not null constraint violation', () => {
      const supabaseError = {
        code: '23502',
        message: 'null value in column violates not-null constraint',
      };

      const result = DatabaseErrorHandler.handleSupabaseError(supabaseError, 'Update profile');

      expect(result.code).toBe('23502');
      expect(result.message).toBe('Update profile failed: Required field missing');
      expect(result.hint).toBe('All required fields must be provided');
    });

    it('should handle RLS policy violation', () => {
      const supabaseError = {
        code: 'PGRST301',
        message: 'Row Level Security policy violation',
      };

      const result = DatabaseErrorHandler.handleSupabaseError(supabaseError, 'Get analysis');

      expect(result.code).toBe('PGRST301');
      expect(result.message).toBe('Get analysis failed: Access denied');
      expect(result.hint).toBe('You can only access your own data');
    });

    it('should handle no rows found error', () => {
      const supabaseError = {
        code: 'PGRST116',
        message: 'No rows found',
      };

      const result = DatabaseErrorHandler.handleSupabaseError(supabaseError, 'Get profile');

      expect(result.code).toBe('PGRST116');
      expect(result.message).toBe('Get profile failed: Record not found');
      expect(result.hint).toBe('The requested record does not exist');
    });

    it('should handle unknown error', () => {
      const supabaseError = {
        code: 'UNKNOWN_CODE',
        message: 'Some unknown error',
      };

      const result = DatabaseErrorHandler.handleSupabaseError(supabaseError, 'Database operation');

      expect(result.code).toBe('UNKNOWN_CODE');
      expect(result.message).toBe('Database operation failed: Some unknown error');
    });

    it('should handle null error', () => {
      const result = DatabaseErrorHandler.handleSupabaseError(null, 'Test operation');

      expect(result.code).toBe('UNKNOWN_ERROR');
      expect(result.message).toBe('Test operation failed: Unknown error');
    });
  });

  describe('handleValidationError', () => {
    it('should create validation error', () => {
      const result = DatabaseErrorHandler.handleValidationError(
        'Invalid ticker symbol',
        'Create analysis'
      );

      expect(result.code).toBe('VALIDATION_ERROR');
      expect(result.message).toBe('Create analysis failed: Invalid ticker symbol');
      expect(result.hint).toBe('Please check your input data and try again');
    });
  });

  describe('handleNetworkError', () => {
    it('should create network error', () => {
      const networkError = new Error('Connection timeout');
      const result = DatabaseErrorHandler.handleNetworkError(networkError, 'Fetch data');

      expect(result.code).toBe('NETWORK_ERROR');
      expect(result.message).toBe('Fetch data failed: Connection error');
      expect(result.details).toBe('Connection timeout');
      expect(result.hint).toBe('Please check your internet connection and try again');
    });
  });

  describe('handleAuthError', () => {
    it('should create auth error', () => {
      const authError = new Error('User not authenticated');
      const result = DatabaseErrorHandler.handleAuthError(authError, 'Access resource');

      expect(result.code).toBe('AUTH_ERROR');
      expect(result.message).toBe('Access resource failed: Authentication required');
      expect(result.details).toBe('User not authenticated');
      expect(result.hint).toBe('Please log in and try again');
    });
  });

  describe('handleGenericError', () => {
    it('should handle Error instance', () => {
      const error = new Error('Something went wrong');
      error.stack = 'Error stack trace';

      const result = DatabaseErrorHandler.handleGenericError(error, 'Generic operation');

      expect(result.code).toBe('GENERIC_ERROR');
      expect(result.message).toBe('Generic operation failed: Something went wrong');
      expect(result.details).toBe('Error stack trace');
    });

    it('should handle non-Error value', () => {
      const result = DatabaseErrorHandler.handleGenericError('string error', 'Test operation');

      expect(result.code).toBe('UNKNOWN_ERROR');
      expect(result.message).toBe('Test operation failed: Unknown error occurred');
      expect(result.details).toBe('string error');
    });
  });

  describe('isRetryableError', () => {
    it('should identify retryable errors', () => {
      const retryableError: DatabaseError = {
        code: 'NETWORK_ERROR',
        message: 'Network error',
      };

      expect(DatabaseErrorHandler.isRetryableError(retryableError)).toBe(true);
    });

    it('should identify non-retryable errors', () => {
      const nonRetryableError: DatabaseError = {
        code: 'VALIDATION_ERROR',
        message: 'Validation error',
      };

      expect(DatabaseErrorHandler.isRetryableError(nonRetryableError)).toBe(false);
    });
  });

  describe('isUserError', () => {
    it('should identify user errors', () => {
      const userError: DatabaseError = {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
      };

      expect(DatabaseErrorHandler.isUserError(userError)).toBe(true);
    });

    it('should identify non-user errors', () => {
      const systemError: DatabaseError = {
        code: 'NETWORK_ERROR',
        message: 'Connection failed',
      };

      expect(DatabaseErrorHandler.isUserError(systemError)).toBe(false);
    });
  });

  describe('isSystemError', () => {
    it('should identify system errors', () => {
      const systemError: DatabaseError = {
        code: 'NETWORK_ERROR',
        message: 'Connection failed',
      };

      expect(DatabaseErrorHandler.isSystemError(systemError)).toBe(true);
    });

    it('should identify non-system errors', () => {
      const userError: DatabaseError = {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
      };

      expect(DatabaseErrorHandler.isSystemError(userError)).toBe(false);
    });
  });

  describe('getUserFriendlyMessage', () => {
    it('should return user-friendly messages', () => {
      const testCases = [
        {
          error: { code: 'VALIDATION_ERROR', message: 'Validation failed' },
          expected: 'Please check your input and try again.',
        },
        {
          error: { code: '23505', message: 'Duplicate key' },
          expected: 'This record already exists. Please use different values.',
        },
        {
          error: { code: 'NETWORK_ERROR', message: 'Connection failed' },
          expected: 'Connection problem. Please check your internet and try again.',
        },
        {
          error: { code: 'UNKNOWN_CODE', message: 'Unknown error' },
          expected: 'An unexpected error occurred. Please try again.',
        },
      ];

      testCases.forEach(({ error, expected }) => {
        const result = DatabaseErrorHandler.getUserFriendlyMessage(error as DatabaseError);
        expect(result).toBe(expected);
      });
    });
  });

  describe('logError', () => {
    it('should log system errors as errors', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const systemError: DatabaseError = {
        code: 'NETWORK_ERROR',
        message: 'Connection failed',
      };

      DatabaseErrorHandler.logError(systemError, { userId: '123' });

      expect(consoleSpy).toHaveBeenCalledWith('System Error:', expect.any(Object));
      consoleSpy.mockRestore();
    });

    it('should log user errors as warnings', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const userError: DatabaseError = {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
      };

      DatabaseErrorHandler.logError(userError);

      expect(consoleSpy).toHaveBeenCalledWith('User Error:', expect.any(Object));
      consoleSpy.mockRestore();
    });
  });

  describe('createErrorResponse', () => {
    it('should create error response without details', () => {
      const error: DatabaseError = {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: 'Detailed error info',
      };

      const result = DatabaseErrorHandler.createErrorResponse(error, false);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('VALIDATION_ERROR');
      expect(result.error.message).toBe('Please check your input and try again.');
      expect(result.error.details).toBeUndefined();
    });

    it('should create error response with details', () => {
      const error: DatabaseError = {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: 'Detailed error info',
        hint: 'Check your input',
      };

      const result = DatabaseErrorHandler.createErrorResponse(error, true);

      expect(result.success).toBe(false);
      expect(result.error.details).toBe('Detailed error info');
      expect(result.error.hint).toBe('Check your input');
    });
  });
});

describe('ErrorRetryHandler', () => {
  describe('retryOperation', () => {
    it('should succeed on first attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await ErrorRetryHandler.retryOperation(operation, 3, 100);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry retryable errors', async () => {
      const retryableError: DatabaseError = {
        code: 'NETWORK_ERROR',
        message: 'Connection failed',
      };

      const operation = vi.fn()
        .mockRejectedValueOnce(retryableError)
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValue('success');

      const result = await ErrorRetryHandler.retryOperation(operation, 3, 10);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should not retry non-retryable errors', async () => {
      const nonRetryableError: DatabaseError = {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
      };

      const operation = vi.fn().mockRejectedValue(nonRetryableError);

      await expect(
        ErrorRetryHandler.retryOperation(operation, 3, 10)
      ).rejects.toEqual(nonRetryableError);

      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should throw last error after max retries', async () => {
      const retryableError: DatabaseError = {
        code: 'NETWORK_ERROR',
        message: 'Connection failed',
      };

      const operation = vi.fn().mockRejectedValue(retryableError);

      await expect(
        ErrorRetryHandler.retryOperation(operation, 2, 10)
      ).rejects.toEqual(retryableError);

      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });
});

describe('DatabaseOperation', () => {
  describe('execute', () => {
    it('should execute operation successfully', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await DatabaseOperation.execute(operation, 'Test operation');

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should handle Supabase errors', async () => {
      const supabaseError = {
        code: '23505',
        message: 'Duplicate key',
      };

      const operation = vi.fn().mockRejectedValue(supabaseError);

      await expect(
        DatabaseOperation.execute(operation, 'Test operation')
      ).rejects.toMatchObject({
        code: '23505',
        message: 'Test operation failed: Duplicate entry',
      });
    });

    it('should handle generic errors', async () => {
      const genericError = new Error('Something went wrong');
      const operation = vi.fn().mockRejectedValue(genericError);

      await expect(
        DatabaseOperation.execute(operation, 'Test operation')
      ).rejects.toMatchObject({
        code: 'GENERIC_ERROR',
        message: 'Test operation failed: Something went wrong',
      });
    });

    it('should retry operations when enabled', async () => {
      const retryableError: DatabaseError = {
        code: 'NETWORK_ERROR',
        message: 'Connection failed',
      };

      const operation = vi.fn()
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValue('success');

      const result = await DatabaseOperation.execute(
        operation,
        'Test operation',
        { enableRetry: true, maxRetries: 2, baseDelay: 10 }
      );

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should not retry when disabled', async () => {
      const retryableError: DatabaseError = {
        code: 'NETWORK_ERROR',
        message: 'Connection failed',
      };

      const operation = vi.fn().mockRejectedValue(retryableError);

      await expect(
        DatabaseOperation.execute(
          operation,
          'Test operation',
          { enableRetry: false }
        )
      ).rejects.toEqual(retryableError);

      expect(operation).toHaveBeenCalledTimes(1);
    });
  });
});