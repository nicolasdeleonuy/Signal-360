// Migrated to Vitest
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { vi, type MockedFunction } from 'vitest'
import { ProfilePage } from '../profile'
import { useAuth } from '../../contexts/auth-context'

// Mock the auth context
vi.mock('../../contexts/auth-context')
const mockUseAuth = useAuth as MockedFunction<typeof useAuth>

// Mock navigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

function renderProfilePage() {
  return render(
    <BrowserRouter>
      <ProfilePage />
    </BrowserRouter>
  )
}

describe('ProfilePage', () => {
  const mockSignOut = vi.fn()
  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    created_at: '2023-01-15T10:30:00Z',
    updated_at: '2023-01-15T10:30:00Z',
    last_sign_in_at: '2023-12-01T14:20:00Z',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({
      user: mockUser as any,
      session: { user: mockUser } as any,
      loading: false,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: mockSignOut,
    })
  })

  it('should render profile page with user information', () => {
    renderProfilePage()

    expect(screen.getByText('Welcome to Signal-360')).toBeInTheDocument()
    expect(screen.getByText('Your investment analysis dashboard')).toBeInTheDocument()
    expect(screen.getByText('Account Information')).toBeInTheDocument()
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
  })

  it('should display user email correctly', () => {
    renderProfilePage()

    expect(screen.getByText('Email Address:')).toBeInTheDocument()
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
  })

  it('should display formatted account creation date', () => {
    renderProfilePage()

    expect(screen.getByText('Account Created:')).toBeInTheDocument()
    // The date should be formatted as a local date string
    expect(screen.getByText('1/15/2023')).toBeInTheDocument()
  })

  it('should display formatted last sign in date', () => {
    renderProfilePage()

    expect(screen.getByText('Last Sign In:')).toBeInTheDocument()
    expect(screen.getByText('12/1/2023')).toBeInTheDocument()
  })

  it('should display user ID', () => {
    renderProfilePage()

    expect(screen.getByText('User ID:')).toBeInTheDocument()
    expect(screen.getByText('123e4567-e89b-12d3-a456-426614174000')).toBeInTheDocument()
  })

  it('should handle missing date fields gracefully', () => {
    const userWithoutDates = {
      ...mockUser,
      created_at: null,
      last_sign_in_at: null,
    }

    mockUseAuth.mockReturnValue({
      user: userWithoutDates as any,
      session: { user: userWithoutDates } as any,
      loading: false,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: mockSignOut,
    })

    renderProfilePage()

    expect(screen.getAllByText('N/A')).toHaveLength(2)
  })

  it('should handle sign out successfully', async () => {
    const user = userEvent.setup()
    mockSignOut.mockResolvedValue(undefined)
    renderProfilePage()

    const signOutButton = screen.getByRole('button', { name: 'Sign Out' })
    await user.click(signOutButton)

    expect(mockSignOut).toHaveBeenCalled()
    expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true })
  })

  it('should show loading state during sign out', async () => {
    const user = userEvent.setup()
    let resolveSignOut: (value: unknown) => void
    mockSignOut.mockImplementation(() => new Promise(resolve => {
      resolveSignOut = resolve
    }))
    renderProfilePage()

    const signOutButton = screen.getByRole('button', { name: 'Sign Out' })
    await user.click(signOutButton)

    expect(screen.getByText('Signing Out...')).toBeInTheDocument()
    expect(signOutButton).toBeDisabled()

    // Resolve the promise
    resolveSignOut!({ error: null })
    await waitFor(() => {
      expect(screen.queryByText('Signing Out...')).not.toBeInTheDocument()
    })
  })

  it('should handle sign out errors gracefully', async () => {
    const user = userEvent.setup()
    mockSignOut.mockRejectedValue(new Error('Sign out failed'))
    renderProfilePage()

    const signOutButton = screen.getByRole('button', { name: 'Sign Out' })
    await user.click(signOutButton)

    // Should still navigate to login even if sign out fails
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true })
    })
  })

  it('should show loading screen when auth is initializing', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: true,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: mockSignOut,
    })

    renderProfilePage()

    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(screen.queryByText('Welcome to Signal-360')).not.toBeInTheDocument()
  })

  it('should handle no user gracefully', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: false,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: mockSignOut,
    })

    renderProfilePage()

    expect(screen.getByText('Access Denied')).toBeInTheDocument()
    expect(screen.getByText('You must be logged in to view this page.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Go to Login' })).toBeInTheDocument()
  })

  it('should navigate to login when access denied button is clicked', async () => {
    const user = userEvent.setup()
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: false,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: mockSignOut,
    })

    renderProfilePage()

    const loginButton = screen.getByRole('button', { name: 'Go to Login' })
    await user.click(loginButton)

    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })

  it('should show getting started section', () => {
    renderProfilePage()

    expect(screen.getByText('Getting Started')).toBeInTheDocument()
    expect(screen.getByText(/Welcome to Signal-360!/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Go to Dashboard' })).toBeInTheDocument()
  })

  it('should handle dashboard button click', async () => {
    const user = userEvent.setup()
    // Mock window.alert
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    renderProfilePage()

    const dashboardButton = screen.getByRole('button', { name: 'Go to Dashboard' })
    await user.click(dashboardButton)

    expect(alertSpy).toHaveBeenCalledWith('Dashboard feature coming soon!')
    alertSpy.mockRestore()
  })

  it('should have proper styling and layout', () => {
    renderProfilePage()

    const profileContainer = screen.getByText('Welcome to Signal-360').closest('.profile-container')
    expect(profileContainer).toHaveStyle({ backgroundColor: '#fff' })

    const signOutButton = screen.getByRole('button', { name: 'Sign Out' })
    expect(signOutButton).toHaveStyle({ backgroundColor: '#d32f2f' })
  })

  it('should display all required user information fields', () => {
    renderProfilePage()

    expect(screen.getByText('Email Address:')).toBeInTheDocument()
    expect(screen.getByText('Account Created:')).toBeInTheDocument()
    expect(screen.getByText('Last Sign In:')).toBeInTheDocument()
    expect(screen.getByText('User ID:')).toBeInTheDocument()
  })

  it('should have accessible button labels', () => {
    renderProfilePage()

    expect(screen.getByRole('button', { name: 'Sign Out' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Go to Dashboard' })).toBeInTheDocument()
  })

  it('should handle different user data formats', () => {
    const userWithDifferentFormat = {
      id: 'short-id',
      email: 'user@domain.co.uk',
      created_at: '2023-06-15T08:45:30.123Z',
      updated_at: '2023-06-15T08:45:30.123Z',
      last_sign_in_at: '2023-12-25T16:30:45.678Z',
    }

    mockUseAuth.mockReturnValue({
      user: userWithDifferentFormat as any,
      session: { user: userWithDifferentFormat } as any,
      loading: false,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: mockSignOut,
    })

    renderProfilePage()

    expect(screen.getByText('user@domain.co.uk')).toBeInTheDocument()
    expect(screen.getByText('short-id')).toBeInTheDocument()
    expect(screen.getByText('6/15/2023')).toBeInTheDocument()
    expect(screen.getByText('12/25/2023')).toBeInTheDocument()
  })
})