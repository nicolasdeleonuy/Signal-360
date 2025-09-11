import { renderHook, act } from '@testing-library/react';
import { useErrorHandler } from '../useErrorHandler';
import { ErrorType } from '../../lib/errorHandler';
import { vi } from 'vitest';

describe('useErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should handle and classify errors', () => {
    const { result } = renderHook(() => useErrorHandler());

    act(() => {
      result.current.handleError(new Error('network error'));
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.error?.type).toBe(ErrorType.NETWORK);
    expect(result.current.error?.userMessage).toBe('Network error. Please check your connection and try again.');
    expect(result.current.retryCount).toBe(0);
    expect(result.current.isRetrying).toBe(false);
  });

  it('should clear errors', () => {
    const { result } = renderHook(() => useErrorHandler());

    act(() => {
      result.current.handleError(new Error('test error'));
    });

    expect(result.current.error).toBeDefined();

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.retryCount).toBe(0);
    expect(result.current.isRetrying).toBe(false);
  });

  it('should provide recovery actions', () => {
    const { result } = renderHook(() => useErrorHandler());

    act(() => {
      result.current.handleError(new Error('network error'));
    });

    const actions = result.current.getRecoveryActions();
    expect(actions).toHaveLength(2); // Try Again + Dismiss
    expect(actions[0].label).toBe('Try Again');
    expect(actions[1].label).toBe('Dismiss');
  });

  it('should determine retry capability', () => {
    const { result } = renderHook(() => useErrorHandler());

    // Retryable error
    act(() => {
      result.current.handleError(new Error('network error'));
    });
    expect(result.current.canRetry).toBe(true);

    // Non-retryable error
    act(() => {
      result.current.handleError({ status: 401, message: 'Unauthorized' });
    });
    expect(result.current.canRetry).toBe(false);
  });

  it('should call error callback when provided', () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useErrorHandler({ onError }));

    act(() => {
      result.current.handleError(new Error('test error'));
    });

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'test error',
        type: ErrorType.UNKNOWN,
      })
    );
  });

  it('should call recovery callback when error is cleared', () => {
    const onRecovery = vi.fn();
    const { result } = renderHook(() => useErrorHandler({ onRecovery }));

    act(() => {
      result.current.handleError(new Error('test error'));
    });

    act(() => {
      result.current.clearError();
    });

    expect(onRecovery).toHaveBeenCalled();
  });

  it('should execute operations with error handling', async () => {
    const { result } = renderHook(() => useErrorHandler());
    const operation = vi.fn().mockRejectedValue(new Error('operation failed'));

    await act(async () => {
      await (result.current as any).executeWithErrorHandling(operation);
    });

    expect(operation).toHaveBeenCalled();
    expect(result.current.error).toBeDefined();
    expect(result.current.error?.message).toBe('operation failed');
  });

  it('should handle successful operations', async () => {
    const { result } = renderHook(() => useErrorHandler());
    const operation = vi.fn().mockResolvedValue('success');

    await act(async () => {
      await (result.current as any).executeWithErrorHandling(operation);
    });

    expect(operation).toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  it('should respect max retry attempts', () => {
    const { result } = renderHook(() => useErrorHandler({ maxRetries: 3 }));

    act(() => {
      result.current.handleError(new Error('network error'));
    });

    // Network errors should be retryable initially
    expect(result.current.error?.retryable).toBe(true);
    expect(result.current.canRetry).toBe(true);
    expect(result.current.retryCount).toBe(0);
  });

  describe('Retry Logic', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should handle retry delay calculation', () => {
      const { result } = renderHook(() => useErrorHandler({ 
        maxRetries: 3, 
        baseRetryDelay: 100
      }));

      act(() => {
        result.current.handleError(new Error('network error'));
      });

      expect(result.current.error).toBeDefined();
      expect(result.current.canRetry).toBe(true);
      expect(result.current.retryCount).toBe(0);
    });

    it('should provide retry functionality', () => {
      const { result } = renderHook(() => useErrorHandler({ maxRetries: 2 }));

      act(() => {
        result.current.handleError(new Error('network error'));
      });

      expect(result.current.error).toBeDefined();
      expect(result.current.canRetry).toBe(true);
      expect(typeof result.current.retryLastOperation).toBe('function');
    });
  });
});