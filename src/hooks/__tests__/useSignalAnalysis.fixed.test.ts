// Test to verify the useSignalAnalysis hook cleanup fix
import { renderHook, act } from '@testing-library/react';
import { useSignalAnalysis } from '../useSignalAnalysis';

// Mock the auth context
jest.mock('../../contexts/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@example.com' }
  })
}));

// Mock the API service
jest.mock('../../lib/apiService', () => ({
  apiService: {
    startAnalysis: jest.fn(),
    getAnalysisStatus: jest.fn()
  }
}));

describe('useSignalAnalysis - Cleanup Fix', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should cleanup polling interval on unmount without errors', () => {
    const { unmount } = renderHook(() => useSignalAnalysis());
    
    // This should not throw any errors
    expect(() => unmount()).not.toThrow();
  });

  it('should handle multiple cleanup calls without errors', () => {
    const { result, unmount } = renderHook(() => useSignalAnalysis());
    
    // Call cancelAnalysis multiple times
    act(() => {
      result.current.cancelAnalysis();
      result.current.cancelAnalysis();
      result.current.cancelAnalysis();
    });
    
    // Unmount should still work without errors
    expect(() => unmount()).not.toThrow();
  });

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useSignalAnalysis());
    
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
    // Removed progress and jobId checks as they don't exist in the interface
    expect(typeof result.current.runAnalysis).toBe('function');
    expect(typeof result.current.cancelAnalysis).toBe('function');
  });
});