import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter, MemoryRouter } from 'react-router-dom'
import { LoginPage } from '../login'
import { useAuth } from '../../contexts/auth-context'

// Mock the auth context
jest.mock('../../contexts/auth-context')
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>

// Mock navigate
const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}))

function renderLoginPage(initialEntries = ['/login']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <LoginPage />
    </MemoryRouter>
  )
}

describe('LoginPage', () => {
  const mockSignIn = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: false,
      signUp: jest.fn(),
      signIn: mockSignIn,
      signOut: jest.fn(),
    })
  })

  it('should render login form with all required fields', () => {
    renderLoginPage()

    expect(screen.getByText('Sign In')).toBeInTheDocument()
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument()
    expect(screen.getByText('Don\'t have an account?')).toBeInTheDocument()
  })

  it('should validate email format', async () => {
    const user = userEvent.setup()
    renderLoginPage()

    const emailInput = screen.getByLabelText('Email Address')
    const submitButton = screen.getByRole('button', { name: 'Sign In' })

    // Test empty email
    await user.click(submitButton)
    expect(screen.getByText('Email is required')).toBeInTheDocument()

    // Test invalid email format
    await user.type(emailInput, 'invalid-email')
    await user.click(submitButton)
    expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument()

    // Test valid email format
    await user.clear(emailInput)
    await user.type(emailInput, 'test@example.com')
    await user.click(submitButton)
    expect(screen.queryByText('Please enter a valid email address')).not.toBeInTheDocument()
  })

  it('should validate required password', async () => {
    const user = userEvent.setup()
    renderLoginPage()

    const submitButton = screen.getByRole('button', { name: 'Sign In' })

    // Test empty password
    await user.click(submitButton)
    expect(screen.getByText('Password is required')).toBeInTheDocument()

    // Test with password
    const passwordInput = screen.getByLabelText('Password')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)
    expect(screen.queryByText('Password is required')).not.toBeInTheDocument()
  })

  it('should clear field errors when user starts typing', async () => {
    const user = userEvent.setup()
    renderLoginPage()

    const emailInput = screen.getByLabelText('Email Address')
    const submitButton = screen.getByRole('button', { name: 'Sign In' })

    // Trigger validation error
    await user.click(submitButton)
    expect(screen.getByText('Email is required')).toBeInTheDocument()

    // Start typing to clear error
    await user.type(emailInput, 't')
    expect(screen.queryByText('Email is required')).not.toBeInTheDocument()
  })

  it('should handle successful sign in', async () => {
    const user = userEvent.setup()
    mockSignIn.mockResolvedValue(undefined)
    renderLoginPage()

    const emailInput = screen.getByLabelText('Email Address')
    const passwordInput = screen.getByLabelText('Password')
    const submitButton = screen.getByRole('button', { name: 'Sign In' })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123')
  })

  it('should handle sign in errors', async () => {
    const user = userEvent.setup()
    const errorMessage = 'Invalid login credentials'
    mockSignIn.mockRejectedValue(new Error(errorMessage))
    renderLoginPage()

    const emailInput = screen.getByLabelText('Email Address')
    const passwordInput = screen.getByLabelText('Password')
    const submitButton = screen.getByRole('button', { name: 'Sign In' })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'wrongpassword')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })
  })

  it('should show loading state during submission', async () => {
    const user = userEvent.setup()
    let resolveSignIn: () => void
    mockSignIn.mockImplementation(() => new Promise(resolve => {
      resolveSignIn = resolve
    }))
    renderLoginPage()

    const emailInput = screen.getByLabelText('Email Address')
    const passwordInput = screen.getByLabelText('Password')
    const submitButton = screen.getByRole('button', { name: 'Sign In' })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    expect(screen.getByText('Signing In...')).toBeInTheDocument()
    expect(submitButton).toBeDisabled()

    // Resolve the promise
    resolveSignIn!()
    await waitFor(() => {
      expect(screen.queryByText('Signing In...')).not.toBeInTheDocument()
    })
  })

  it('should redirect authenticated users to profile', () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      created_at: '2023-01-01',
      updated_at: '2023-01-01',
    }

    mockUseAuth.mockReturnValue({
      user: mockUser as any,
      session: { user: mockUser } as any,
      loading: false,
      signUp: jest.fn(),
      signIn: mockSignIn,
      signOut: jest.fn(),
    })

    renderLoginPage()

    expect(mockNavigate).toHaveBeenCalledWith('/profile', { replace: true })
  })

  it('should redirect to intended destination after login', () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      created_at: '2023-01-01',
      updated_at: '2023-01-01',
    }

    mockUseAuth.mockReturnValue({
      user: mockUser as any,
      session: { user: mockUser } as any,
      loading: false,
      signUp: jest.fn(),
      signIn: mockSignIn,
      signOut: jest.fn(),
    })

    // Simulate coming from a protected route
    const initialEntries = [{
      pathname: '/login',
      state: { from: { pathname: '/dashboard' } }
    }]

    render(
      <MemoryRouter initialEntries={initialEntries}>
        <LoginPage />
      </MemoryRouter>
    )

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true })
  })

  it('should show loading screen when auth is initializing', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: true,
      signUp: jest.fn(),
      signIn: mockSignIn,
      signOut: jest.fn(),
    })

    renderLoginPage()

    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(screen.queryByText('Sign In')).not.toBeInTheDocument()
  })

  it('should disable form inputs during submission', async () => {
    const user = userEvent.setup()
    let resolveSignIn: () => void
    mockSignIn.mockImplementation(() => new Promise(resolve => {
      resolveSignIn = resolve
    }))
    renderLoginPage()

    const emailInput = screen.getByLabelText('Email Address')
    const passwordInput = screen.getByLabelText('Password')
    const submitButton = screen.getByRole('button', { name: 'Sign In' })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    expect(emailInput).toBeDisabled()
    expect(passwordInput).toBeDisabled()
    expect(submitButton).toBeDisabled()

    // Resolve the promise
    resolveSignIn!()
    await waitFor(() => {
      expect(emailInput).not.toBeDisabled()
    })
  })

  it('should have link to sign-up page', () => {
    renderLoginPage()

    const signUpLink = screen.getByRole('link', { name: 'Create one here' })
    expect(signUpLink).toBeInTheDocument()
    expect(signUpLink).toHaveAttribute('href', '/sign-up')
  })

  it('should show redirect message when coming from protected route', () => {
    const initialEntries = [{
      pathname: '/login',
      state: { from: { pathname: '/dashboard' } }
    }]

    render(
      <MemoryRouter initialEntries={initialEntries}>
        <LoginPage />
      </MemoryRouter>
    )

    expect(screen.getByText('Please sign in to access this page.')).toBeInTheDocument()
  })

  it('should not show redirect message when accessing login directly', () => {
    renderLoginPage()

    expect(screen.queryByText('Please sign in to access this page.')).not.toBeInTheDocument()
  })

  it('should handle form submission with Enter key', async () => {
    const user = userEvent.setup()
    mockSignIn.mockResolvedValue(undefined)
    renderLoginPage()

    const emailInput = screen.getByLabelText('Email Address')
    const passwordInput = screen.getByLabelText('Password')

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.keyboard('{Enter}')

    expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123')
  })

  it('should have proper autocomplete attributes', () => {
    renderLoginPage()

    const emailInput = screen.getByLabelText('Email Address')
    const passwordInput = screen.getByLabelText('Password')

    expect(emailInput).toHaveAttribute('autocomplete', 'email')
    expect(passwordInput).toHaveAttribute('autocomplete', 'current-password')
  })
})