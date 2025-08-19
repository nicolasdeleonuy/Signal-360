import { Component, ErrorInfo, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

interface Props {
  children: ReactNode
  onAuthError?: (error: Error) => void
}

interface State {
  hasError: boolean
  error?: Error
  isAuthError: boolean
}

class AuthErrorBoundaryClass extends Component<Props & { navigate: (path: string) => void }, State> {
  constructor(props: Props & { navigate: (path: string) => void }) {
    super(props)
    this.state = { hasError: false, isAuthError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    const isAuthError = error.message.includes('auth') || 
                       error.message.includes('session') ||
                       error.message.includes('token') ||
                       error.message.includes('unauthorized')

    return { 
      hasError: true, 
      error,
      isAuthError
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AuthErrorBoundary caught an error:', error, errorInfo)
    
    if (this.props.onAuthError && this.state.isAuthError) {
      this.props.onAuthError(error)
    }
  }

  handleRetryAuth = () => {
    this.setState({ hasError: false, error: undefined, isAuthError: false })
    this.props.navigate('/login')
  }

  handleRefresh = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      if (this.state.isAuthError) {
        return (
          <div className="auth-error-boundary" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
            padding: '40px',
            textAlign: 'center',
            backgroundColor: '#fff',
            border: '1px solid #ffcdd2',
            borderRadius: '8px',
            margin: '20px'
          }}>
            <div style={{
              fontSize: '3rem',
              marginBottom: '20px',
              color: '#d32f2f'
            }}>
              🔐
            </div>
            
            <h2 style={{
              color: '#d32f2f',
              marginBottom: '15px',
              fontSize: '1.5rem'
            }}>
              Authentication Error
            </h2>
            
            <p style={{
              color: '#666',
              marginBottom: '25px',
              maxWidth: '500px',
              lineHeight: '1.5'
            }}>
              There was a problem with your authentication session. Please sign in again to continue.
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={this.handleRetryAuth}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#1976d2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}
              >
                Sign In Again
              </button>
              
              <button
                onClick={this.handleRefresh}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#666',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}
              >
                Refresh Page
              </button>
            </div>
          </div>
        )
      }

      // For non-auth errors, fall back to generic error boundary
      return (
        <div className="generic-error" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
          padding: '40px',
          textAlign: 'center',
          backgroundColor: '#fff',
          border: '1px solid #ffcdd2',
          borderRadius: '8px',
          margin: '20px'
        }}>
          <div style={{
            fontSize: '3rem',
            marginBottom: '20px',
            color: '#d32f2f'
          }}>
            ⚠️
          </div>
          
          <h2 style={{
            color: '#d32f2f',
            marginBottom: '15px',
            fontSize: '1.5rem'
          }}>
            Something went wrong
          </h2>
          
          <p style={{
            color: '#666',
            marginBottom: '25px',
            maxWidth: '500px',
            lineHeight: '1.5'
          }}>
            We encountered an unexpected error. Please try again.
          </p>

          <button
            onClick={this.handleRefresh}
            style={{
              padding: '10px 20px',
              backgroundColor: '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            Refresh Page
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

export function AuthErrorBoundary({ children, onAuthError }: Props) {
  const navigate = useNavigate()
  
  return (
    <AuthErrorBoundaryClass navigate={navigate} onAuthError={onAuthError}>
      {children}
    </AuthErrorBoundaryClass>
  )
}

export default AuthErrorBoundary