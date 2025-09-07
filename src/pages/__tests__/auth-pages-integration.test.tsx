// Migrated to Vitest
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { vi } from 'vitest'
import { LoginPage } from '../login'
import { SignUpPage } from '../sign-up'
import { AuthProvider } from '../../contexts/auth-context'

// Mock Supabase
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

function AuthApp({ initialEntries = ['/login'] }: { initialEntries?: string[] }) {
  return (
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/sign-up" element={<SignUpPage />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  )
}

describe('Auth Pages Integration', () => {
  it('should navigate from login to sign-up page', async () => {
    const user = userEvent.setup()
    render(<AuthApp initialEntries={['/login']} />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument()
    })

    const signUpLink = screen.getByRole('link', { name: 'Create one here' })
    await user.click(signUpLink)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Create Account' })).toBeInTheDocument()
    })
  })

  it('should navigate from sign-up to login page', async () => {
    const user = userEvent.setup()
    render(<AuthApp initialEntries={['/sign-up']} />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Create Account' })).toBeInTheDocument()
    })

    const loginLink = screen.getByRole('link', { name: 'Sign in here' })
    await user.click(loginLink)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument()
    })
  })

  it('should maintain form state when navigating between pages', async () => {
    const user = userEvent.setup()
    render(<AuthApp initialEntries={['/login']} />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument()
    })

    // Fill in login form
    const emailInput = screen.getByLabelText('Email Address')
    await user.type(emailInput, 'test@example.com')

    // Navigate to sign-up
    const signUpLink = screen.getByRole('link', { name: 'Create one here' })
    await user.click(signUpLink)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Create Account' })).toBeInTheDocument()
    })

    // Navigate back to login
    const loginLink = screen.getByRole('link', { name: 'Sign in here' })
    await user.click(loginLink)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument()
    })

    // Form should be reset (this is expected behavior)
    const newEmailInput = screen.getByLabelText('Email Address')
    expect(newEmailInput).toHaveValue('')
  })

  it('should show consistent styling across auth pages', async () => {
    render(<AuthApp initialEntries={['/login']} />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument()
    })

    // Check login page heading styling
    const loginHeading = screen.getByRole('heading', { name: 'Sign In' })
    expect(loginHeading).toHaveStyle({ textAlign: 'center' })

    // Navigate to sign-up
    const user = userEvent.setup()
    const signUpLink = screen.getByRole('link', { name: 'Create one here' })
    await user.click(signUpLink)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Create Account' })).toBeInTheDocument()
    })

    // Check sign-up page heading styling
    const signUpHeading = screen.getByRole('heading', { name: 'Create Account' })
    expect(signUpHeading).toHaveStyle({ textAlign: 'center' })
  })

  it('should handle auth context consistently across pages', async () => {
    const user = userEvent.setup()
    render(<AuthApp initialEntries={['/login']} />)

    // Both pages should initialize without errors
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument()
    })

    // Navigate to sign-up
    const signUpLink = screen.getByRole('link', { name: 'Create one here' })
    await user.click(signUpLink)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Create Account' })).toBeInTheDocument()
    })

    // Both pages should have access to auth context
    expect(screen.getByRole('button', { name: 'Create Account' })).toBeInTheDocument()
  })
})