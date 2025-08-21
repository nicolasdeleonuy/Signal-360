import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'
import { SessionManager } from '../utils/session-manager'
import { vi } from 'vitest'

// Mock Supabase
const mockSignInWithPassword = vi.fn()
const mockSignOut = vi.fn()
const mockRefreshSession = vi.fn()
const mockGetSession = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signUp: vi.fn(),
      signInWithPassword: mockSignInWithPassword,
      signOut: mockSignOut,
      refreshSession: mockRefreshSession,
    },
  },
}))

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock timers
vi.useFakeTimers()

describe('Session Management Integration', () => {
  const mockUser = {
    id: '123',
    email: 'test@example.com',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  }

  const createMockSession = (expiresInMinutes: number) => ({
    access_token: 'mock-token',
    refresh_token: 'mock-refresh-token',
    expires_at: Math.floor(Date.now() / 1000) + (expiresInMinutes * 60),
    expires_in: expiresInMinutes * 60,
    token_type: 'bearer',
    user: mockUser,
  })

  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    vi.clearAllTimers()
  })

  afterEach(() => {
    SessionManager.clearRefreshTimer()
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    vi.useFakeTimers()
  })

  it('should restore session from localStorage on app load', async () => {
    const mockSession = createMockSession(60) // 1 hour

    // Mock stored session
    const storedData = {
      session: mockSession,
      expiresAt: mockSession.expires_at * 1000,
      storedAt: Date.now(),
    }
    localStorageMock.getItem.mockReturnValue(JSON.stringify(storedData))

    mockGetSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    })

    render(
      <MemoryRouter initialEntries={['/profile']}>
        <App />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Welcome to Signal-360')).toBeInTheDocument()
    }, { timeout: 3000 })

    expect(screen.getByText('test@example.com')).toBeInTheDocument()
  })

  it('should show session expiry warning when session is about to expire', async () => {
    const mockSession = createMockSession(4) // 4 minutes (less than 5 minute threshold)

    mockGetSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    })

    render(
      <MemoryRouter initialEntries={['/profile']}>
        <App />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Welcome to Signal-360')).toBeInTheDocument()
    })

    // Wait for session expiry warning to appear
    await waitFor(() => {
      expect(screen.getByText('⚠️ Session Expiring Soon')).toBeInTheDocument()
    }, { timeout: 5000 })
  })

  it('should extend session when user clicks extend button', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const mockSession = createMockSession(4) // 4 minutes
    const refreshedSession = createMockSession(60) // 1 hour

    mockGetSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    })

    mockRefreshSession.mockResolvedValue({
      data: { session: refreshedSession },
      error: null,
    })

    render(
      <MemoryRouter initialEntries={['/profile']}>
        <App />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('⚠️ Session Expiring Soon')).toBeInTheDocument()
    })

    const extendButton = screen.getByRole('button', { name: 'Extend Session' })
    await user.click(extendButton)

    expect(mockRefreshSession).toHaveBeenCalled()

    await waitFor(() => {
      expect(screen.queryByText('⚠️ Session Expiring Soon')).not.toBeInTheDocument()
    })
  })

  it('should sign out when session expires', async () => {
    const mockSession = createMockSession(0.1) // 6 seconds

    mockGetSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    })

    mockSignOut.mockResolvedValue({ error: null })

    render(
      <MemoryRouter initialEntries={['/profile']}>
        <App />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Welcome to Signal-360')).toBeInTheDocument()
    })

    // Fast forward time to expire session
    act(() => {
      vi.advanceTimersByTime(10000) // 10 seconds
    })

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled()
    })
  })

  it('should handle automatic session refresh', async () => {
    const mockSession = createMockSession(6) // 6 minutes (will trigger refresh at 1 minute remaining)
    const refreshedSession = createMockSession(60) // 1 hour

    mockGetSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    })

    mockRefreshSession.mockResolvedValue({
      data: { session: refreshedSession },
      error: null,
    })

    render(
      <MemoryRouter initialEntries={['/profile']}>
        <App />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Welcome to Signal-360')).toBeInTheDocument()
    })

    // Fast forward to trigger automatic refresh (5 minutes = refresh threshold)
    act(() => {
      vi.advanceTimersByTime(5 * 60 * 1000) // 5 minutes
    })

    await waitFor(() => {
      expect(mockRefreshSession).toHaveBeenCalled()
    })
  })

  it('should handle session refresh failure', async () => {
    const mockSession = createMockSession(4) // 4 minutes
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    mockGetSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    })

    mockRefreshSession.mockResolvedValue({
      data: { session: null },
      error: { message: 'Refresh failed' },
    })

    mockSignOut.mockResolvedValue({ error: null })

    render(
      <MemoryRouter initialEntries={['/profile']}>
        <App />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('⚠️ Session Expiring Soon')).toBeInTheDocument()
    })

    const extendButton = screen.getByRole('button', { name: 'Extend Session' })
    await user.click(extendButton)

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled()
    })
  })

  it('should persist session across page reloads', async () => {
    const mockSession = createMockSession(60) // 1 hour

    // First load - session from Supabase
    mockGetSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    })

    const { unmount } = render(
      <MemoryRouter initialEntries={['/profile']}>
        <App />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Welcome to Signal-360')).toBeInTheDocument()
    })

    // Verify session was stored
    expect(localStorageMock.setItem).toHaveBeenCalled()

    unmount()

    // Second load - session from localStorage
    const storedData = {
      session: mockSession,
      expiresAt: mockSession.expires_at * 1000,
      storedAt: Date.now(),
    }
    localStorageMock.getItem.mockReturnValue(JSON.stringify(storedData))

    render(
      <MemoryRouter initialEntries={['/profile']}>
        <App />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Welcome to Signal-360')).toBeInTheDocument()
    })
  })

  it('should clear expired session from localStorage', async () => {
    const expiredSession = createMockSession(-10) // Expired 10 minutes ago

    // Mock expired stored session
    const storedData = {
      session: expiredSession,
      expiresAt: expiredSession.expires_at * 1000,
      storedAt: Date.now(),
    }
    localStorageMock.getItem.mockReturnValue(JSON.stringify(storedData))

    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    })

    render(
      <MemoryRouter initialEntries={['/profile']}>
        <App />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Sign In')).toBeInTheDocument()
    })

    expect(localStorageMock.removeItem).toHaveBeenCalled()
  })

  it('should handle cross-tab session synchronization', async () => {
    const mockSession = createMockSession(60) // 1 hour

    mockGetSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    })

    render(
      <MemoryRouter initialEntries={['/profile']}>
        <App />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Welcome to Signal-360')).toBeInTheDocument()
    })

    // Simulate session cleared in another tab
    const storageEvent = new StorageEvent('storage', {
      key: 'signal360_session',
      newValue: null,
      oldValue: JSON.stringify({ session: mockSession }),
    })

    act(() => {
      window.dispatchEvent(storageEvent)
    })

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled()
    })
  })

  it('should validate session on window focus', async () => {
    const mockSession = createMockSession(60) // 1 hour

    mockGetSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    })

    render(
      <MemoryRouter initialEntries={['/profile']}>
        <App />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Welcome to Signal-360')).toBeInTheDocument()
    })

    // Mock expired session in localStorage
    const expiredSession = createMockSession(-10) // Expired
    const storedData = {
      session: expiredSession,
      expiresAt: expiredSession.expires_at * 1000,
      storedAt: Date.now(),
    }
    localStorageMock.getItem.mockReturnValue(JSON.stringify(storedData))

    // Simulate window focus
    act(() => {
      window.dispatchEvent(new Event('focus'))
    })

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled()
    })
  })
})