// Migrated to Vitest
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { LoginPage } from '../login'
import { AuthProvider } from '../../contexts/auth-context'

// Mock Supabase for integration tests
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
  },
}))

// Import after mocking
import { supabase } from '../../lib/supabaseClient'
const mockSignInWithPassword = vi.mocked(supabase.auth.signInWithPassword)

// Mock objects that match Supabase types
const mockUser = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  email_confirmed_at: '2023-01-01T00:00:00Z',
  phone: undefined,
  confirmed_at: '2023-01-01T00:00:00Z',
  last_sign_in_at: '2023-01-01T00:00:00Z',
  role: 'authenticated'
}

const mockSession = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  user: mockUser,
  expires_at: Math.floor(Date.now() / 1000) + 3600
}

function TestApp({ initialEntries = ['/login'] }: { initialEntries?: any[] }) {
  return (
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </MemoryRouter>
  )
}

describe('LoginPage Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should integrate with auth context for sign in', async () => {
    const user = userEvent.setup()
    mockSignInWithPassword.mockResolvedValue({
      data: { 
        user: mockUser, 
        session: mockSession 
      },
      error: null,
    })

    render(<TestApp />)

    // Wait for auth to initialize
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument()
    })

    const emailInput = screen.getByLabelText('Email Address')
    const passwordInput = screen.getByLabelText('Password')
    const submitButton = screen.getByRole('button', { name: 'Sign In' })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
    })
  })

  it('should handle Supabase sign in errors', async () => {
    const user = userEvent.setup()
    const supabaseError = {
      message: 'Invalid login credentials',
      code: 'invalid_credentials',
      __isAuthError: true,
      name: 'AuthError',
      status: 400
    }
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: supabaseError as any,
    })

    render(<TestApp />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument()
    })

    const emailInput = screen.getByLabelText('Email Address')
    const passwordInput = screen.getByLabelText('Password')
    const submitButton = screen.getByRole('button', { name: 'Sign In' })

    await user.type(emailInput, 'wrong@example.com')
    await user.type(passwordInput, 'wrongpassword')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Invalid login credentials')).toBeInTheDocument()
    })
  })

  it('should handle network errors gracefully', async () => {
    const user = userEvent.setup()
    mockSignInWithPassword.mockRejectedValue(new Error('Network error'))

    render(<TestApp />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument()
    })

    const emailInput = screen.getByLabelText('Email Address')
    const passwordInput = screen.getByLabelText('Password')
    const submitButton = screen.getByRole('button', { name: 'Sign In' })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })
  })

  it('should validate form before making API call', async () => {
    const user = userEvent.setup()
    render(<TestApp />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument()
    })

    const submitButton = screen.getByRole('button', { name: 'Sign In' })
    await user.click(submitButton)

    // Should show validation errors without calling signIn
    expect(screen.getByText('Email is required')).toBeInTheDocument()
    expect(screen.getByText('Password is required')).toBeInTheDocument()
    expect(mockSignInWithPassword).not.toHaveBeenCalled()
  })

  it('should preserve redirect location from protected route', async () => {
    const initialEntries = [{
      pathname: '/login',
      state: { from: { pathname: '/dashboard' } }
    }]

    render(<TestApp initialEntries={initialEntries} />)

    await waitFor(() => {
      expect(screen.getByText('Please sign in to access this page.')).toBeInTheDocument()
    })
  })

  it('should handle successful authentication flow', async () => {
    const user = userEvent.setup()
    // Mock successful sign in
    mockSignInWithPassword.mockResolvedValue({
      data: { user: mockUser, session: mockSession },
      error: null,
    })

    // Mock auth state change to simulate successful login
    vi.doMock('../../lib/supabase', () => ({
      supabase: {
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: null },
            error: null,
          }),
          onAuthStateChange: vi.fn().mockReturnValue({
            data: { subscription: { unsubscribe: vi.fn() } },
          }),
          signInWithPassword: mockSignInWithPassword,
          signUp: vi.fn(),
          signOut: vi.fn(),
        },
      },
    }))

    render(<TestApp />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument()
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

  it('should show loading state during auth initialization', () => {
    // Mock loading state
    vi.doMock('../../lib/supabase', () => ({
      supabase: {
        auth: {
          getSession: vi.fn().mockImplementation(() => new Promise(() => {})), // Never resolves
          onAuthStateChange: vi.fn().mockReturnValue({
            data: { subscription: { unsubscribe: vi.fn() } },
          }),
          signInWithPassword: mockSignInWithPassword,
          signUp: vi.fn(),
          signOut: vi.fn(),
        },
      },
    }))

    render(<TestApp />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Sign In' })).not.toBeInTheDocument()
  })
})