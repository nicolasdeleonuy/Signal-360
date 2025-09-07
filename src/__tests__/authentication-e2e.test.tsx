import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'
import { vi } from 'vitest'

// Mock Supabase
const mockSignInWithPassword = vi.fn()
const mockSignUp = vi.fn()
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
      signUp: mockSignUp,
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

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
})

describe('Authentication End-to-End Tests', () => {
  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    created_at: '2023-01-15T10:30:00Z',
    updated_at: '2023-01-15T10:30:00Z',
    last_sign_in_at: '2023-12-01T14:20:00Z',
  }

  const mockSession = {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    expires_in: 3600,
    token_type: 'bearer',
    user: mockUser,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    
    // Default to no session
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    })
  })

  describe('Complete User Registration Flow', () => {
    it('should handle complete sign-up flow from start to finish', async () => {
      const user = userEvent.setup()

      // Mock successful sign-up
      mockSignUp.mockResolvedValue({
        data: { 
          user: mockUser,
          session: mockSession
        },
        error: null,
      })

      render(
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>
      )

      // Should redirect to login initially
      await waitFor(() => {
        expect(screen.getByText('Sign In')).toBeInTheDocument()
      }, { timeout: 3000 })

      // Navigate to sign-up
      const signUpLink = screen.getByRole('link', { name: 'Create one here' })
      await user.click(signUpLink)

      await waitFor(() => {
        expect(screen.getByText('Create Account')).toBeInTheDocument()
      })

      // Fill out sign-up form
      const emailInput = screen.getByLabelText('Email Address')
      const passwordInput = screen.getByLabelText('Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm Password')
      const submitButton = screen.getByRole('button', { name: 'Create Account' })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'Password123')
      await user.type(confirmPasswordInput, 'Password123')

      // Submit form
      await user.click(submitButton)

      // Verify API call
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'Password123',
      })

      // Should redirect to profile after successful sign-up
      await waitFor(() => {
        expect(screen.getByText('Welcome to Signal-360')).toBeInTheDocument()
      })

      expect(screen.getByText('test@example.com')).toBeInTheDocument()
    })

    it('should handle sign-up validation errors', async () => {
      const user = userEvent.setup()

      render(
        <MemoryRouter initialEntries={['/sign-up']}>
          <App />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Create Account')).toBeInTheDocument()
      })

      const submitButton = screen.getByRole('button', { name: 'Create Account' })

      // Submit empty form
      await user.click(submitButton)

      // Should show validation errors
      expect(screen.getByText('Email is required')).toBeInTheDocument()
      expect(screen.getByText('Password is required')).toBeInTheDocument()
      expect(screen.getByText('Please confirm your password')).toBeInTheDocument()

      // Should not call API
      expect(mockSignUp).not.toHaveBeenCalled()
    })

    it('should handle sign-up API errors', async () => {
      const user = userEvent.setup()

      mockSignUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Email already registered' },
      })

      render(
        <MemoryRouter initialEntries={['/sign-up']}>
          <App />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Create Account')).toBeInTheDocument()
      })

      // Fill out form
      const emailInput = screen.getByLabelText('Email Address')
      const passwordInput = screen.getByLabelText('Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm Password')
      const submitButton = screen.getByRole('button', { name: 'Create Account' })

      await user.type(emailInput, 'existing@example.com')
      await user.type(passwordInput, 'Password123')
      await user.type(confirmPasswordInput, 'Password123')
      await user.click(submitButton)

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText('Email already registered')).toBeInTheDocument()
      })

      // Should stay on sign-up page
      expect(screen.getByText('Create Account')).toBeInTheDocument()
    })
  })

  describe('Complete User Login Flow', () => {
    it('should handle complete login flow from start to finish', async () => {
      const user = userEvent.setup()

      mockSignInWithPassword.mockResolvedValue({
        data: { 
          user: mockUser,
          session: mockSession
        },
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

      // Fill out login form
      const emailInput = screen.getByLabelText('Email Address')
      const passwordInput = screen.getByLabelText('Password')
      const submitButton = screen.getByRole('button', { name: 'Sign In' })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      // Verify API call
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })

      // Should redirect to profile
      await waitFor(() => {
        expect(screen.getByText('Welcome to Signal-360')).toBeInTheDocument()
      })

      expect(screen.getByText('test@example.com')).toBeInTheDocument()
    })

    it('should handle login from protected route redirect', async () => {
      const user = userEvent.setup()

      mockSignInWithPassword.mockResolvedValue({
        data: { 
          user: mockUser,
          session: mockSession
        },
        error: null,
      })

      // Try to access protected route
      render(
        <MemoryRouter initialEntries={['/profile']}>
          <App />
        </MemoryRouter>
      )

      // Should redirect to login with message
      await waitFor(() => {
        expect(screen.getByText('Sign In')).toBeInTheDocument()
        expect(screen.getByText('Please sign in to access this page.')).toBeInTheDocument()
      }, { timeout: 3000 })

      // Complete login
      const emailInput = screen.getByLabelText('Email Address')
      const passwordInput = screen.getByLabelText('Password')
      const submitButton = screen.getByRole('button', { name: 'Sign In' })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      // Should redirect back to originally requested profile page
      await waitFor(() => {
        expect(screen.getByText('Welcome to Signal-360')).toBeInTheDocument()
      })
    })

    it('should handle login errors', async () => {
      const user = userEvent.setup()

      mockSignInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      })

      render(
        <MemoryRouter initialEntries={['/login']}>
          <App />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Sign In')).toBeInTheDocument()
      })

      // Fill out form with wrong credentials
      const emailInput = screen.getByLabelText('Email Address')
      const passwordInput = screen.getByLabelText('Password')
      const submitButton = screen.getByRole('button', { name: 'Sign In' })

      await user.type(emailInput, 'wrong@example.com')
      await user.type(passwordInput, 'wrongpassword')
      await user.click(submitButton)

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText('Invalid login credentials')).toBeInTheDocument()
      })

      // Should stay on login page
      expect(screen.getByText('Sign In')).toBeInTheDocument()
    })
  })

  describe('Protected Route Access Control', () => {
    it('should protect routes from unauthenticated access', async () => {
      render(
        <MemoryRouter initialEntries={['/profile']}>
          <App />
        </MemoryRouter>
      )

      // Should redirect to login
      await waitFor(() => {
        expect(screen.getByText('Sign In')).toBeInTheDocument()
      }, { timeout: 3000 })

      expect(screen.queryByText('Welcome to Signal-360')).not.toBeInTheDocument()
    })

    it('should allow authenticated users to access protected routes', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      render(
        <MemoryRouter initialEntries={['/profile']}>
          <App />
        </MemoryRouter>
      )

      // Should show profile page
      await waitFor(() => {
        expect(screen.getByText('Welcome to Signal-360')).toBeInTheDocument()
      })

      expect(screen.getByText('test@example.com')).toBeInTheDocument()
    })

    it('should redirect authenticated users away from auth pages', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      render(
        <MemoryRouter initialEntries={['/login']}>
          <App />
        </MemoryRouter>
      )

      // Should redirect to profile
      await waitFor(() => {
        expect(screen.getByText('Welcome to Signal-360')).toBeInTheDocument()
      }, { timeout: 3000 })

      expect(screen.queryByText('Sign In')).not.toBeInTheDocument()
    })
  })

  describe('Session Management and Persistence', () => {
    it('should restore session from localStorage on app load', async () => {
      const storedSession = {
        session: mockSession,
        expiresAt: mockSession.expires_at * 1000,
        storedAt: Date.now(),
      }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedSession))

      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      render(
        <MemoryRouter initialEntries={['/profile']}>
          <App />
        </MemoryRouter>
      )

      // Should show profile without login
      await waitFor(() => {
        expect(screen.getByText('Welcome to Signal-360')).toBeInTheDocument()
      })

      expect(screen.getByText('test@example.com')).toBeInTheDocument()
    })

    it('should handle session expiry and automatic logout', async () => {
      const expiredSession = {
        ...mockSession,
        expires_at: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
      }

      mockGetSession.mockResolvedValue({
        data: { session: expiredSession },
        error: null,
      })

      mockSignOut.mockResolvedValue({ error: null })

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
  })

  describe('Complete Logout Flow', () => {
    it('should handle complete logout flow', async () => {
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

      // Should show profile page
      await waitFor(() => {
        expect(screen.getByText('Welcome to Signal-360')).toBeInTheDocument()
      })

      // Click logout
      const signOutButton = screen.getByRole('button', { name: 'Sign Out' })
      await user.click(signOutButton)

      // Should call sign out API
      expect(mockSignOut).toHaveBeenCalled()

      // Should redirect to login
      await waitFor(() => {
        expect(screen.getByText('Sign In')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should handle network errors gracefully', async () => {
      mockGetSession.mockRejectedValue(new Error('Network error'))

      render(
        <MemoryRouter initialEntries={['/login']}>
          <App />
        </MemoryRouter>
      )

      // Should still render the app
      await waitFor(() => {
        expect(document.querySelector('.App')).toBeInTheDocument()
      })
    })

    it('should handle component errors with error boundary', async () => {
      // Mock console.error to suppress error boundary logs
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Force an error by mocking a component to throw
      vi.doMock('../pages/profile', () => ({
        ProfilePage: () => {
          throw new Error('Component error')
        }
      }))

      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      render(
        <MemoryRouter initialEntries={['/profile']}>
          <App />
        </MemoryRouter>
      )

      // Should show error boundary
      await waitFor(() => {
        expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      })

      expect(screen.getByRole('button', { name: 'Refresh Page' })).toBeInTheDocument()

      // Restore mocks
      vi.unmock('../pages/profile')
      consoleSpy.mockRestore()
    })
  })

  describe('Performance and Loading States', () => {
    it('should show loading states during authentication', async () => {
      // Mock slow authentication
      mockGetSession.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          data: { session: null },
          error: null,
        }), 100))
      )

      render(
        <MemoryRouter initialEntries={['/profile']}>
          <App />
        </MemoryRouter>
      )

      // Should show loading spinner
      expect(screen.getByText('Checking authentication...')).toBeInTheDocument()

      // Wait for authentication to complete
      await waitFor(() => {
        expect(screen.getByText('Sign In')).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('should show loading states during form submission', async () => {
      const user = userEvent.setup()

      // Mock slow sign-in
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
      await user.click(submitButton)

      // Should show loading state
      expect(screen.getByText('Signing In...')).toBeInTheDocument()
      expect(submitButton).toBeDisabled()

      // Wait for completion
      await waitFor(() => {
        expect(screen.getByText('Welcome to Signal-360')).toBeInTheDocument()
      })
    })
  })

  describe('Cross-Browser Tab Synchronization', () => {
    it('should handle session changes across tabs', async () => {
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

      // Should handle session clearing
      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalled()
      })
    })
  })
})