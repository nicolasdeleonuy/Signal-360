// Migrated to Vitest
import { renderHook, act } from '@testing-library/react'
import { vi } from 'vitest'
import { useSession } from '../use-session'
import { useAuth } from '../../contexts/auth-context'
import { SessionManager } from '../../utils/session-manager'

// Mock dependencies
vi.mock('../../contexts/auth-context')
vi.mock('../../utils/session-manager')

const mockUseAuth = useAuth as vi.MockedFunction<typeof useAuth>
const mockSessionManager = SessionManager as vi.Mocked<typeof SessionManager>

// Mock timers
vi.useFakeTimers()

describe('useSession', () => {
  const mockSession = {
    access_token: 'mock-token',
    refresh_token: 'mock-refresh-token',
    expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    expires_in: 3600,
    token_type: 'bearer',
    user: {
      id: '123',
      email: 'test@example.com',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({
      user: mockSession.user as any,
      session: mockSession as any,
      loading: false,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
    })

    mockSessionManager.getTimeRemaining.mockReturnValue(3600000) // 1 hour
    mockSessionManager.validateSession.mockReturnValue(true)
    mockSessionManager.isSessionExpiringSoon.mockReturnValue(false)
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    vi.useFakeTimers()
  })

  it('should return session data', () => {
    const { result } = renderHook(() => useSession())

    expect(result.current.session).toEqual(mockSession)
    expect(result.current.isExpired).toBe(false)
    expect(result.current.isExpiringSoon).toBe(false)
    expect(result.current.timeRemaining).toBe(3600000)
    expect(result.current.isRefreshing).toBe(false)
  })

  it('should handle null session', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: false,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
    })

    mockSessionManager.validateSession.mockReturnValue(false)
    mockSessionManager.getTimeRemaining.mockReturnValue(0)

    const { result } = renderHook(() => useSession())

    expect(result.current.session).toBeNull()
    expect(result.current.isExpired).toBe(true)
    expect(result.current.timeRemaining).toBe(0)
  })

  it('should detect expiring session', () => {
    mockSessionManager.isSessionExpiringSoon.mockReturnValue(true)
    mockSessionManager.getTimeRemaining.mockReturnValue(300000) // 5 minutes

    const { result } = renderHook(() => useSession())

    expect(result.current.isExpiringSoon).toBe(true)
    expect(result.current.timeRemaining).toBe(300000)
  })

  it('should update time remaining periodically', () => {
    let timeRemaining = 3600000
    mockSessionManager.getTimeRemaining.mockImplementation(() => timeRemaining)

    const { result } = renderHook(() => useSession())

    expect(result.current.timeRemaining).toBe(3600000)

    // Simulate time passing
    act(() => {
      timeRemaining = 3540000 // 59 minutes
      vi.advanceTimersByTime(1000)
    })

    expect(result.current.timeRemaining).toBe(3540000)
  })

  it('should refresh session successfully', async () => {
    mockSessionManager.refreshSession.mockResolvedValue({
      session: mockSession as any,
      user: mockSession.user as any,
      expiresAt: mockSession.expires_at * 1000,
    })

    const { result } = renderHook(() => useSession())

    let refreshResult: boolean
    await act(async () => {
      refreshResult = await result.current.refreshSession()
    })

    expect(refreshResult!).toBe(true)
    expect(mockSessionManager.refreshSession).toHaveBeenCalled()
  })

  it('should handle refresh failure', async () => {
    mockSessionManager.refreshSession.mockResolvedValue({
      session: null,
      user: null,
      expiresAt: null,
    })

    const { result } = renderHook(() => useSession())

    let refreshResult: boolean
    await act(async () => {
      refreshResult = await result.current.refreshSession()
    })

    expect(refreshResult!).toBe(false)
  })

  it('should prevent concurrent refresh attempts', async () => {
    mockSessionManager.refreshSession.mockImplementation(
      () => new Promise(resolve => {
        setTimeout(() => resolve({
          session: mockSession as any,
          user: mockSession.user as any,
          expiresAt: mockSession.expires_at * 1000,
        }), 1000)
      })
    )

    const { result } = renderHook(() => useSession())

    // Start first refresh
    let firstRefresh: Promise<boolean>
    let secondRefresh: Promise<boolean>
    
    await act(async () => {
      firstRefresh = result.current.refreshSession()
    })
    
    // Now try to start second refresh while first is still in progress
    await act(async () => {
      secondRefresh = result.current.refreshSession()
    })
    
    // Advance timers to resolve the setTimeout for the first refresh
    await act(async () => {
      vi.advanceTimersByTime(1000)
    })

    const [firstResult, secondResult] = await Promise.all([firstRefresh!, secondRefresh!])

    expect(firstResult).toBe(true)
    expect(secondResult).toBe(false) // Should be prevented
    expect(mockSessionManager.refreshSession).toHaveBeenCalledTimes(1)
  })

  it('should handle refresh errors', async () => {
    mockSessionManager.refreshSession.mockRejectedValue(new Error('Refresh failed'))

    const { result } = renderHook(() => useSession())

    let refreshResult: boolean
    await act(async () => {
      refreshResult = await result.current.refreshSession()
    })

    expect(refreshResult!).toBe(false)
  })

  it('should clean up interval on unmount', () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval')

    const { unmount } = renderHook(() => useSession())

    unmount()

    expect(clearIntervalSpy).toHaveBeenCalled()
  })

  it('should handle session changes', () => {
    const { result, rerender } = renderHook(() => useSession())

    expect(result.current.timeRemaining).toBe(3600000)

    // Change session
    const newSession = {
      ...mockSession,
      expires_at: Math.floor(Date.now() / 1000) + 1800, // 30 minutes from now
    }

    mockUseAuth.mockReturnValue({
      user: newSession.user as any,
      session: newSession as any,
      loading: false,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
    })

    mockSessionManager.getTimeRemaining.mockReturnValue(1800000) // 30 minutes

    rerender()

    expect(result.current.timeRemaining).toBe(1800000)
  })
})