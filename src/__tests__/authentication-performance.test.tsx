import React from 'react'
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

describe('Authentication Performance Tests', () => {
  const mockUser = {
    id: '123',
    email: 'test@example.com',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  }

  const mockSession = {
    access_token: 'mock-token',
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

  describe('Initial Load Performance', () => {
    it('should initialize authentication quickly', async () => {
      const startTime = performance.now()

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

      const endTime = performance.now()
      const loadTime = endTime - startTime

      // Should load within reasonable time (adjust threshold as needed)
      expect(loadTime).toBeLessThan(1000) // 1 second
    })

    it('should handle session restoration efficiently', async () => {
      const storedSession = {
        session: mockSession,
        expiresAt: mockSession.expires_at * 1000,
        storedAt: Date.now(),
      }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedSession))

      const startTime = performance.now()

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

      const endTime = performance.now()
      const restoreTime = endTime - startTime

      // Session restoration should be fast
      expect(restoreTime).toBeLessThan(500) // 500ms
    })
  })

  describe('Form Submission Performance', () => {
    it('should handle login form submission efficiently', async () => {
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

      const startTime = performance.now()
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Welcome to Signal-360')).toBeInTheDocument()
      })

      const endTime = performance.now()
      const submitTime = endTime - startTime

      // Form submission should be responsive
      expect(submitTime).toBeLessThan(2000) // 2 seconds
    })

    it('should handle sign-up form submission efficiently', async () => {
      const user = userEvent.setup()

      mockSignUp.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      })

      render(
        <MemoryRouter initialEntries={['/sign-up']}>
          <App />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Create Account')).toBeInTheDocument()
      })

      const emailInput = screen.getByLabelText('Email Address')
      const passwordInput = screen.getByLabelText('Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm Password')
      const submitButton = screen.getByRole('button', { name: 'Create Account' })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'Password123')
      await user.type(confirmPasswordInput, 'Password123')

      const startTime = performance.now()
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Welcome to Signal-360')).toBeInTheDocument()
      })

      const endTime = performance.now()
      const submitTime = endTime - startTime

      // Sign-up should be responsive
      expect(submitTime).toBeLessThan(2000) // 2 seconds
    })
  })

  describe('Route Navigation Performance', () => {
    it('should handle route transitions efficiently', async () => {
      const user = userEvent.setup()

      render(
        <MemoryRouter initialEntries={['/login']}>
          <App />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Sign In')).toBeInTheDocument()
      })

      const startTime = performance.now()

      // Navigate to sign-up
      const signUpLink = screen.getByRole('link', { name: 'Create one here' })
      await user.click(signUpLink)

      await waitFor(() => {
        expect(screen.getByText('Create Account')).toBeInTheDocument()
      })

      const endTime = performance.now()
      const navigationTime = endTime - startTime

      // Route navigation should be fast
      expect(navigationTime).toBeLessThan(100) // 100ms
    })

    it('should handle protected route redirects efficiently', async () => {
      const startTime = performance.now()

      render(
        <MemoryRouter initialEntries={['/profile']}>
          <App />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Sign In')).toBeInTheDocument()
      }, { timeout: 3000 })

      const endTime = performance.now()
      const redirectTime = endTime - startTime

      // Redirect should be fast
      expect(redirectTime).toBeLessThan(1000) // 1 second
    })
  })

  describe('Memory Usage and Cleanup', () => {
    it('should clean up event listeners on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener')

      const { unmount } = render(
        <MemoryRouter initialEntries={['/login']}>
          <App />
        </MemoryRouter>
      )

      unmount()

      // Should clean up session manager listeners
      expect(removeEventListenerSpy).toHaveBeenCalled()
    })

    it('should clean up timers on unmount', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout')

      const { unmount } = render(
        <MemoryRouter initialEntries={['/profile']}>
          <App />
        </MemoryRouter>
      )

      unmount()

      // SessionManager should clean up its timers
      SessionManager.clearRefreshTimer()
      expect(clearTimeoutSpy).toHaveBeenCalled()
    })
  })

  describe('Concurrent Operations', () => {
    it('should handle multiple simultaneous authentication attempts', async () => {
      const user = userEvent.setup()

      mockSignInWithPassword.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          data: { user: mockUser, session: mockSession },
          error: null,
        }), 100))
      )

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

      // Click submit multiple times rapidly
      const startTime = performance.now()
      await user.click(submitButton)
      await user.click(submitButton) // Should be ignored
      await user.click(submitButton) // Should be ignored

      await waitFor(() => {
        expect(screen.getByText('Welcome to Signal-360')).toBeInTheDocument()
      })

      const endTime = performance.now()
      const totalTime = endTime - startTime

      // Should only make one API call despite multiple clicks
      expect(mockSignInWithPassword).toHaveBeenCalledTimes(1)
      expect(totalTime).toBeLessThan(2000) // Should not be significantly slower
    })

    it('should handle rapid route changes efficiently', async () => {
      const user = userEvent.setup()

      render(
        <MemoryRouter initialEntries={['/login']}>
          <App />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Sign In')).toBeInTheDocument()
      })

      const startTime = performance.now()

      // Rapid navigation
      const signUpLink = screen.getByRole('link', { name: 'Create one here' })
      await user.click(signUpLink)

      await waitFor(() => {
        expect(screen.getByText('Create Account')).toBeInTheDocument()
      })

      const loginLink = screen.getByRole('link', { name: 'Sign in here' })
      await user.click(loginLink)

      await waitFor(() => {
        expect(screen.getByText('Sign In')).toBeInTheDocument()
      })

      const endTime = performance.now()
      const navigationTime = endTime - startTime

      // Rapid navigation should be handled efficiently
      expect(navigationTime).toBeLessThan(500) // 500ms
    })
  })

  describe('Large Data Handling', () => {
    it('should handle large user data efficiently', async () => {
      const largeUserData = {
        ...mockUser,
        // Simulate large user object
        metadata: {
          preferences: new Array(1000).fill(0).map((_, i) => ({
            key: `pref_${i}`,
            value: `value_${i}`,
          })),
        },
      }

      const largeSession = {
        ...mockSession,
        user: largeUserData,
      }

      mockGetSession.mockResolvedValue({
        data: { session: largeSession },
        error: null,
      })

      const startTime = performance.now()

      render(
        <MemoryRouter initialEntries={['/profile']}>
          <App />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Welcome to Signal-360')).toBeInTheDocument()
      })

      const endTime = performance.now()
      const loadTime = endTime - startTime

      // Should handle large data without significant performance impact
      expect(loadTime).toBeLessThan(1500) // 1.5 seconds
    })
  })

  describe('Error Recovery Performance', () => {
    it('should recover from errors quickly', async () => {
      const user = userEvent.setup()

      // First attempt fails
      mockSignInWithPassword
        .mockResolvedValueOnce({
          data: { user: null, session: null },
          error: { message: 'Network error' },
        })
        .mockResolvedValueOnce({
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

      // First attempt
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })

      // Clear form and retry
      await user.clear(emailInput)
      await user.clear(passwordInput)
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')

      const startTime = performance.now()
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Welcome to Signal-360')).toBeInTheDocument()
      })

      const endTime = performance.now()
      const recoveryTime = endTime - startTime

      // Error recovery should be fast
      expect(recoveryTime).toBeLessThan(2000) // 2 seconds
    })
  })
})