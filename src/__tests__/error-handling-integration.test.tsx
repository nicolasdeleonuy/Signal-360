import { vi } from 'vitest'

// Hoisted mock variables - MUST be defined before vi.mock calls
const mockSignInWithPassword = vi.hoisted(() => vi.fn())
const mockSignUp = vi.hoisted(() => vi.fn())
const mockSignOut = vi.hoisted(() => vi.fn())
const mockGetSession = vi.hoisted(() => vi.fn())
const mockOnAuthStateChange = vi.hoisted(() => vi.fn())

// Mock Supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signUp: mockSignUp,
      signInWithPassword: mockSignInWithPassword,
      signOut: mockSignOut,
    },
  },
}))

// Import React testing utilities and components AFTER mocks
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'
import { MockAuthCallback } from '../types/mocks'

const { supabase } = await import('../lib/supabaseClient')

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
})

describe('Error Handling Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Suppress console.error for error boundary tests
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should handle authentication errors with toast notifications', async () => {
    const user = userEvent.setup()
    
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    })

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

    // Attempt login with invalid credentials
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
  })

  it('should handle network errors gracefully', async () => {
    mockGetSession.mockRejectedValue(new Error('Network error'))

    render(
      <MemoryRouter initialEntries={['/login']}>
        <App />
      </MemoryRouter>
    )

    // Should still render the app structure
    await waitFor(() => {
      expect(document.querySelector('.App')).toBeInTheDocument()
    })
  })

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

  it('should handle component errors with error boundary', async () => {
    // Mock a component that throws an error
    // Temporarily replace ProfilePage with error-throwing component
    vi.doMock('../pages/profile', () => ({
      ProfilePage: () => {
        throw new Error('Component error')
      }
    }))

    const mockUser = {
      id: '123',
      email: 'test@example.com',
      created_at: '2023-01-15T10:30:00Z',
      last_sign_in_at: '2023-12-01T14:20:00Z',
    }

    mockGetSession.mockResolvedValue({
      data: { 
        session: {
          user: mockUser,
          access_token: 'token'
        }
      },
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
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument()

    // Restore original component
    vi.unmock('../pages/profile')
  })

  it('should handle offline state', async () => {
    // Mock offline state
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    })

    // Trigger offline event
    const offlineEvent = new Event('offline')
    window.dispatchEvent(offlineEvent)

    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    })

    render(
      <MemoryRouter initialEntries={['/login']}>
        <App />
      </MemoryRouter>
    )

    // Should show network error overlay
    await waitFor(() => {
      expect(screen.getByText('Connection Problem')).toBeInTheDocument()
      expect(screen.getByText(/You appear to be offline/)).toBeInTheDocument()
    })

    // Mock back online
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    })

    const onlineEvent = new Event('online')
    window.dispatchEvent(onlineEvent)

    // Network error should be resolved
    await waitFor(() => {
      expect(screen.queryByText('Connection Problem')).not.toBeInTheDocument()
    })
  })

  it('should handle authentication state changes with proper error handling', async () => {
    let authStateCallback: MockAuthCallback

    mockOnAuthStateChange.mockImplementation((callback: MockAuthCallback) => {
      authStateCallback = callback
      return {
        data: { subscription: { unsubscribe: vi.fn() } },
      }
    })

    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    })

    render(
      <MemoryRouter initialEntries={['/profile']}>
        <App />
      </MemoryRouter>
    )

    // Should redirect to login
    await waitFor(() => {
      expect(screen.getByText('Sign In')).toBeInTheDocument()
    })

    // Simulate authentication with error
    authStateCallback!('SIGNED_IN', null) // Invalid session

    // Should handle gracefully
    await waitFor(() => {
      expect(screen.getByText('Sign In')).toBeInTheDocument()
    })
  })

  it('should maintain error handling across route changes', async () => {
    const user = userEvent.setup()
    
    mockGetSession.mockResolvedValue({
      data: { session: null },
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

    // Navigate to sign-up
    const signUpLink = screen.getByRole('link', { name: 'Create one here' })
    await user.click(signUpLink)

    await waitFor(() => {
      expect(screen.getByText('Create Account')).toBeInTheDocument()
    })

    // Error handling should still be active
    expect(document.querySelector('.App')).toBeInTheDocument()
  })

  it('should handle rapid error scenarios', async () => {
    const user = userEvent.setup()
    
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    })

    // Mock multiple failing requests
    mockSignInWithPassword
      .mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Error 1' },
      })
      .mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Error 2' },
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

    // First error
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Error 1')).toBeInTheDocument()
    })

    // Second error
    await user.clear(emailInput)
    await user.clear(passwordInput)
    await user.type(emailInput, 'test2@example.com')
    await user.type(passwordInput, 'password2')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Error 2')).toBeInTheDocument()
    })

    // Should handle both errors gracefully
    expect(screen.queryByText('Error 1')).not.toBeInTheDocument()
  })
})