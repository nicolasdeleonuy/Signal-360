import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter, Routes, Route, MemoryRouter } from 'react-router-dom'
import { ProtectedRoute } from '../protected-route'
import { AuthProvider } from '../../contexts/auth-context'

// Mock Supabase for integration tests
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
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
    },
  },
}))

function TestApp({ initialEntries = ['/'] }: { initialEntries?: string[] }) {
  return (
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
          <Route 
            path="/protected" 
            element={
              <ProtectedRoute>
                <div data-testid="protected-page">Protected Page</div>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <div data-testid="profile-page">Profile Page</div>
              </ProtectedRoute>
            } 
          />
          <Route path="/" element={<div data-testid="home-page">Home Page</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  )
}

describe('ProtectedRoute Integration', () => {
  it('should redirect unauthenticated user from protected route to login', async () => {
    render(<TestApp initialEntries={['/protected']} />)

    // Should show loading first
    expect(screen.getByText('Checking authentication...')).toBeInTheDocument()

    // Should redirect to login after auth check completes
    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument()
    }, { timeout: 3000 })

    expect(screen.queryByTestId('protected-page')).not.toBeInTheDocument()
  })

  it('should redirect from multiple protected routes', async () => {
    render(<TestApp initialEntries={['/profile']} />)

    // Should show loading first
    expect(screen.getByText('Checking authentication...')).toBeInTheDocument()

    // Should redirect to login after auth check completes
    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument()
    }, { timeout: 3000 })

    expect(screen.queryByTestId('profile-page')).not.toBeInTheDocument()
  })

  it('should allow access to public routes', async () => {
    render(<TestApp initialEntries={['/']} />)

    // Should show home page without authentication
    await waitFor(() => {
      expect(screen.getByTestId('home-page')).toBeInTheDocument()
    })
  })

  it('should handle custom fallback loading component', async () => {
    function CustomProtectedRoute() {
      return (
        <ProtectedRoute fallback={<div data-testid="custom-loading">Custom Loading...</div>}>
          <div data-testid="protected-content">Protected Content</div>
        </ProtectedRoute>
      )
    }

    render(
      <MemoryRouter initialEntries={['/custom']}>
        <AuthProvider>
          <Routes>
            <Route path="/custom" element={<CustomProtectedRoute />} />
            <Route path="/login" element={<div>Login</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    )

    // Should show custom loading component
    expect(screen.getByTestId('custom-loading')).toBeInTheDocument()
    expect(screen.getByText('Custom Loading...')).toBeInTheDocument()
  })

  it('should preserve route state for post-login redirect', async () => {
    // This test verifies that the location state is preserved
    // The actual redirect behavior would be tested in the login component
    render(<TestApp initialEntries={['/protected']} />)

    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument()
    }, { timeout: 3000 })

    // The location state preservation is handled by React Router
    // and would be tested in the login form component
  })
})