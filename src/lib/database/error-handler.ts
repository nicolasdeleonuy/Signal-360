// Database error handling utilities
// Provides comprehensive error handling for database operations

import { DatabaseError } from '../../types/database';

/**
 * Database error handler service
 * Provides utilities for handling and categorizing database errors
 */
export class DatabaseErrorHandler {
  /**
   * Handle Supabase errors and convert to standardized format
   * @param error Supabase error object
   * @param context Operation context
   * @returns DatabaseError Standardized error
   */
  static handleSupabaseError(error: any, context: string = 'Database operation'): DatabaseError {
    if (!error) {
      return {
        code: 'UNKNOWN_ERROR',
        message: `${context} failed: Unknown error`,
      };
    }

    // Handle different types of Supabase errors
    const dbError: DatabaseError = {
      code: error.code || 'SUPABASE_ERROR',
      message: error.message || `${context} failed`,
      details: error.details,
      hint: error.hint,
    };

    // Add context-specific information
    switch (error.code) {
      case '23505': // Unique constraint violation
        dbError.message = `${context} failed: Duplicate entry`;
        dbError.hint = 'This record already exists';
        break;

      case '23503': // Foreign key constraint violation
        dbError.message = `${context} failed: Referenced record not found`;
        dbError.hint = 'Ensure all referenced records exist';
        break;

      case '23502': // Not null constraint violation
        dbError.message = `${context} failed: Required field missing`;
        dbError.hint = 'All required fields must be provided';
        break;

      case '42501': // Insufficient privilege
        dbError.message = `${context} failed: Access denied`;
        dbError.hint = 'You do not have permission to perform this operation';
        break;

      case 'PGRST116': // No rows found
        dbError.message = `${context} failed: Record not found`;
        dbError.hint = 'The requested record does not exist';
        break;

      case 'PGRST301': // Row Level Security violation
        dbError.message = `${context} failed: Access denied`;
        dbError.hint = 'You can only access your own data';
        break;

      default:
        if (error.message) {
          dbError.message = `${context} failed: ${error.message}`;
        }
    }

    return dbError;
  }

  /**
   * Handle validation errors
   * @param validationError Validation error message
   * @param context Operation context
   * @returns DatabaseError Standardized error
   */
  static handleValidationError(validationError: string, context: string = 'Validation'): DatabaseError {
    return {
      code: 'VALIDATION_ERROR',
      message: `${context} failed: ${validationError}`,
      hint: 'Please check your input data and try again',
    };
  }

  /**
   * Handle network/connection errors
   * @param error Network error
   * @param context Operation context
   * @returns DatabaseError Standardized error
   */
  static handleNetworkError(error: any, context: string = 'Network operation'): DatabaseError {
    return {
      code: 'NETWORK_ERROR',
      message: `${context} failed: Connection error`,
      details: error?.message || 'Network connectivity issue',
      hint: 'Please check your internet connection and try again',
    };
  }

  /**
   * Handle authentication errors
   * @param error Auth error
   * @param context Operation context
   * @returns DatabaseError Standardized error
   */
  static handleAuthError(error: any, context: string = 'Authentication'): DatabaseError {
    return {
      code: 'AUTH_ERROR',
      message: `${context} failed: Authentication required`,
      details: error?.message || 'User not authenticated',
      hint: 'Please log in and try again',
    };
  }

  /**
   * Handle generic errors
   * @param error Generic error
   * @param context Operation context
   * @returns DatabaseError Standardized error
   */
  static handleGenericError(error: unknown, context: string = 'Operation'): DatabaseError {
    if (error instanceof Error) {
      return {
        code: 'GENERIC_ERROR',
        message: `${context} failed: ${error.message}`,
        details: error.stack,
      };
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: `${context} failed: Unknown error occurred`,
      details: String(error),
    };
  }

  /**
   * Determine if error is retryable
   * @param error Database error
   * @returns boolean True if operation can be retried
   */
  static isRetryableError(error: DatabaseError): boolean {
    const retryableCodes = [
      'NETWORK_ERROR',
      'TIMEOUT_ERROR',
      'CONNECTION_ERROR',
      '08000', // Connection exception
      '08003', // Connection does not exist
      '08006', // Connection failure
      '53300', // Too many connections
    ];

    return retryableCodes.includes(error.code);
  }

  /**
   * Determine if error is a user error (client-side)
   * @param error Database error
   * @returns boolean True if error is caused by user input
   */
  static isUserError(error: DatabaseError): boolean {
    const userErrorCodes = [
      'VALIDATION_ERROR',
      '23505', // Unique constraint violation
      '23502', // Not null constraint violation
      '23514', // Check constraint violation
      'PGRST116', // No rows found
    ];

    return userErrorCodes.includes(error.code);
  }

  /**
   * Determine if error is a system error (server-side)
   * @param error Database error
   * @returns boolean True if error is a system issue
   */
  static isSystemError(error: DatabaseError): boolean {
    const systemErrorCodes = [
      'NETWORK_ERROR',
      'CONNECTION_ERROR',
      '53300', // Too many connections
      '53400', // Configuration limit exceeded
      'XX000', // Internal error
    ];

    return systemErrorCodes.includes(error.code);
  }

  /**
   * Get user-friendly error message
   * @param error Database error
   * @returns string User-friendly message
   */
  static getUserFriendlyMessage(error: DatabaseError): string {
    switch (error.code) {
      case 'VALIDATION_ERROR':
        return 'Please check your input and try again.';

      case '23505':
        return 'This record already exists. Please use different values.';

      case '23503':
        return 'Cannot complete operation due to missing dependencies.';

      case '23502':
        return 'Please fill in all required fields.';

      case '42501':
      case 'PGRST301':
        return 'You do not have permission to perform this action.';

      case 'PGRST116':
        return 'The requested item was not found.';

      case 'NETWORK_ERROR':
        return 'Connection problem. Please check your internet and try again.';

      case 'AUTH_ERROR':
        return 'Please log in to continue.';

      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  /**
   * Log error with appropriate level
   * @param error Database error
   * @param context Additional context
   */
  static logError(error: DatabaseError, context?: Record<string, any>): void {
    const logData = {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      context,
      timestamp: new Date().toISOString(),
    };

    if (this.isSystemError(error)) {
      console.error('System Error:', logData);
    } else if (this.isUserError(error)) {
      console.warn('User Error:', logData);
    } else {
      console.error('Database Error:', logData);
    }
  }

  /**
   * Create error response for API endpoints
   * @param error Database error
   * @param includeDetails Whether to include technical details
   * @returns object Error response object
   */
  static createErrorResponse(error: DatabaseError, includeDetails: boolean = false) {
    const response: any = {
      success: false,
      error: {
        code: error.code,
        message: this.getUserFriendlyMessage(error),
      },
    };

    if (includeDetails && (error.details || error.hint)) {
      response.error.details = error.details;
      response.error.hint = error.hint;
    }

    return response;
  }
}

/**
 * Error retry utility
 */
export class ErrorRetryHandler {
  /**
   * Retry operation with exponential backoff
   * @param operation Operation to retry
   * @param maxRetries Maximum number of retries
   * @param baseDelay Base delay in milliseconds
   * @returns Promise<T> Operation result
   */
  static async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: DatabaseError | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        const dbError = error as DatabaseError;
        lastError = dbError;

        // Don't retry if it's not a retryable error
        if (!DatabaseErrorHandler.isRetryableError(dbError)) {
          throw dbError;
        }

        // Don't retry on the last attempt
        if (attempt === maxRetries) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));

        console.warn(`Retrying operation (attempt ${attempt + 1}/${maxRetries + 1}) after ${delay}ms`);
      }
    }

    throw lastError;
  }
}

/**
 * Database operation wrapper with error handling
 */
export class DatabaseOperation {
  /**
   * Execute database operation with comprehensive error handling
   * @param operation Database operation
   * @param context Operation context
   * @param retryOptions Retry configuration
   * @returns Promise<T> Operation result
   */
  static async execute<T>(
    operation: () => Promise<T>,
    context: string,
    retryOptions?: {
      maxRetries?: number;
      baseDelay?: number;
      enableRetry?: boolean;
    }
  ): Promise<T> {
    const { maxRetries = 3, baseDelay = 1000, enableRetry = true } = retryOptions || {};

    try {
      const wrappedOperation = async () => {
        try {
          return await operation();
        } catch (error: any) {
          // Handle different types of errors
          if (error?.code) {
            throw DatabaseErrorHandler.handleSupabaseError(error, context);
          } else if (error instanceof Error) {
            throw DatabaseErrorHandler.handleGenericError(error, context);
          } else {
            throw DatabaseErrorHandler.handleGenericError(error, context);
          }
        }
      };

      if (enableRetry) {
        return await ErrorRetryHandler.retryOperation(wrappedOperation, maxRetries, baseDelay);
      } else {
        return await wrappedOperation();
      }
    } catch (error) {
      const dbError = error as DatabaseError;
      DatabaseErrorHandler.logError(dbError, { context, retryOptions });
      throw dbError;
    }
  }
}