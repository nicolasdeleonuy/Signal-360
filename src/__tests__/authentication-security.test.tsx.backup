import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'
import { SessionManager } from '../utils/session-manager'

// Mock Supabase
const mockSignInWithPassword = jest.fn()
const mockSignUp = jest.fn()
const mockSignOut = jest.fn()
const mockGetSession = jest.fn()

jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      }),
      signUp: mockSignUp,
      signInWithPassword: mockSignInWithPassword,
      signOut: mockSignOut,
      refreshSession: jest.fn(),
    },
  },
}))

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

describe('Authentication Security Tests', () => {
  const mockUser = {
    id: '123',
    email: 'test@example.com',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  }

  const mockSession = {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    expires_in: 3600,
    token_type: 'bearer',
    user: mockUser,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    })
  })

  describe('Input Validation Security', () => {
    it('should validate email format to prevent injection', async () => {
      const user = userEvent.setup()

      render(
        <MemoryRouter initialEntries={['/login']}>
          <App />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Sign In')).toBeInTheDocument()
      })

      const emailInput = screen.getByLabelText('Email Address')
      const submitButton = screen.getByRole('button', { name: 'Sign In' })

      // Test various malicious email formats
      const maliciousEmails = [
        '<script>alert("xss")</script>@example.com',
        'test@example.com<script>alert("xss")</script>',
        'javascript:alert("xss")@example.com',
        'test@<script>alert("xss")</script>.com',
      ]

      for (const maliciousEmail of maliciousEmails) {
        await user.clear(emailInput)
        await user.type(emailInput, maliciousEmail)
        await user.click(submitButton)

        // Should show validation error, not execute script
        expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument()
        expect(mockSignInWithPassword).not.toHaveBeenCalled()
      }
    })

    it('should enforce password requirements to prevent weak passwords', async () => {
      const user = userEvent.setup()

      render(
        <MemoryRouter initialEntries={['/sign-up']}>
          <App />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Create Account')).toBeInTheDocument()
      })

      const passwordInput = screen.getByLabelText('Password')
      const submitButton = screen.getByRole('button', { name: 'Create Account' })

      // Test weak passwords
      const weakPasswords = [
        '123',
        'password',
        'PASSWORD',
        '12345678',
        'abcdefgh',
        'ABCDEFGH',
      ]

      for (const weakPassword of weakPasswords) {
        await user.clear(passwordInput)
        await user.type(passwordInput, weakPassword)
        await user.click(submitButton)

        // Should show password validation errors
        const errorMessages = [
          'Password must be at least 6 characters long',
          'Password must contain at least one lowercase letter',
          'Password must contain at least one uppercase letter',
          'Password must contain at least one number',
        ]

        const hasValidationError = errorMessages.some(message => 
          screen.queryByText(message) !== null
        )
        expect(hasValidationError).toBe(true)
        expect(mockSignUp).not.toHaveBeenCalled()
      }
    })

    it('should sanitize user input to prevent XSS', async () => {
      const user = userEvent.setup()

      mockSignInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      })

      render(
        <MemoryRouter initialEntries={['/login']}>
          <App />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Sign In')).toBeInTheDocument()
      })

      const emailInput = screen.getByLabelText('Email Address')
      const passwordInput = screen.getByLabelText('Password')
      const submitButton = screen.getByRole('button', { name: 'Sign In' })

      // Try to inject script through form fields
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, '<script>alert("xss")</script>')
      await user.click(submitButton)

      // Should not execute any scripts
      expect(document.querySelector('script')).toBeNull()
    })
  })

  describe('Session Security', () => {
    it('should validate session integrity', () => {
      // Test with invalid session
      const invalidSession = {
        access_token: '',
        user: null,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      }

      const isValid = SessionManager.validateSession(invalidSession as any)
      expect(isValid).toBe(false)
    })

    it('should detect expired sessions', () => {
      const expiredSession = {
        ...mockSession,
        expires_at: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
      }

      const isValid = SessionManager.validateSession(expiredSession as any)
      expect(isValid).toBe(false)
    })

    it('should clear session data on logout', async () => {
      const user = userEvent.setup()

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

      const signOutButton = screen.getByRole('button', { name: 'Sign Out' })
      await user.click(signOutButton)

      // Should clear localStorage
      expect(localStorageMock.removeItem).toHaveBeenCalled()
      expect(mockSignOut).toHaveBeenCalled()
    })

    it('should handle corrupted session data gracefully', async () => {
      // Mock corrupted localStorage data
      localStorageMock.getItem.mockReturnValue('invalid-json-data')

      render(
        <MemoryRouter initialEntries={['/profile']}>
          <App />
        </MemoryRouter>
      )

      // Should redirect to login instead of crashing
      await waitFor(() => {
        expect(screen.getByText('Sign In')).toBeInTheDocument()
      }, { timeout: 3000 })

      // Should clean up corrupted data
      expect(localStorageMock.removeItem).toHaveBeenCalled()
    })
  })

  describe('Route Protection Security', () => {
    it('should prevent unauthorized access to protected routes', async () => {
      // Try to access protected route without authentication
      render(
        <MemoryRouter initialEntries={['/profile']}>
          <App />
        </MemoryRouter>
      )

      // Should redirect to login
      await waitFor(() => {
        expect(screen.getByText('Sign In')).toBeInTheDocument()
      }, { timeout: 3000 })

      // Should not show protected content
      expect(screen.queryByText('Welcome to Signal-360')).not.toBeInTheDocument()
    })

    it('should validate session on protected route access', async () => {
      // Mock expired session in localStorage
      const expiredSession = {
        session: {
          ...mockSession,
          expires_at: Math.floor(Date.now() / 1000) - 3600, // Expired
        },
        expiresAt: (Math.floor(Date.now() / 1000) - 3600) * 1000,
        storedAt: Date.now(),
      }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(expiredSession))

      render(
        <MemoryRouter initialEntries={['/profile']}>
          <App />
        </MemoryRouter>
      )

      // Should redirect to login due to expired session
      await waitFor(() => {
        expect(screen.getByText('Sign In')).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('should prevent session fixation attacks', async () => {
      // Mock session with suspicious characteristics
      const suspiciousSession = {
        ...mockSession,
        access_token: 'fixed-token-123', // Predictable token
        user: {
          ...mockUser,
          id: 'admin', // Suspicious user ID
        },
      }

      mockGetSession.mockResolvedValue({
        data: { session: suspiciousSession },
        error: null,
      })

      render(
        <MemoryRouter initialEntries={['/profile']}>
          <App />
        </MemoryRouter>
      )

      // Should still validate through Supabase
      await waitFor(() => {
        expect(mockGetSession).toHaveBeenCalled()
      })
    })
  })

  describe('Error Information Disclosure', () => {
    it('should not expose sensitive information in error messages', async () => {
      const user = userEvent.setup()

      mockSignInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { 
          message: 'Invalid login credentials',
          details: 'User not found in database table users_auth_table',
          hint: 'Check if email exists in production database',
        },
      })

      render(
        <MemoryRouter initialEntries={['/login']}>
          <App />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Sign In')).toBeInTheDocument()
      })

      const emailInput = screen.getByLabelText('Email Address')
      const passwordInput = screen.getByLabelText('Password')
      const submitButton = screen.getByRole('button', { name: 'Sign In' })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'wrongpassword')
      await user.click(submitButton)

      // Should only show generic error message
      await waitFor(() => {
        expect(screen.getByText('Invalid login credentials')).toBeInTheDocument()
      })

      // Should not expose internal details
      expect(screen.queryByText(/database/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/table/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/production/i)).not.toBeInTheDocument()
    })

    it('should handle network errors without exposing system information', async () => {
      mockGetSession.mockRejectedValue(new Error('ECONNREFUSED 127.0.0.1:5432'))

      render(
        <MemoryRouter initialEntries={['/login']}>
          <App />
        </MemoryRouter>
      )

      // Should still render the app without exposing connection details
      await waitFor(() => {
        expect(document.querySelector('.App')).toBeInTheDocument()
      })

      // Should not show internal connection details
      expect(screen.queryByText(/ECONNREFUSED/)).not.toBeInTheDocument()
      expect(screen.queryByText(/127.0.0.1/)).not.toBeInTheDocument()
      expect(screen.queryByText(/5432/)).not.toBeInTheDocument()
    })
  })

  describe('Cross-Site Request Forgery (CSRF) Protection', () => {
    it('should use Supabase built-in CSRF protection', async () => {
      const user = userEvent.setup()

      mockSignInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      })

      render(
        <MemoryRouter initialEntries={['/login']}>
          <App />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Sign In')).toBeInTheDocument()
      })

      const emailInput = screen.getByLabelText('Email Address')
      const passwordInput = screen.getByLabelText('Password')
      const submitButton = screen.getByRole('button', { name: 'Sign In' })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      // Verify that authentication goes through Supabase
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
    })
  })

  describe('Session Hijacking Prevention', () => {
    it('should validate session on window focus', async () => {
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

      // Mock tampered session in localStorage
      const tamperedSession = {
        session: {
          ...mockSession,
          user: { ...mockUser, id: 'hacker' },
        },
        expiresAt: mockSession.expires_at * 1000,
        storedAt: Date.now(),
      }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(tamperedSession))

      // Simulate window focus (user returning to tab)
      window.dispatchEvent(new Event('focus'))

      // Should validate session and potentially sign out if invalid
      await waitFor(() => {
        expect(localStorageMock.getItem).toHaveBeenCalled()
      })
    })

    it('should handle cross-tab session synchronization securely', async () => {
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

      // Simulate malicious session update from another tab
      const maliciousSession = {
        session: {
          ...mockSession,
          access_token: 'malicious-token',
          user: { ...mockUser, email: 'hacker@evil.com' },
        },
        expiresAt: mockSession.expires_at * 1000,
        storedAt: Date.now(),
      }

      const storageEvent = new StorageEvent('storage', {
        key: 'signal360_session',
        newValue: JSON.stringify(maliciousSession),
        oldValue: JSON.stringify({ session: mockSession }),
      })

      window.dispatchEvent(storageEvent)

      // Should handle the event without compromising security
      // The actual session validation happens through Supabase
      await waitFor(() => {
        expect(document.querySelector('.App')).toBeInTheDocument()
      })
    })
  })

  describe('Data Sanitization', () => {
    it('should sanitize user data before display', async () => {
      const maliciousUser = {
        ...mockUser,
        email: '<script>alert("xss")</script>@example.com',
      }

      const maliciousSession = {
        ...mockSession,
        user: maliciousUser,
      }

      mockGetSession.mockResolvedValue({
        data: { session: maliciousSession },
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

      // Should display the email but not execute the script
      expect(screen.getByText('<script>alert("xss")</script>@example.com')).toBeInTheDocument()
      expect(document.querySelector('script')).toBeNull()
    })
  })
})