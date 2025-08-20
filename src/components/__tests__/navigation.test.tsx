import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Navigation } from '../navigation'
import { useAuth } from '../../contexts/auth-context'

// Mock the auth context
jest.mock('../../contexts/auth-context')
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>

function renderNavigation(initialEntries = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Navigation />
    </MemoryRouter>
  )
}

describe('Navigation', () => {
  const mockSignOut = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Unauthenticated Navigation', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: null,
        session: null,
        loading: false,
        signUp: jest.fn(),
        signIn: jest.fn(),
        signOut: mockSignOut,
      })
    })

    it('should render public navigation for unauthenticated users', () => {
      renderNavigation()

      expect(screen.getByText('Signal-360')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Sign In' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Sign Up' })).toBeInTheDocument()
    })

    it('should highlight active link in public navigation', () => {
      renderNavigation(['/login'])

      const signInLink = screen.getByRole('link', { name: 'Sign In' })
      expect(signInLink).toHaveStyle({ color: '#1976d2', fontWeight: '600' })
    })

    it('should have correct links in public navigation', () => {
      renderNavigation()

      expect(screen.getByRole('link', { name: 'Signal-360' })).toHaveAttribute('href', '/')
      expect(screen.getByRole('link', { name: 'Sign In' })).toHaveAttribute('href', '/login')
      expect(screen.getByRole('link', { name: 'Sign Up' })).toHaveAttribute('href', '/sign-up')
    })
  })

  describe('Authenticated Navigation', () => {
    const mockUser = {
      id: '123',
      email: 'test@example.com',
      created_at: '2023-01-15T10:30:00Z',
      updated_at: '2023-01-15T10:30:00Z',
    }

    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockUser as any,
        session: { user: mockUser } as any,
        loading: false,
        signUp: jest.fn(),
        signIn: jest.fn(),
        signOut: mockSignOut,
      })
    })

    it('should render authenticated navigation for logged in users', () => {
      renderNavigation()

      expect(screen.getByText('Signal-360')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Profile' })).toBeInTheDocument()
      expect(screen.getByText('test@example.com')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Sign Out' })).toBeInTheDocument()
    })

    it('should highlight active link in authenticated navigation', () => {
      renderNavigation(['/profile'])

      const profileLink = screen.getByRole('link', { name: 'Profile' })
      expect(profileLink).toHaveStyle({ color: '#1976d2', fontWeight: '600' })
    })

    it('should have correct links in authenticated navigation', () => {
      renderNavigation()

      expect(screen.getByRole('link', { name: 'Signal-360' })).toHaveAttribute('href', '/profile')
      expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute('href', '/profile')
    })

    it('should display user email in navigation', () => {
      renderNavigation()

      expect(screen.getByText('test@example.com')).toBeInTheDocument()
    })

    it('should handle sign out when button is clicked', async () => {
      const user = userEvent.setup()
      mockSignOut.mockResolvedValue(undefined)
      renderNavigation()

      const signOutButton = screen.getByRole('button', { name: 'Sign Out' })
      await user.click(signOutButton)

      expect(mockSignOut).toHaveBeenCalled()
    })

    it('should handle sign out errors gracefully', async () => {
      const user = userEvent.setup()
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      mockSignOut.mockRejectedValue(new Error('Sign out failed'))
      renderNavigation()

      const signOutButton = screen.getByRole('button', { name: 'Sign Out' })
      await user.click(signOutButton)

      expect(mockSignOut).toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalledWith('Navigation sign out error:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })
  })

  describe('Navigation Styling', () => {
    it('should apply custom className', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        session: null,
        loading: false,
        signUp: jest.fn(),
        signIn: jest.fn(),
        signOut: jest.fn(),
      })

      render(
        <MemoryRouter>
          <Navigation className="custom-nav" />
        </MemoryRouter>
      )

      const nav = screen.getByRole('navigation')
      expect(nav).toHaveClass('navigation', 'custom-nav')
    })

    it('should have consistent styling across auth states', () => {
      // Test unauthenticated styling
      mockUseAuth.mockReturnValue({
        user: null,
        session: null,
        loading: false,
        signUp: jest.fn(),
        signIn: jest.fn(),
        signOut: jest.fn(),
      })

      const { rerender } = renderNavigation()
      const nav1 = screen.getByRole('navigation')
      expect(nav1).toHaveStyle({ backgroundColor: '#f8f9fa' })

      // Test authenticated styling
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        created_at: '2023-01-15T10:30:00Z',
        updated_at: '2023-01-15T10:30:00Z',
      }

      mockUseAuth.mockReturnValue({
        user: mockUser as any,
        session: { user: mockUser } as any,
        loading: false,
        signUp: jest.fn(),
        signIn: jest.fn(),
        signOut: jest.fn(),
      })

      rerender(
        <MemoryRouter>
          <Navigation />
        </MemoryRouter>
      )

      const nav2 = screen.getByRole('navigation')
      expect(nav2).toHaveStyle({ backgroundColor: '#f8f9fa' })
    })
  })

  describe('Responsive Behavior', () => {
    it('should maintain structure on different screen sizes', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        session: null,
        loading: false,
        signUp: jest.fn(),
        signIn: jest.fn(),
        signOut: jest.fn(),
      })

      renderNavigation()

      // Navigation should have proper container structure
      const nav = screen.getByRole('navigation')
      expect(nav).toBeInTheDocument()
      
      // Brand should be present
      expect(screen.getByText('Signal-360')).toBeInTheDocument()
      
      // Links should be present
      expect(screen.getByRole('link', { name: 'Sign In' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Sign Up' })).toBeInTheDocument()
    })
  })
})