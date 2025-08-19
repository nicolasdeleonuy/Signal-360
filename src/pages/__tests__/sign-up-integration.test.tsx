import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { SignUpPage } from '../sign-up'
import { AuthProvider } from '../../contexts/auth-context'

// Mock Supabase for integration tests
const mockSignUp = jest.fn()
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
      signUp: mockSignUp,
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
    },
  },
}))

function TestApp({ initialEntries = ['/sign-up'] }: { initialEntries?: string[] }) {
  return (
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>
        <SignUpPage />
      </AuthProvider>
    </MemoryRouter>
  )
}

describe('SignUpPage Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should integrate with auth context for sign up', async () => {
    const user = userEvent.setup()
    mockSignUp.mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    })

    render(<TestApp />)

    // Wait for auth to initialize
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

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'Password123',
      })
    })
  })

  it('should handle Supabase sign up errors', async () => {
    const user = userEvent.setup()
    const supabaseError = {
      message: 'User already registered',
      status: 422,
    }
    mockSignUp.mockResolvedValue({
      data: { user: null, session: null },
      error: supabaseError,
    })

    render(<TestApp />)

    await waitFor(() => {
      expect(screen.getByText('Create Account')).toBeInTheDocument()
    })

    const emailInput = screen.getByLabelText('Email Address')
    const passwordInput = screen.getByLabelText('Password')
    const confirmPasswordInput = screen.getByLabelText('Confirm Password')
    const submitButton = screen.getByRole('button', { name: 'Create Account' })

    await user.type(emailInput, 'existing@example.com')
    await user.type(passwordInput, 'Password123')
    await user.type(confirmPasswordInput, 'Password123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('User already registered')).toBeInTheDocument()
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
          signUp: mockSignUp,
          signInWithPassword: jest.fn(),
          signOut: jest.fn(),
        },
      },
    }))

    render(<TestApp />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(screen.queryByText('Create Account')).not.toBeInTheDocument()
  })

  it('should handle network errors gracefully', async () => {
    const user = userEvent.setup()
    mockSignUp.mockRejectedValue(new Error('Network error'))

    render(<TestApp />)

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

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })
  })

  it('should validate form before making API call', async () => {
    const user = userEvent.setup()
    render(<TestApp />)

    await waitFor(() => {
      expect(screen.getByText('Create Account')).toBeInTheDocument()
    })

    const submitButton = screen.getByRole('button', { name: 'Create Account' })
    await user.click(submitButton)

    // Should show validation errors without calling signUp
    expect(screen.getByText('Email is required')).toBeInTheDocument()
    expect(screen.getByText('Password is required')).toBeInTheDocument()
    expect(mockSignUp).not.toHaveBeenCalled()
  })
})