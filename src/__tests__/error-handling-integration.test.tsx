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

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
})

describe('Error Handling Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Suppress console.error for error boundary tests
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should handle authentication errors with toast notifications', async () => {
    const user = userEvent.setup()
    
    supabase.auth.getSession.mockResolvedValue({
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
    supabase.auth.getSession.mockRejectedValue(new Error('Network error'))

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
    supabase.auth.getSession.mockImplementation(
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
    const OriginalProfilePage = require('../pages/profile').ProfilePage
    
    // Temporarily replace ProfilePage with error-throwing component
    jest.doMock('../pages/profile', () => ({
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

    // Should show error boundary
    await waitFor(() => {
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: 'Refresh Page' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument()

    // Restore original component
    jest.unmock('../pages/profile')
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

    supabase.auth.getSession.mockResolvedValue({
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
    
    supabase.auth.getSession.mockResolvedValue({
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