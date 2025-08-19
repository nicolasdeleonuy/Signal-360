import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ProfilePage } from '../profile'
import { AuthProvider } from '../../contexts/auth-context'

// Mock Supabase for integration tests
const mockSignOut = jest.fn()
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { 
          session: {
            user: {
              id: '123e4567-e89b-12d3-a456-426614174000',
              email: 'test@example.com',
              created_at: '2023-01-15T10:30:00Z',
              last_sign_in_at: '2023-12-01T14:20:00Z',
            },
            access_token: 'token'
          }
        },
        error: null,
      }),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      }),
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: mockSignOut,
    },
  },
}))

function TestApp({ initialEntries = ['/profile'] }: { initialEntries?: string[] }) {
  return (
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>
        <ProfilePage />
      </AuthProvider>
    </MemoryRouter>
  )
}

describe('ProfilePage Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should integrate with auth context to display user information', async () => {
    render(<TestApp />)

    // Wait for auth to initialize and profile to load
    await waitFor(() => {
      expect(screen.getByText('Welcome to Signal-360')).toBeInTheDocument()
    })

    expect(screen.getByText('test@example.com')).toBeInTheDocument()
    expect(screen.getByText('123e4567-e89b-12d3-a456-426614174000')).toBeInTheDocument()
  })

  it('should integrate with auth context for sign out', async () => {
    const user = userEvent.setup()
    mockSignOut.mockResolvedValue({ error: null })
    render(<TestApp />)

    await waitFor(() => {
      expect(screen.getByText('Welcome to Signal-360')).toBeInTheDocument()
    })

    const signOutButton = screen.getByRole('button', { name: 'Sign Out' })
    await user.click(signOutButton)

    expect(mockSignOut).toHaveBeenCalled()
  })

  it('should handle auth context loading state', () => {
    // Mock loading state
    jest.doMock('../../lib/supabase', () => ({
      supabase: {
        auth: {
          getSession: jest.fn().mockImplementation(() => new Promise(() => {})), // Never resolves
          onAuthStateChange: jest.fn().mockReturnValue({
            data: { subscription: { unsubscribe: jest.fn() } },
          }),
          signUp: jest.fn(),
          signInWithPassword: jest.fn(),
          signOut: mockSignOut,
        },
      },
    }))

    render(<TestApp />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(screen.queryByText('Welcome to Signal-360')).not.toBeInTheDocument()
  })

  it('should handle sign out errors from Supabase', async () => {
    const user = userEvent.setup()
    mockSignOut.mockRejectedValue(new Error('Network error'))
    render(<TestApp />)

    await waitFor(() => {
      expect(screen.getByText('Welcome to Signal-360')).toBeInTheDocument()
    })

    const signOutButton = screen.getByRole('button', { name: 'Sign Out' })
    await user.click(signOutButton)

    // Should still attempt to sign out
    expect(mockSignOut).toHaveBeenCalled()
  })

  it('should handle session without user data', async () => {
    // Mock session without user
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
          signUp: jest.fn(),
          signInWithPassword: jest.fn(),
          signOut: mockSignOut,
        },
      },
    }))

    render(<TestApp />)

    await waitFor(() => {
      expect(screen.getByText('Access Denied')).toBeInTheDocument()
    })
  })

  it('should display real user data from auth context', async () => {
    render(<TestApp />)

    await waitFor(() => {
      expect(screen.getByText('Welcome to Signal-360')).toBeInTheDocument()
    })

    // Check that real user data is displayed
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
    expect(screen.getByText('1/15/2023')).toBeInTheDocument() // Account created
    expect(screen.getByText('12/1/2023')).toBeInTheDocument() // Last sign in
  })

  it('should handle auth state changes', async () => {
    let authStateCallback: (event: string, session: any) => void

    jest.doMock('../../lib/supabase', () => ({
      supabase: {
        auth: {
          getSession: jest.fn().mockResolvedValue({
            data: { session: null },
            error: null,
          }),
          onAuthStateChange: jest.fn().mockImplementation((callback) => {
            authStateCallback = callback
            return {
              data: { subscription: { unsubscribe: jest.fn() } },
            }
          }),
          signUp: jest.fn(),
          signInWithPassword: jest.fn(),
          signOut: mockSignOut,
        },
      },
    }))

    render(<TestApp />)

    // Initially should show access denied
    await waitFor(() => {
      expect(screen.getByText('Access Denied')).toBeInTheDocument()
    })

    // Simulate auth state change with user
    const mockSession = {
      user: {
        id: '123',
        email: 'newuser@example.com',
        created_at: '2023-01-01T00:00:00Z',
        last_sign_in_at: '2023-12-01T00:00:00Z',
      },
      access_token: 'token',
    }

    authStateCallback!('SIGNED_IN', mockSession)

    await waitFor(() => {
      expect(screen.getByText('Welcome to Signal-360')).toBeInTheDocument()
    })

    expect(screen.getByText('newuser@example.com')).toBeInTheDocument()
  })

  it('should maintain consistent state during navigation', async () => {
    render(<TestApp />)

    await waitFor(() => {
      expect(screen.getByText('Welcome to Signal-360')).toBeInTheDocument()
    })

    // User information should remain consistent
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
    
    // Should have all expected sections
    expect(screen.getByText('Account Information')).toBeInTheDocument()
    expect(screen.getByText('Getting Started')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign Out' })).toBeInTheDocument()
  })
})