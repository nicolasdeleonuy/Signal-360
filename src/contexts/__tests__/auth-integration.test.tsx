import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '../auth-context'

// Integration test component
function AuthTestComponent() {
  const { user, session, loading } = useAuth()
  
  return (
    <div>
      <div data-testid="auth-loading">{loading ? 'loading' : 'ready'}</div>
      <div data-testid="auth-user">{user ? user.email : 'no-user'}</div>
      <div data-testid="auth-session">{session ? 'authenticated' : 'not-authenticated'}</div>
    </div>
  )
}

describe('AuthContext Integration', () => {
  it('should initialize without errors', async () => {
    render(
      <AuthProvider>
        <AuthTestComponent />
      </AuthProvider>
    )

    // Should start in loading state
    expect(screen.getByTestId('auth-loading')).toHaveTextContent('loading')

    // Should eventually finish loading
    await waitFor(() => {
      expect(screen.getByTestId('auth-loading')).toHaveTextContent('ready')
    }, { timeout: 3000 })

    // Should show no user initially (since we don't have valid credentials in test)
    expect(screen.getByTestId('auth-user')).toHaveTextContent('no-user')
    expect(screen.getByTestId('auth-session')).toHaveTextContent('not-authenticated')
  })

  it('should provide all required context methods', () => {
    function MethodTestComponent() {
      const auth = useAuth()
      
      return (
        <div>
          <div data-testid="has-signup">{typeof auth.signUp === 'function' ? 'yes' : 'no'}</div>
          <div data-testid="has-signin">{typeof auth.signIn === 'function' ? 'yes' : 'no'}</div>
          <div data-testid="has-signout">{typeof auth.signOut === 'function' ? 'yes' : 'no'}</div>
        </div>
      )
    }

    render(
      <AuthProvider>
        <MethodTestComponent />
      </AuthProvider>
    )

    expect(screen.getByTestId('has-signup')).toHaveTextContent('yes')
    expect(screen.getByTestId('has-signin')).toHaveTextContent('yes')
    expect(screen.getByTestId('has-signout')).toHaveTextContent('yes')
  })
})