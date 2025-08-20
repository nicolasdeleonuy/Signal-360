
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

function TestApp({ 
  initialEntries = ['/'],
  hasUser = false 
}: { 
  initialEntries?: string[]
  hasUser?: boolean 
}) {
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

  // Mock the session based on hasUser
  supabase.auth.getSession.mockResolvedValue({
    data: { session: mockSession },
    error: null,
  })

  return (
    <MemoryRouter initialEntries={initialEntries}>
      <App />
    </MemoryRouter>
  )
}

describe('App Routing', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should redirect unauthenticated users from root to login', async () => {
    render(<TestApp initialEntries={['/']} hasUser={false} />)

    await waitFor(() => {
      expect(screen.getByText('Sign In')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('should redirect authenticated users from root to profile', async () => {
    render(<TestApp initialEntries={['/']} hasUser={true} />)

    await waitFor(() => {
      expect(screen.getByText('Welcome to Signal-360')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('should render login page at /login', async () => {
    render(<TestApp initialEntries={['/login']} hasUser={false} />)

    await waitFor(() => {
      expect(screen.getByText('Sign In')).toBeInTheDocument()
    })

    expect(screen.getByLabelText('Email Address')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
  })

  it('should render sign-up page at /sign-up', async () => {
    render(<TestApp initialEntries={['/sign-up']} hasUser={false} />)

    await waitFor(() => {
      expect(screen.getByText('Create Account')).toBeInTheDocument()
    })

    expect(screen.getByLabelText('Email Address')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument()
  })

  it('should render protected profile page for authenticated users', async () => {
    render(<TestApp initialEntries={['/profile']} hasUser={true} />)

    await waitFor(() => {
      expect(screen.getByText('Welcome to Signal-360')).toBeInTheDocument()
    })

    expect(screen.getByText('test@example.com')).toBeInTheDocument()
    expect(screen.getByText('Account Information')).toBeInTheDocument()
  })

  it('should redirect unauthenticated users from profile to login', async () => {
    render(<TestApp initialEntries={['/profile']} hasUser={false} />)

    await waitFor(() => {
      expect(screen.getByText('Sign In')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('should redirect unknown routes to home', async () => {
    render(<TestApp initialEntries={['/unknown-route']} hasUser={false} />)

    await waitFor(() => {
      expect(screen.getByText('Sign In')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('should handle navigation between public routes', async () => {
    const user = userEvent.setup()
    render(<TestApp initialEntries={['/login']} hasUser={false} />)

    await waitFor(() => {
      expect(screen.getByText('Sign In')).toBeInTheDocument()
    })

    // Navigate to sign-up
    const signUpLink = screen.getByRole('link', { name: 'Create one here' })
    await user.click(signUpLink)

    await waitFor(() => {
      expect(screen.getByText('Create Account')).toBeInTheDocument()
    })

    // Navigate back to login
    const loginLink = screen.getByRole('link', { name: 'Sign in here' })
    await user.click(loginLink)

    await waitFor(() => {
      expect(screen.getByText('Sign In')).toBeInTheDocument()
    })
  })

  it('should redirect authenticated users away from auth pages', async () => {
    render(<TestApp initialEntries={['/login']} hasUser={true} />)

    await waitFor(() => {
      expect(screen.getByText('Welcome to Signal-360')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('should handle sign out and redirect to login', async () => {
    const user = userEvent.setup()
    mockSignOut.mockResolvedValue({ error: null })
    
    render(<TestApp initialEntries={['/profile']} hasUser={true} />)

    await waitFor(() => {
      expect(screen.getByText('Welcome to Signal-360')).toBeInTheDocument()
    })

    const signOutButton = screen.getByRole('button', { name: 'Sign Out' })
    await user.click(signOutButton)

    expect(mockSignOut).toHaveBeenCalled()
  })

  it('should handle successful login flow', async () => {
    const user = userEvent.setup()
    mockSignInWithPassword.mockResolvedValue({
      data: { 
        user: { id: '1', email: 'test@example.com' }, 
        session: { access_token: 'token' } 
      },
      error: null,
    })

    render(<TestApp initialEntries={['/login']} hasUser={false} />)

    await waitFor(() => {
      expect(screen.getByText('Sign In')).toBeInTheDocument()
    })

    const emailInput = screen.getByLabelText('Email Address')
    const passwordInput = screen.getByLabelText('Password')
    const submitButton = screen.getByRole('button', { name: 'Sign In' })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    })
  })

  it('should handle successful sign up flow', async () => {
    const user = userEvent.setup()
    mockSignUp.mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    })

    render(<TestApp initialEntries={['/sign-up']} hasUser={false} />)

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
    await user.click(submitButton)

    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'Password123',
    })
  })

  it('should preserve location state for post-login redirect', async () => {
    // Simulate accessing protected route first
    render(<TestApp initialEntries={['/profile']} hasUser={false} />)

    await waitFor(() => {
      expect(screen.getByText('Sign In')).toBeInTheDocument()
    })

    // Should show redirect message
    expect(screen.getByText('Please sign in to access this page.')).toBeInTheDocument()
  })

  it('should handle auth state changes across routes', async () => {
    let authStateCallback: MockAuthCallback

    supabase.auth.onAuthStateChange.mockImplementation((callback: MockAuthCallback) => {
      authStateCallback = callback
      return {
        data: { subscription: { unsubscribe: jest.fn() } },
      }
    })

    render(<TestApp initialEntries={['/profile']} hasUser={false} />)

    // Should redirect to login initially
    await waitFor(() => {
      expect(screen.getByText('Sign In')).toBeInTheDocument()
    })

    // Simulate successful authentication
    const mockSession = {
      user: {
        id: '123',
        email: 'test@example.com',
        created_at: '2023-01-01T00:00:00Z',
        last_sign_in_at: '2023-12-01T00:00:00Z',
      },
      access_token: 'token',
      refresh_token: 'refresh_token',
      expires_in: 3600,
      token_type: 'bearer'
    } as Session

    authStateCallback!('SIGNED_IN', mockSession)

    await waitFor(() => {
      expect(screen.getByText('Welcome to Signal-360')).toBeInTheDocument()
    })
  })

  it('should handle multiple route redirects correctly', async () => {
    // Test cascade of redirects: unknown -> home -> profile -> login
    render(<TestApp initialEntries={['/some/deep/unknown/path']} hasUser={false} />)

    await waitFor(() => {
      expect(screen.getByText('Sign In')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('should maintain consistent app structure across routes', async () => {
    render(<TestApp initialEntries={['/login']} hasUser={false} />)

    await waitFor(() => {
      expect(screen.getByText('Sign In')).toBeInTheDocument()
    })

    // App container should be present
    const appDiv = screen.getByText('Sign In').closest('.App')
    expect(appDiv).toBeInTheDocument()
  })
})