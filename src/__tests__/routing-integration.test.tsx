import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'

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

describe('Routing Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should handle complete authentication flow with routing', async () => {
    const user = userEvent.setup()
    
    // Start with no user
    supabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    })

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    )

    // Should redirect to login
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
    mockSignUp.mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    })

    const emailInput = screen.getByLabelText('Email Address')
    const passwordInput = screen.getByLabelText('Password')
    const confirmPasswordInput = screen.getByLabelText('Confirm Password')
    const submitButton = screen.getByRole('button', { name: 'Create Account' })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'Password123')
    await user.type(confirmPasswordInput, 'Password123')
    await user.click(submitButton)

    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'Password123',
    })

    // Navigate back to login
    const loginLink = screen.getByRole('link', { name: 'Sign in here' })
    await user.click(loginLink)

    await waitFor(() => {
      expect(screen.getByText('Sign In')).toBeInTheDocument()
    })

    // Perform login
    mockSignInWithPassword.mockResolvedValue({
      data: { 
        user: { id: '1', email: 'test@example.com' }, 
        session: { access_token: 'token' } 
      },
      error: null,
    })

    const loginEmailInput = screen.getByLabelText('Email Address')
    const loginPasswordInput = screen.getByLabelText('Password')
    const loginSubmitButton = screen.getByRole('button', { name: 'Sign In' })

    await user.type(loginEmailInput, 'test@example.com')
    await user.type(loginPasswordInput, 'Password123')
    await user.click(loginSubmitButton)

    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'Password123',
    })
  })

  it('should handle protected route access and redirect flow', async () => {
    // Start with no user, try to access protected route
    supabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    })

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
  })

  it('should handle authenticated user accessing auth pages', async () => {
    // Mock authenticated user
    const mockUser = {
      id: '123',
      email: 'test@example.com',
      created_at: '2023-01-15T10:30:00Z',
      last_sign_in_at: '2023-12-01T14:20:00Z',
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
      <MemoryRouter initialEntries={['/login']}>
        <App />
      </MemoryRouter>
    )

    // Should redirect to profile
    await waitFor(() => {
      expect(screen.getByText('Welcome to Signal-360')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('should handle sign out flow and routing', async () => {
    const user = userEvent.setup()
    
    // Start with authenticated user
    const mockUser = {
      id: '123',
      email: 'test@example.com',
      created_at: '2023-01-15T10:30:00Z',
      last_sign_in_at: '2023-12-01T14:20:00Z',
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

    mockSignOut.mockResolvedValue({ error: null })

    render(
      <MemoryRouter initialEntries={['/profile']}>
        <App />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Welcome to Signal-360')).toBeInTheDocument()
    })

    // Sign out
    const signOutButton = screen.getByRole('button', { name: 'Sign Out' })
    await user.click(signOutButton)

    expect(mockSignOut).toHaveBeenCalled()
  })

  it('should handle unknown routes correctly', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    })

    render(
      <MemoryRouter initialEntries={['/some/unknown/deep/path']}>
        <App />
      </MemoryRouter>
    )

    // Should redirect through home to login
    await waitFor(() => {
      expect(screen.getByText('Sign In')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('should handle auth state changes during navigation', async () => {
    let authStateCallback: (event: string, session: any) => void

    supabase.auth.onAuthStateChange.mockImplementation((callback) => {
      authStateCallback = callback
      return {
        data: { subscription: { unsubscribe: jest.fn() } },
      }
    })

    supabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    })

    render(
      <MemoryRouter initialEntries={['/profile']}>
        <App />
      </MemoryRouter>
    )

    // Should start at login
    await waitFor(() => {
      expect(screen.getByText('Sign In')).toBeInTheDocument()
    })

    // Simulate authentication
    const mockSession = {
      user: {
        id: '123',
        email: 'test@example.com',
        created_at: '2023-01-01T00:00:00Z',
        last_sign_in_at: '2023-12-01T00:00:00Z',
      },
      access_token: 'token',
    }

    authStateCallback!('SIGNED_IN', mockSession)

    await waitFor(() => {
      expect(screen.getByText('Welcome to Signal-360')).toBeInTheDocument()
    })

    // Simulate sign out
    authStateCallback!('SIGNED_OUT', null)

    await waitFor(() => {
      expect(screen.getByText('Sign In')).toBeInTheDocument()
    })
  })

  it('should maintain consistent app structure across all routes', async () => {
    const routes = ['/login', '/sign-up', '/profile']
    
    for (const route of routes) {
      const hasUser = route === '/profile'
      
      const mockUser = hasUser ? {
        id: '123',
        email: 'test@example.com',
        created_at: '2023-01-15T10:30:00Z',
        last_sign_in_at: '2023-12-01T14:20:00Z',
      } : null

      const mockSession = hasUser ? {
        user: mockUser,
        access_token: 'token'
      } : null

      supabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      const { unmount } = render(
        <MemoryRouter initialEntries={[route]}>
          <App />
        </MemoryRouter>
      )

      await waitFor(() => {
        const appDiv = document.querySelector('.App')
        expect(appDiv).toBeInTheDocument()
      })

      unmount()
    }
  })

  it('should handle rapid navigation changes', async () => {
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

    // Rapid navigation between auth pages
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

    // Should handle rapid clicks without errors
    await user.click(signUpLink)
    await user.click(loginLink)

    await waitFor(() => {
      expect(screen.getByText('Sign In')).toBeInTheDocument()
    })
  })
})