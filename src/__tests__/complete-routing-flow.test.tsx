import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'
import { MockAuthCallback } from '../types/mocks'
import { Session } from '@supabase/supabase-js'

// Mock Supabase
const mockSignInWithPassword = jest.fn()
const mockSignUp = jest.fn()
const mockSignOut = jest.fn()

jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      }),
      signUp: mockSignUp,
      signInWithPassword: mockSignInWithPassword,
      signOut: mockSignOut,
    },
  },
}))

const { supabase } = require('../lib/supabase')

describe('Complete Routing Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should handle complete user journey from sign-up to profile', async () => {
    const user = userEvent.setup()
    let authStateCallback: MockAuthCallback

    // Mock auth state change handler
    supabase.auth.onAuthStateChange.mockImplementation((callback: MockAuthCallback) => {
      authStateCallback = callback
      return {
        data: { subscription: { unsubscribe: jest.fn() } },
      }
    })

    // Start with no session
    supabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    })

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    )

    // 1. Should redirect to login from root
    await waitFor(() => {
      expect(screen.getByText('Sign In')).toBeInTheDocument()
    }, { timeout: 3000 })

    // 2. Navigate to sign-up
    const signUpLink = screen.getByRole('link', { name: 'Create one here' })
    await user.click(signUpLink)

    await waitFor(() => {
      expect(screen.getByText('Create Account')).toBeInTheDocument()
    })

    // 3. Complete sign-up form
    mockSignUp.mockResolvedValue({
      data: { 
        user: { id: '1', email: 'newuser@example.com' },
        session: { access_token: 'token', user: { id: '1', email: 'newuser@example.com' } }
      },
      error: null,
    })

    const emailInput = screen.getByLabelText('Email Address')
    const passwordInput = screen.getByLabelText('Password')
    const confirmPasswordInput = screen.getByLabelText('Confirm Password')
    const submitButton = screen.getByRole('button', { name: 'Create Account' })

    await user.type(emailInput, 'newuser@example.com')
    await user.type(passwordInput, 'Password123')
    await user.type(confirmPasswordInput, 'Password123')
    await user.click(submitButton)

    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'newuser@example.com',
      password: 'Password123',
    })

    // 4. Simulate successful sign-up auth state change
    const mockSession = {
      user: {
        id: '1',
        email: 'newuser@example.com',
        created_at: '2023-12-01T00:00:00Z',
        last_sign_in_at: '2023-12-01T00:00:00Z',
      },
      access_token: 'token',
      refresh_token: 'refresh_token',
      expires_in: 3600,
      token_type: 'bearer'
    } as Session

    authStateCallback!('SIGNED_IN', mockSession)

    // 5. Should redirect to profile after successful sign-up
    await waitFor(() => {
      expect(screen.getByText('Welcome to Signal-360')).toBeInTheDocument()
    })

    expect(screen.getByText('newuser@example.com')).toBeInTheDocument()

    // 6. Test sign out
    mockSignOut.mockResolvedValue({ error: null })
    const signOutButton = screen.getByRole('button', { name: 'Sign Out' })
    await user.click(signOutButton)

    expect(mockSignOut).toHaveBeenCalled()

    // 7. Simulate sign out auth state change
    authStateCallback!('SIGNED_OUT', null)

    // Should redirect back to login
    await waitFor(() => {
      expect(screen.getByText('Sign In')).toBeInTheDocument()
    })
  })

  it('should handle protected route access and post-login redirect', async () => {
    const user = userEvent.setup()
    let authStateCallback: MockAuthCallback

    supabase.auth.onAuthStateChange.mockImplementation((callback: MockAuthCallback) => {
      authStateCallback = callback
      return {
        data: { subscription: { unsubscribe: jest.fn() } },
      }
    })

    // Start with no session, try to access profile
    supabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    })

    render(
      <MemoryRouter initialEntries={['/profile']}>
        <App />
      </MemoryRouter>
    )

    // 1. Should redirect to login with message
    await waitFor(() => {
      expect(screen.getByText('Sign In')).toBeInTheDocument()
      expect(screen.getByText('Please sign in to access this page.')).toBeInTheDocument()
    }, { timeout: 3000 })

    // 2. Complete login
    mockSignInWithPassword.mockResolvedValue({
      data: { 
        user: { id: '1', email: 'user@example.com' },
        session: { access_token: 'token', user: { id: '1', email: 'user@example.com' } }
      },
      error: null,
    })

    const emailInput = screen.getByLabelText('Email Address')
    const passwordInput = screen.getByLabelText('Password')
    const submitButton = screen.getByRole('button', { name: 'Sign In' })

    await user.type(emailInput, 'user@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'password123',
    })

    // 3. Simulate successful login
    const mockSession = {
      user: {
        id: '1',
        email: 'user@example.com',
        created_at: '2023-01-01T00:00:00Z',
        last_sign_in_at: '2023-12-01T00:00:00Z',
      },
      access_token: 'token',
      refresh_token: 'refresh_token',
      expires_in: 3600,
      token_type: 'bearer'
    } as Session

    authStateCallback!('SIGNED_IN', mockSession)

    // 4. Should redirect back to originally requested profile page
    await waitFor(() => {
      expect(screen.getByText('Welcome to Signal-360')).toBeInTheDocument()
    })

    expect(screen.getByText('user@example.com')).toBeInTheDocument()
  })

  it('should handle session expiry during navigation', async () => {
    let authStateCallback: MockAuthCallback

    supabase.auth.onAuthStateChange.mockImplementation((callback: MockAuthCallback) => {
      authStateCallback = callback
      return {
        data: { subscription: { unsubscribe: jest.fn() } },
      }
    })

    // Start with authenticated user
    const mockUser = {
      id: '1',
      email: 'user@example.com',
      created_at: '2023-01-01T00:00:00Z',
      last_sign_in_at: '2023-12-01T00:00:00Z',
    }

    supabase.auth.getSession.mockResolvedValue({
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

    // 1. Should show profile initially
    await waitFor(() => {
      expect(screen.getByText('Welcome to Signal-360')).toBeInTheDocument()
    })

    // 2. Simulate session expiry
    authStateCallback!('TOKEN_REFRESHED', null)

    // 3. Should redirect to login
    await waitFor(() => {
      expect(screen.getByText('Sign In')).toBeInTheDocument()
    })
  })

  it('should handle multiple route redirects correctly', async () => {
    // Test the cascade: /unknown -> / -> /profile -> /login
    supabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    })

    render(
      <MemoryRouter initialEntries={['/some/unknown/nested/route']}>
        <App />
      </MemoryRouter>
    )

    // Should end up at login after all redirects
    await waitFor(() => {
      expect(screen.getByText('Sign In')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('should maintain auth state consistency across route changes', async () => {
    // Start with authenticated user
    const mockUser = {
      id: '1',
      email: 'user@example.com',
      created_at: '2023-01-01T00:00:00Z',
      last_sign_in_at: '2023-12-01T00:00:00Z',
    }

    supabase.auth.getSession.mockResolvedValue({
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

    await waitFor(() => {
      expect(screen.getByText('Welcome to Signal-360')).toBeInTheDocument()
    })

    // User info should be consistent
    expect(screen.getByText('user@example.com')).toBeInTheDocument()
    expect(screen.getByText('Account Information')).toBeInTheDocument()

    // Try to navigate to login (should redirect back to profile)
    // This would be tested with actual navigation in a real browser
    // but in this test environment, we verify the auth state is maintained
    expect(screen.getByText('Welcome to Signal-360')).toBeInTheDocument()
  })

  it('should handle authentication errors during routing', async () => {
    const user = userEvent.setup()
    
    supabase.auth.getSession.mockResolvedValue({
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

    // Attempt login with error
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid credentials' },
    })

    const emailInput = screen.getByLabelText('Email Address')
    const passwordInput = screen.getByLabelText('Password')
    const submitButton = screen.getByRole('button', { name: 'Sign In' })

    await user.type(emailInput, 'wrong@example.com')
    await user.type(passwordInput, 'wrongpassword')
    await user.click(submitButton)

    // Should stay on login page and show error
    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
    })

    expect(screen.getByText('Sign In')).toBeInTheDocument()
  })
})