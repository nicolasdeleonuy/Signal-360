import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SessionExpiryWarning } from '../session-expiry-warning'
import { useAuth } from '../../contexts/auth-context'
import { SessionManager } from '../../utils/session-manager'

// Mock dependencies
jest.mock('../../contexts/auth-context')
jest.mock('../../utils/session-manager')

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
const mockSessionManager = SessionManager as jest.Mocked<typeof SessionManager>

// Mock timers
jest.useFakeTimers()

describe('SessionExpiryWarning', () => {
  const mockSession = {
    access_token: 'mock-token',
    refresh_token: 'mock-refresh-token',
    expires_at: Math.floor(Date.now() / 1000) + 300, // 5 minutes from now
    expires_in: 300,
    token_type: 'bearer',
    user: {
      id: '123',
      email: 'test@example.com',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    },
  }

  const mockSignOut = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAuth.mockReturnValue({
      user: mockSession.user as any,
      session: mockSession as any,
      loading: false,
      signUp: jest.fn(),
      signIn: jest.fn(),
      signOut: mockSignOut,
    })

    mockSessionManager.getTimeRemaining.mockReturnValue(300000) // 5 minutes
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
    jest.useFakeTimers()
  })

  it('should not show warning when session has plenty of time', () => {
    mockSessionManager.getTimeRemaining.mockReturnValue(3600000) // 1 hour

    render(<SessionExpiryWarning />)

    expect(screen.queryByText('Session Expiring Soon')).not.toBeInTheDocument()
  })

  it('should show warning when session is expiring soon', () => {
    render(<SessionExpiryWarning />)

    expect(screen.getByText('⚠️ Session Expiring Soon')).toBeInTheDocument()
    expect(screen.getByText(/Your session will expire in/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Extend Session' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign Out' })).toBeInTheDocument()
  })

  it('should not show warning when no session', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: false,
      signUp: jest.fn(),
      signIn: jest.fn(),
      signOut: mockSignOut,
    })

    render(<SessionExpiryWarning />)

    expect(screen.queryByText('Session Expiring Soon')).not.toBeInTheDocument()
  })

  it('should format time remaining correctly', () => {
    // Test minutes and seconds
    mockSessionManager.getTimeRemaining.mockReturnValue(125000) // 2m 5s

    render(<SessionExpiryWarning />)

    expect(screen.getByText(/2m 5s/)).toBeInTheDocument()
  })

  it('should format time remaining for seconds only', () => {
    // Test seconds only
    mockSessionManager.getTimeRemaining.mockReturnValue(45000) // 45s

    render(<SessionExpiryWarning />)

    expect(screen.getByText(/45s/)).toBeInTheDocument()
  })

  it('should extend session when extend button is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    const onExtendSession = jest.fn()

    const refreshedSession = {
      ...mockSession,
      expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    }

    mockSessionManager.refreshSession.mockResolvedValue({
      session: refreshedSession as any,
      user: refreshedSession.user as any,
      expiresAt: refreshedSession.expires_at * 1000,
    })

    render(<SessionExpiryWarning onExtendSession={onExtendSession} />)

    const extendButton = screen.getByRole('button', { name: 'Extend Session' })
    await user.click(extendButton)

    expect(mockSessionManager.refreshSession).toHaveBeenCalled()
    
    await waitFor(() => {
      expect(onExtendSession).toHaveBeenCalled()
    })
  })

  it('should sign out when extend session fails', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

    mockSessionManager.refreshSession.mockResolvedValue({
      session: null,
      user: null,
      expiresAt: null,
    })

    render(<SessionExpiryWarning />)

    const extendButton = screen.getByRole('button', { name: 'Extend Session' })
    await user.click(extendButton)

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled()
    })
  })

  it('should sign out when sign out button is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

    render(<SessionExpiryWarning />)

    const signOutButton = screen.getByRole('button', { name: 'Sign Out' })
    await user.click(signOutButton)

    expect(mockSignOut).toHaveBeenCalled()
  })

  it('should handle session expiry automatically', () => {
    mockSessionManager.getTimeRemaining.mockReturnValue(0) // Expired

    render(<SessionExpiryWarning />)

    expect(mockSignOut).toHaveBeenCalled()
  })

  it('should update time remaining periodically', () => {
    let timeRemaining = 300000 // 5 minutes
    mockSessionManager.getTimeRemaining.mockImplementation(() => timeRemaining)

    render(<SessionExpiryWarning />)

    expect(screen.getByText(/5m 0s/)).toBeInTheDocument()

    // Simulate time passing
    timeRemaining = 240000 // 4 minutes
    jest.advanceTimersByTime(30000) // 30 seconds

    expect(screen.getByText(/4m 0s/)).toBeInTheDocument()
  })

  it('should use custom warning threshold', () => {
    mockSessionManager.getTimeRemaining.mockReturnValue(600000) // 10 minutes

    render(<SessionExpiryWarning warningThreshold={10} />)

    expect(screen.getByText('⚠️ Session Expiring Soon')).toBeInTheDocument()
  })

  it('should handle refresh session errors', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

    mockSessionManager.refreshSession.mockRejectedValue(new Error('Refresh failed'))

    render(<SessionExpiryWarning />)

    const extendButton = screen.getByRole('button', { name: 'Extend Session' })
    await user.click(extendButton)

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled()
    })
  })

  it('should clean up interval on unmount', () => {
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval')

    const { unmount } = render(<SessionExpiryWarning />)

    unmount()

    expect(clearIntervalSpy).toHaveBeenCalled()
  })

  it('should have proper styling and accessibility', () => {
    render(<SessionExpiryWarning />)

    const warning = screen.getByText('⚠️ Session Expiring Soon').closest('.session-expiry-warning')
    expect(warning).toHaveStyle({
      position: 'fixed',
      top: '20px',
      zIndex: '10001'
    })

    // Check buttons are accessible
    expect(screen.getByRole('button', { name: 'Extend Session' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign Out' })).toBeInTheDocument()
  })
})