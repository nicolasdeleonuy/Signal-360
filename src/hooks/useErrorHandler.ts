import { useState, useCallback } from 'react';
import { 
  ClassifiedError, 
  ErrorRecoveryAction, 
  errorHandler, 
  handleError,
  shouldRetryError,
  getRetryDelay,
  getErrorRecoveryActions 
} from '../lib/errorHandler';

// Hook return interface
export interface UseErrorHandlerReturn {
  error: ClassifiedError | null;
  isRetrying: boolean;
  retryCount: number;
  handleError: (error: any, context?: Record<string, any>) => ClassifiedError;
  clearError: () => void;
  retryLastOperation: () => Promise<void>;
  getRecoveryActions: () => ErrorRecoveryAction[];
  canRetry: boolean;
}

// Hook options interface
export interface UseErrorHandlerOptions {
  maxRetries?: number;
  baseRetryDelay?: number;
  onError?: (error: ClassifiedError) => void;
  onRetry?: (attemptCount: number) => void;
  onRecovery?: () => void;
}

/**
 * Custom hook for comprehensive error handling in React components
 * Provides error classification, retry logic, and recovery mechanisms
 */
export function useErrorHandler(options: UseErrorHandlerOptions = {}): UseErrorHandlerReturn {
  const {
    maxRetries = 3,
    baseRetryDelay = 1000,
    onError,
    onRetry,
    onRecovery,
  } = options;

  const [error, setError] = useState<ClassifiedError | null>(null);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [lastOperation, setLastOperation] = useState<(() => Promise<void>) | null>(null);

  /**
   * Handle and classify an error
   */
  const handleErrorCallback = useCallback((
    errorInput: any, 
    context?: Record<string, any>
  ): ClassifiedError => {
    const classifiedError = handleError(errorInput, context);
    setError(classifiedError);
    setRetryCount(0);
    setIsRetrying(false);

    // Call error callback if provided
    if (onError) {
      onError(classifiedError);
    }

    return classifiedError;
  }, [onError]);

  /**
   * Clear the current error
   */
  const clearError = useCallback(() => {
    setError(null);
    setRetryCount(0);
    setIsRetrying(false);
    setLastOperation(null);

    // Call recovery callback if provided
    if (onRecovery) {
      onRecovery();
    }
  }, [onRecovery]);

  /**
   * Retry the last operation with exponential backoff
   */
  const retryLastOperation = useCallback(async (): Promise<void> => {
    if (!lastOperation || !error || !shouldRetryError(error, retryCount + 1, maxRetries)) {
      return;
    }

    setIsRetrying(true);
    const newRetryCount = retryCount + 1;
    setRetryCount(newRetryCount);

    // Call retry callback if provided
    if (onRetry) {
      onRetry(newRetryCount);
    }

    try {
      // Wait for retry delay
      const delay = getRetryDelay(newRetryCount, baseRetryDelay);
      await new Promise(resolve => setTimeout(resolve, delay));

      // Execute the operation
      await lastOperation();

      // If successful, clear the error
      clearError();
    } catch (retryError) {
      // Handle the retry error
      const newClassifiedError = handleError(retryError, { 
        isRetry: true, 
        attemptCount: newRetryCount 
      });
      setError(newClassifiedError);
      setIsRetrying(false);

      // Call error callback for retry failure
      if (onError) {
        onError(newClassifiedError);
      }
    }
  }, [lastOperation, error, retryCount, maxRetries, baseRetryDelay, onRetry, onError, clearError]);

  /**
   * Get recovery actions for the current error
   */
  const getRecoveryActions = useCallback((): ErrorRecoveryAction[] => {
    if (!error) {
      return [];
    }

    const actions = getErrorRecoveryActions(error);

    // Enhance actions with actual implementations
    return actions.map(action => ({
      ...action,
      action: action.label === 'Try Again' ? retryLastOperation : action.action,
    }));
  }, [error, retryLastOperation]);

  /**
   * Determine if retry is possible
   */
  const canRetry = error ? shouldRetryError(error, retryCount + 1, maxRetries) : false;

  /**
   * Execute an operation with error handling and retry capability
   */
  const executeWithErrorHandling = useCallback(async (
    operation: () => Promise<void>,
    context?: Record<string, any>
  ): Promise<void> => {
    // Store the operation for potential retry
    setLastOperation(() => operation);
    clearError();

    try {
      await operation();
    } catch (operationError) {
      handleErrorCallback(operationError, context);
    }
  }, [handleErrorCallback, clearError]);

  return {
    error,
    isRetrying,
    retryCount,
    handleError: handleErrorCallback,
    clearError,
    retryLastOperation,
    getRecoveryActions,
    canRetry,
    // Additional utility method
    executeWithErrorHandling,
  } as UseErrorHandlerReturn & { executeWithErrorHandling: typeof executeWithErrorHandling };
}

// Utility hook for simple error display
export function useSimpleErrorHandler() {
  const [error, setError] = useState<string | null>(null);

  const handleError = useCallback((errorInput: any) => {
    const classifiedError = handleError(errorInput);
    setError(classifiedError.userMessage);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    handleError,
    clearError,
  };
}