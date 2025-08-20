import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { LoginPage } from '../login'
import { AuthProvider } from '../../contexts/auth-context'

// Mock Supabase for integration tests
const mockSignInWithPassword = jest.fn()
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      }),
      signUp: jest.fn(),
      signInWithPassword: mockSignInWithPassword,
      signOut: jest.fn(),
    },
  },
}))

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
    jest.clearAllMocks()
  })

  it('should integrate with auth context for sign in', async () => {
    const user = userEvent.setup()
    mockSignInWithPassword.mockResolvedValue({
      data: { 
        user: { id: '1', email: 'test@example.com' }, 
        session: { access_token: 'token' } 
      },
      error: null,
    })

    render(<TestApp />)

    // Wait for auth to initialize
    await waitFor(() => {
      expect(screen.getByText('Sign In')).toBeInTheDocument()
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
      status: 400,
    }
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: supabaseError,
    })

    render(<TestApp />)

    await waitFor(() => {
      expect(screen.getByText('Sign In')).toBeInTheDocument()
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
      expect(screen.getByText('Sign In')).toBeInTheDocument()
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
      expect(screen.getByText('Sign In')).toBeInTheDocument()
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
    const mockUser = { id: '1', email: 'test@example.com' }
    const mockSession = { access_token: 'token', user: mockUser }

    // Mock successful sign in
    mockSignInWithPassword.mockResolvedValue({
      data: { user: mockUser, session: mockSession },
      error: null,
    })

    // Mock auth state change to simulate successful login
    jest.doMock('../../lib/supabase', () => ({
      supabase: {
        auth: {
          getSession: jest.fn().mockResolvedValue({
            data: { session: null },
            error: null,
          }),
          onAuthStateChange: jest.fn().mockReturnValue({
            data: { subscription: { unsubscribe: jest.fn() } },
          }),
          signInWithPassword: mockSignInWithPassword,
          signUp: jest.fn(),
          signOut: jest.fn(),
        },
      },
    }))

    render(<TestApp />)

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

  it('should show loading state during auth initialization', () => {
    // Mock loading state
    jest.doMock('../../lib/supabase', () => ({
      supabase: {
        auth: {
          getSession: jest.fn().mockImplementation(() => new Promise(() => {})), // Never resolves
          onAuthStateChange: jest.fn().mockReturnValue({
            data: { subscription: { unsubscribe: jest.fn() } },
          }),
          signInWithPassword: mockSignInWithPassword,
          signUp: jest.fn(),
          signOut: jest.fn(),
        },
      },
    }))

    render(<TestApp />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(screen.queryByText('Sign In')).not.toBeInTheDocument()
  })
})