// Migrated to Vitest
import { render, screen } from '@testing-library/react'
import { vi, type MockedFunction } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { withAuth } from '../with-auth'
import { useAuth } from '../../contexts/auth-context'

// Mock the auth context
vi.mock('../../contexts/auth-context')
const mockUseAuth = useAuth as MockedFunction<typeof useAuth>

// Mock Navigate component
vi.mock('react-router-dom', async () => ({
  ...await vi.importActual('react-router-dom'),
  Navigate: ({ to }: any) => <div data-testid="navigate">Redirecting to {to}</div>,
}))

// Test component
interface TestComponentProps {
  title: string
  count: number
}

function TestComponent({ title, count }: TestComponentProps) {
  return (
    <div data-testid="test-component">
      <h1>{title}</h1>
      <p>Count: {count}</p>
    </div>
  )
}

describe('withAuth HOC', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should wrap component with authentication protection', () => {
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
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
    })

    const ProtectedTestComponent = withAuth(TestComponent)

    render(
      <BrowserRouter>
        <ProtectedTestComponent title="Test Title" count={42} />
      </BrowserRouter>
    )

    expect(screen.getByTestId('test-component')).toBeInTheDocument()
    expect(screen.getByText('Test Title')).toBeInTheDocument()
    expect(screen.getByText('Count: 42')).toBeInTheDocument()
  })

  it('should redirect when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: false,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
    })

    const ProtectedTestComponent = withAuth(TestComponent)

    render(
      <BrowserRouter>
        <ProtectedTestComponent title="Test Title" count={42} />
      </BrowserRouter>
    )

    expect(screen.getByTestId('navigate')).toBeInTheDocument()
    expect(screen.queryByTestId('test-component')).not.toBeInTheDocument()
  })

  it('should show loading state', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: true,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
    })

    const ProtectedTestComponent = withAuth(TestComponent)

    render(
      <BrowserRouter>
        <ProtectedTestComponent title="Test Title" count={42} />
      </BrowserRouter>
    )

    expect(screen.getByText('Checking authentication...')).toBeInTheDocument()
    expect(screen.queryByTestId('test-component')).not.toBeInTheDocument()
  })

  it('should use custom fallback when provided', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: true,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
    })

    const customFallback = <div data-testid="custom-fallback">Custom Loading...</div>
    const ProtectedTestComponent = withAuth(TestComponent, { fallback: customFallback })

    render(
      <BrowserRouter>
        <ProtectedTestComponent title="Test Title" count={42} />
      </BrowserRouter>
    )

    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument()
    expect(screen.getByText('Custom Loading...')).toBeInTheDocument()
    expect(screen.queryByText('Checking authentication...')).not.toBeInTheDocument()
  })

  it('should preserve component display name', () => {
    const ProtectedTestComponent = withAuth(TestComponent)
    expect(ProtectedTestComponent.displayName).toBe('withAuth(TestComponent)')
  })

  it('should handle component without display name', () => {
    const AnonymousComponent = () => <div>Anonymous</div>
    const ProtectedAnonymousComponent = withAuth(AnonymousComponent)
    expect(ProtectedAnonymousComponent.displayName).toBe('withAuth(AnonymousComponent)')
  })

  it('should pass through all props correctly', () => {
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
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
    })

    interface ComplexProps {
      title: string
      items: string[]
      onClick: () => void
      isActive: boolean
    }

    function ComplexComponent({ title, items, onClick, isActive }: ComplexProps) {
      return (
        <div data-testid="complex-component">
          <h1>{title}</h1>
          <ul>
            {items.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
          <button onClick={onClick} disabled={!isActive}>
            Click me
          </button>
        </div>
      )
    }

    const ProtectedComplexComponent = withAuth(ComplexComponent)
    const mockOnClick = vi.fn()

    render(
      <BrowserRouter>
        <ProtectedComplexComponent
          title="Complex Title"
          items={['item1', 'item2']}
          onClick={mockOnClick}
          isActive={true}
        />
      </BrowserRouter>
    )

    expect(screen.getByTestId('complex-component')).toBeInTheDocument()
    expect(screen.getByText('Complex Title')).toBeInTheDocument()
    expect(screen.getByText('item1')).toBeInTheDocument()
    expect(screen.getByText('item2')).toBeInTheDocument()
    
    const button = screen.getByText('Click me')
    expect(button).not.toBeDisabled()
  })
})