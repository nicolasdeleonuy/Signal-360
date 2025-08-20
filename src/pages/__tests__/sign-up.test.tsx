import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { SignUpPage } from '../sign-up'
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

function renderSignUpPage() {
  return render(
    <BrowserRouter>
      <SignUpPage />
    </BrowserRouter>
  )
}

describe('SignUpPage', () => {
  const mockSignUp = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: false,
      signUp: mockSignUp,
      signIn: jest.fn(),
      signOut: jest.fn(),
    })
  })

  it('should render sign-up form with all required fields', () => {
    renderSignUpPage()

    expect(screen.getByText('Create Account')).toBeInTheDocument()
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create Account' })).toBeInTheDocument()
    expect(screen.getByText('Already have an account?')).toBeInTheDocument()
  })

  it('should validate email format', async () => {
    const user = userEvent.setup()
    renderSignUpPage()

    const emailInput = screen.getByLabelText('Email Address')
    const submitButton = screen.getByRole('button', { name: 'Create Account' })

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

  it('should validate password requirements', async () => {
    const user = userEvent.setup()
    renderSignUpPage()

    const passwordInput = screen.getByLabelText('Password')
    const submitButton = screen.getByRole('button', { name: 'Create Account' })

    // Test empty password
    await user.click(submitButton)
    expect(screen.getByText('Password is required')).toBeInTheDocument()

    // Test password too short
    await user.type(passwordInput, '123')
    await user.click(submitButton)
    expect(screen.getByText('Password must be at least 6 characters long')).toBeInTheDocument()

    // Test password without lowercase
    await user.clear(passwordInput)
    await user.type(passwordInput, 'PASSWORD123')
    await user.click(submitButton)
    expect(screen.getByText('Password must contain at least one lowercase letter')).toBeInTheDocument()

    // Test password without uppercase
    await user.clear(passwordInput)
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)
    expect(screen.getByText('Password must contain at least one uppercase letter')).toBeInTheDocument()

    // Test password without number
    await user.clear(passwordInput)
    await user.type(passwordInput, 'Password')
    await user.click(submitButton)
    expect(screen.getByText('Password must contain at least one number')).toBeInTheDocument()

    // Test valid password
    await user.clear(passwordInput)
    await user.type(passwordInput, 'Password123')
    await user.click(submitButton)
    expect(screen.queryByText('Password must contain at least one number')).not.toBeInTheDocument()
  })

  it('should validate password confirmation', async () => {
    const user = userEvent.setup()
    renderSignUpPage()

    const passwordInput = screen.getByLabelText('Password')
    const confirmPasswordInput = screen.getByLabelText('Confirm Password')
    const submitButton = screen.getByRole('button', { name: 'Create Account' })

    // Test empty confirm password
    await user.type(passwordInput, 'Password123')
    await user.click(submitButton)
    expect(screen.getByText('Please confirm your password')).toBeInTheDocument()

    // Test mismatched passwords
    await user.type(confirmPasswordInput, 'DifferentPassword123')
    await user.click(submitButton)
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument()

    // Test matching passwords
    await user.clear(confirmPasswordInput)
    await user.type(confirmPasswordInput, 'Password123')
    await user.click(submitButton)
    expect(screen.queryByText('Passwords do not match')).not.toBeInTheDocument()
  })

  it('should clear field errors when user starts typing', async () => {
    const user = userEvent.setup()
    renderSignUpPage()

    const emailInput = screen.getByLabelText('Email Address')
    const submitButton = screen.getByRole('button', { name: 'Create Account' })

    // Trigger validation error
    await user.click(submitButton)
    expect(screen.getByText('Email is required')).toBeInTheDocument()

    // Start typing to clear error
    await user.type(emailInput, 't')
    expect(screen.queryByText('Email is required')).not.toBeInTheDocument()
  })

  it('should handle successful sign up', async () => {
    const user = userEvent.setup()
    mockSignUp.mockResolvedValue(undefined)
    renderSignUpPage()

    const emailInput = screen.getByLabelText('Email Address')
    const passwordInput = screen.getByLabelText('Password')
    const confirmPasswordInput = screen.getByLabelText('Confirm Password')
    const submitButton = screen.getByRole('button', { name: 'Create Account' })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'Password123')
    await user.type(confirmPasswordInput, 'Password123')
    await user.click(submitButton)

    expect(mockSignUp).toHaveBeenCalledWith('test@example.com', 'Password123')
  })

  it('should handle sign up errors', async () => {
    const user = userEvent.setup()
    const errorMessage = 'Email already exists'
    mockSignUp.mockRejectedValue(new Error(errorMessage))
    renderSignUpPage()

    const emailInput = screen.getByLabelText('Email Address')
    const passwordInput = screen.getByLabelText('Password')
    const confirmPasswordInput = screen.getByLabelText('Confirm Password')
    const submitButton = screen.getByRole('button', { name: 'Create Account' })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'Password123')
    await user.type(confirmPasswordInput, 'Password123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })
  })

  it('should show loading state during submission', async () => {
    const user = userEvent.setup()
    let resolveSignUp: (value: unknown) => void
    mockSignUp.mockImplementation(() => new Promise(resolve => {
      resolveSignUp = resolve
    }))
    renderSignUpPage()

    const emailInput = screen.getByLabelText('Email Address')
    const passwordInput = screen.getByLabelText('Password')
    const confirmPasswordInput = screen.getByLabelText('Confirm Password')
    const submitButton = screen.getByRole('button', { name: 'Create Account' })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'Password123')
    await user.type(confirmPasswordInput, 'Password123')
    await user.click(submitButton)

    expect(screen.getByText('Creating Account...')).toBeInTheDocument()
    expect(submitButton).toBeDisabled()

    // Resolve the promise
    resolveSignUp!({ data: { user: null, session: null }, error: null })
    await waitFor(() => {
      expect(screen.queryByText('Creating Account...')).not.toBeInTheDocument()
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
      signUp: mockSignUp,
      signIn: jest.fn(),
      signOut: jest.fn(),
    })

    renderSignUpPage()

    expect(mockNavigate).toHaveBeenCalledWith('/profile')
  })

  it('should show loading screen when auth is initializing', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: true,
      signUp: mockSignUp,
      signIn: jest.fn(),
      signOut: jest.fn(),
    })

    renderSignUpPage()

    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(screen.queryByText('Create Account')).not.toBeInTheDocument()
  })

  it('should disable form inputs during submission', async () => {
    const user = userEvent.setup()
    let resolveSignUp: (value: unknown) => void
    mockSignUp.mockImplementation(() => new Promise(resolve => {
      resolveSignUp = resolve
    }))
    renderSignUpPage()

    const emailInput = screen.getByLabelText('Email Address')
    const passwordInput = screen.getByLabelText('Password')
    const confirmPasswordInput = screen.getByLabelText('Confirm Password')
    const submitButton = screen.getByRole('button', { name: 'Create Account' })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'Password123')
    await user.type(confirmPasswordInput, 'Password123')
    await user.click(submitButton)

    expect(emailInput).toBeDisabled()
    expect(passwordInput).toBeDisabled()
    expect(confirmPasswordInput).toBeDisabled()
    expect(submitButton).toBeDisabled()

    // Resolve the promise
    resolveSignUp!({ data: { user: null, session: null }, error: null })
    await waitFor(() => {
      expect(emailInput).not.toBeDisabled()
    })
  })

  it('should have link to login page', () => {
    renderSignUpPage()

    const loginLink = screen.getByRole('link', { name: 'Sign in here' })
    expect(loginLink).toBeInTheDocument()
    expect(loginLink).toHaveAttribute('href', '/login')
  })
})