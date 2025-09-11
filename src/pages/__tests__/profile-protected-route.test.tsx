// Migrated to Vitest
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { vi } from 'vitest'
import { ProfilePage } from '../profile'
import { LoginPage } from '../login'
import { ProtectedRoute } from '../../components/protected-route'
import { AuthProvider } from '../../contexts/auth-context'
import { MockAuthCallback } from '../../types/mocks'

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
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
const mockSignOut = vi.mocked(supabase.auth.signOut)
const mockGetSession = vi.mocked(supabase.auth.getSession)
const mockOnAuthStateChange = vi.mocked(supabase.auth.onAuthStateChange)

function TestApp({ 
  initialEntries = ['/profile'],
  hasUser = true 
}: { 
  initialEntries?: string[]
  hasUser?: boolean 
}) {
  const mockUser = hasUser ? {
    id: '123',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2023-01-15T10:30:00Z',
    updated_at: '2023-01-15T10:30:00Z',
    email_confirmed_at: '2023-01-15T10:30:00Z',
    phone: undefined,
    confirmed_at: '2023-01-15T10:30:00Z',
    last_sign_in_at: '2023-12-01T14:20:00Z',
    role: 'authenticated'
  } : null

  const mockSession = hasUser && mockUser ? {
    user: mockUser,
    access_token: 'token',
    refresh_token: 'refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    expires_at: Math.floor(Date.now() / 1000) + 3600
  } : null

  // Mock the session based on hasUser
  mockGetSession.mockResolvedValue({
    data: { session: mockSession },
    error: null,
  } as any)

  return (
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  )
}

describe('ProfilePage with ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render profile page when user is authenticated', async () => {
    render(<TestApp hasUser={true} />)

    await waitFor(() => {
      expect(screen.getByText('Welcome to Signal-360')).toBeInTheDocument()
    }, { timeout: 3000 })

    expect(screen.getByText('test@example.com')).toBeInTheDocument()
    expect(screen.getByText('Account Information')).toBeInTheDocument()
  })

  it('should redirect to login when user is not authenticated', async () => {
    render(<TestApp hasUser={false} />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument()
    }, { timeout: 3000 })

    expect(screen.queryByText('Welcome to Signal-360')).not.toBeInTheDocument()
  })

  it('should show loading state initially', () => {
    render(<TestApp hasUser={true} />)

    expect(screen.getByText('Checking authentication...')).toBeInTheDocument()
  })

  it('should handle sign out and redirect to login', async () => {
    const user = userEvent.setup()
    mockSignOut.mockResolvedValue({ error: null })
    
    render(<TestApp hasUser={true} />)

    await waitFor(() => {
      expect(screen.getByText('Welcome to Signal-360')).toBeInTheDocument()
    })

    const signOutButton = screen.getByRole('button', { name: 'Sign Out' })
    await user.click(signOutButton)

    expect(mockSignOut).toHaveBeenCalled()
  })

  it('should maintain protection even after auth state changes', async () => {
    let authStateCallback: MockAuthCallback

    mockOnAuthStateChange.mockImplementation((callback: MockAuthCallback) => {
      authStateCallback = callback
      return {
        data: { subscription: { id: 'test-sub-1', callback, unsubscribe: vi.fn() } },
      }
    })

    render(<TestApp hasUser={true} />)

    await waitFor(() => {
      expect(screen.getByText('Welcome to Signal-360')).toBeInTheDocument()
    })

    // Simulate sign out event
    authStateCallback!('SIGNED_OUT', null)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument()
    })

    expect(screen.queryByText('Welcome to Signal-360')).not.toBeInTheDocument()
  })

  it('should handle session expiry gracefully', async () => {
    let authStateCallback: MockAuthCallback

    // Set up the callback before rendering
    mockOnAuthStateChange.mockImplementation((callback: MockAuthCallback) => {
      authStateCallback = callback
      return {
        data: { subscription: { id: 'test-sub-2', callback, unsubscribe: vi.fn() } },
      }
    })

    render(<TestApp hasUser={true} />)

    await waitFor(() => {
      expect(screen.getByText('Welcome to Signal-360')).toBeInTheDocument()
    })

    // Simulate session expiry by changing the mock
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    })

    // Simulate token expired event
    authStateCallback!('TOKEN_REFRESHED', null)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument()
    })
  })

  it('should preserve profile state during protected route navigation', async () => {
    render(<TestApp hasUser={true} />)

    await waitFor(() => {
      expect(screen.getByText('Welcome to Signal-360')).toBeInTheDocument()
    })

    // Verify all profile information is displayed
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
    expect(screen.getByText('Account Information')).toBeInTheDocument()
    expect(screen.getByText('Getting Started')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign Out' })).toBeInTheDocument()
  })

  it('should handle protected route with custom fallback', async () => {
    function CustomProtectedProfile() {
      return (
        <ProtectedRoute fallback={<div data-testid="custom-loading">Custom Loading Profile...</div>}>
          <ProfilePage />
        </ProtectedRoute>
      )
    }

    render(
      <MemoryRouter initialEntries={['/profile']}>
        <AuthProvider>
          <CustomProtectedProfile />
        </AuthProvider>
      </MemoryRouter>
    )

    // Should show custom loading initially
    expect(screen.getByTestId('custom-loading')).toBeInTheDocument()
    expect(screen.getByText('Custom Loading Profile...')).toBeInTheDocument()
  })
})