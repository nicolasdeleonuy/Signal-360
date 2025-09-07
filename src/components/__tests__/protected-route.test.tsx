import React from 'react'
import { render, screen } from '@testing-library/react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from '../protected-route'
import { useAuth } from '../../contexts/auth-context'
import { vi } from 'vitest'

// Mock the auth context
vi.mock('../../contexts/auth-context')
const mockUseAuth = useAuth as any

// Mock Navigate component
const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  ...vi.importActual('react-router-dom'),
  Navigate: ({ to, state, replace }: any) => {
    mockNavigate(to, state, replace)
    return <div data-testid="navigate">Redirecting to {to}</div>
  },
}))

// Test component to wrap ProtectedRoute
function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={children} />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
    </BrowserRouter>
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should show loading spinner when authentication is loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: true,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
    })

    render(
      <TestWrapper>
        <ProtectedRoute>
          <div data-testid="protected-content">Protected Content</div>
        </ProtectedRoute>
      </TestWrapper>
    )

    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
  })

  it('should redirect to login when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: false,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
    })

    render(
      <TestWrapper>
        <ProtectedRoute>
          <div data-testid="protected-content">Protected Content</div>
        </ProtectedRoute>
      </TestWrapper>
    )

    expect(screen.getByTestId('navigate')).toHaveTextContent('Redirecting to /login')
    expect(mockNavigate).toHaveBeenCalledWith('/login', { from: expect.any(Object) }, true)
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
  })

  it('should render protected content when user is authenticated', () => {
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

    render(
      <TestWrapper>
        <ProtectedRoute>
          <div data-testid="protected-content">Protected Content</div>
        </ProtectedRoute>
      </TestWrapper>
    )

    expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('should handle authentication state changes', () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      created_at: '2023-01-01',
      updated_at: '2023-01-01',
    }

    // First render - loading
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: true,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
    })

    const { rerender } = render(
      <TestWrapper>
        <ProtectedRoute>
          <div data-testid="protected-content">Protected Content</div>
        </ProtectedRoute>
      </TestWrapper>
    )

    expect(screen.getByText('Loading...')).toBeInTheDocument()

    // Second render - authenticated
    mockUseAuth.mockReturnValue({
      user: mockUser as any,
      session: { user: mockUser } as any,
      loading: false,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
    })

    rerender(
      <TestWrapper>
        <ProtectedRoute>
          <div data-testid="protected-content">Protected Content</div>
        </ProtectedRoute>
      </TestWrapper>
    )

    expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
  })

  it('should preserve location state for redirect after login', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: false,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
    })

    render(
      <TestWrapper>
        <ProtectedRoute>
          <div data-testid="protected-content">Protected Content</div>
        </ProtectedRoute>
      </TestWrapper>
    )

    expect(mockNavigate).toHaveBeenCalledWith(
      '/login',
      { from: expect.objectContaining({ pathname: '/' }) },
      true
    )
  })

  it('should render multiple children correctly when authenticated', () => {
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

    render(
      <TestWrapper>
        <ProtectedRoute>
          <div data-testid="content-1">Content 1</div>
          <div data-testid="content-2">Content 2</div>
        </ProtectedRoute>
      </TestWrapper>
    )

    expect(screen.getByTestId('content-1')).toBeInTheDocument()
    expect(screen.getByTestId('content-2')).toBeInTheDocument()
  })
})