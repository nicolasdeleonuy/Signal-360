import { SessionManager } from '../session-manager'
import { supabase } from '../../lib/supabase'
import { MockSupabaseClient } from '../../types/mocks'

// Mock Supabase
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      refreshSession: jest.fn(),
      signOut: jest.fn(),
    },
  },
}))

const mockSupabase = supabase as unknown as MockSupabaseClient

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock timers
jest.useFakeTimers()

describe('SessionManager', () => {
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
    jest.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    jest.clearAllTimers()
  })

  afterEach(() => {
    SessionManager.clearRefreshTimer()
  })

  describe('initialize', () => {
    it('should initialize with valid session from Supabase', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession as any },
        error: null,
      })

      const result = await SessionManager.initialize()

      expect(result.session).toEqual(mockSession)
      expect(result.user).toEqual(mockSession.user)
      expect(result.expiresAt).toBe(mockSession.expires_at * 1000)
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })

    it('should handle no session from Supabase', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      })

      const result = await SessionManager.initialize()

      expect(result.session).toBeNull()
      expect(result.user).toBeNull()
      expect(result.expiresAt).toBeNull()
      expect(localStorageMock.removeItem).toHaveBeenCalled()
    })

    it('should handle Supabase errors', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Network error' } as any,
      })

      const result = await SessionManager.initialize()

      expect(result.session).toBeNull()
      expect(result.user).toBeNull()
      expect(result.expiresAt).toBeNull()
      expect(localStorageMock.removeItem).toHaveBeenCalled()
    })
  })

  describe('getStoredSession', () => {
    it('should return stored session if valid', () => {
      const storedData = {
        session: mockSession,
        expiresAt: mockSession.expires_at * 1000,
        storedAt: Date.now(),
      }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedData))

      const result = SessionManager.getStoredSession()

      expect(result.session).toEqual(mockSession)
      expect(result.user).toEqual(mockSession.user)
    })

    it('should return null if no stored session', () => {
      localStorageMock.getItem.mockReturnValue(null)

      const result = SessionManager.getStoredSession()

      expect(result.session).toBeNull()
      expect(result.user).toBeNull()
      expect(result.expiresAt).toBeNull()
    })

    it('should clear expired session', () => {
      const expiredSession = {
        ...mockSession,
        expires_at: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
      }
      const storedData = {
        session: expiredSession,
        expiresAt: expiredSession.expires_at * 1000,
        storedAt: Date.now(),
      }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedData))

      const result = SessionManager.getStoredSession()

      expect(result.session).toBeNull()
      expect(localStorageMock.removeItem).toHaveBeenCalled()
    })

    it('should handle corrupted stored data', () => {
      localStorageMock.getItem.mockReturnValue('invalid-json')

      const result = SessionManager.getStoredSession()

      expect(result.session).toBeNull()
      expect(localStorageMock.removeItem).toHaveBeenCalled()
    })
  })

  describe('needsRefresh', () => {
    it('should return true if session expires soon', () => {
      const soonToExpireSession = {
        ...mockSession,
        expires_at: Math.floor(Date.now() / 1000) + 60, // 1 minute from now
      }

      const result = SessionManager.needsRefresh(soonToExpireSession as any)

      expect(result).toBe(true)
    })

    it('should return false if session has plenty of time', () => {
      const result = SessionManager.needsRefresh(mockSession as any)

      expect(result).toBe(false)
    })

    it('should return false for null session', () => {
      const result = SessionManager.needsRefresh(null)

      expect(result).toBe(false)
    })
  })

  describe('refreshSession', () => {
    it('should refresh session successfully', async () => {
      const refreshedSession = {
        ...mockSession,
        access_token: 'new-token',
        expires_at: Math.floor(Date.now() / 1000) + 7200, // 2 hours from now
      }

      mockSupabase.auth.refreshSession.mockResolvedValue({
        data: { user: null, session: refreshedSession as any },
        error: null,
      })

      const result = await SessionManager.refreshSession()

      expect(result.session).toEqual(refreshedSession)
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })

    it('should handle refresh errors', async () => {
      mockSupabase.auth.refreshSession.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Refresh failed' } as any,
      })

      const result = await SessionManager.refreshSession()

      expect(result.session).toBeNull()
      expect(localStorageMock.removeItem).toHaveBeenCalled()
    })
  })

  describe('validateSession', () => {
    it('should validate valid session', () => {
      const result = SessionManager.validateSession(mockSession as any)

      expect(result).toBe(true)
    })

    it('should invalidate null session', () => {
      const result = SessionManager.validateSession(null)

      expect(result).toBe(false)
    })

    it('should invalidate session without access token', () => {
      const invalidSession = { ...mockSession, access_token: '' }

      const result = SessionManager.validateSession(invalidSession as any)

      expect(result).toBe(false)
    })

    it('should invalidate expired session', () => {
      const expiredSession = {
        ...mockSession,
        expires_at: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
      }

      const result = SessionManager.validateSession(expiredSession as any)

      expect(result).toBe(false)
    })
  })

  describe('getTimeRemaining', () => {
    it('should return correct time remaining', () => {
      const result = SessionManager.getTimeRemaining(mockSession as any)

      expect(result).toBeGreaterThan(0)
      expect(result).toBeLessThanOrEqual(3600 * 1000) // Should be less than or equal to 1 hour
    })

    it('should return 0 for null session', () => {
      const result = SessionManager.getTimeRemaining(null)

      expect(result).toBe(0)
    })

    it('should return 0 for expired session', () => {
      const expiredSession = {
        ...mockSession,
        expires_at: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
      }

      const result = SessionManager.getTimeRemaining(expiredSession as any)

      expect(result).toBe(0)
    })
  })

  describe('isSessionExpiringSoon', () => {
    it('should return true for session expiring soon', () => {
      const soonToExpireSession = {
        ...mockSession,
        expires_at: Math.floor(Date.now() / 1000) + 60, // 1 minute from now
      }

      const result = SessionManager.isSessionExpiringSoon(soonToExpireSession as any)

      expect(result).toBe(true)
    })

    it('should return false for session with plenty of time', () => {
      const result = SessionManager.isSessionExpiringSoon(mockSession as any)

      expect(result).toBe(false)
    })

    it('should return false for null session', () => {
      const result = SessionManager.isSessionExpiringSoon(null)

      expect(result).toBe(false)
    })
  })

  describe('handleSessionExpiry', () => {
    it('should clear session and sign out', () => {
      mockSupabase.auth.signOut.mockResolvedValue({ error: null })

      SessionManager.handleSessionExpiry()

      expect(localStorageMock.removeItem).toHaveBeenCalled()
      expect(mockSupabase.auth.signOut).toHaveBeenCalled()
    })
  })

  describe('setupCrossTabSync', () => {
    it('should set up storage event listener', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener')

      SessionManager.setupCrossTabSync()

      expect(addEventListenerSpy).toHaveBeenCalledWith('storage', expect.any(Function))
      expect(addEventListenerSpy).toHaveBeenCalledWith('focus', expect.any(Function))
    })
  })
})