import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/auth-context'

export function ProfilePage() {
  const { user, signOut, loading } = useAuth()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const navigate = useNavigate()

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      await signOut()
      navigate('/login', { replace: true })
    } catch (error) {
      console.error('Sign out error:', error)
      // Even if there's an error, we should still redirect to login
      // as the user intended to sign out
      navigate('/login', { replace: true })
    } finally {
      setIsSigningOut(false)
    }
  }

  // Show loading if auth is still initializing
  if (loading) {
    return (
      <div className="loading-container" style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <div>Loading...</div>
      </div>
    )
  }

  // This should not happen as the page is protected, but handle gracefully
  if (!user) {
    return (
      <div className="error-container" style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column'
      }}>
        <h2>Access Denied</h2>
        <p>You must be logged in to view this page.</p>
        <button 
          onClick={() => navigate('/login')}
          style={{
            padding: '10px 20px',
            backgroundColor: '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Go to Login
        </button>
      </div>
    )
  }

  return (
    <div className="profile-page" style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      padding: '20px',
      backgroundColor: '#f5f5f5'
    }}>
      <div className="profile-container" style={{ 
        width: '100%', 
        maxWidth: '600px',
        padding: '40px',
        border: '1px solid #ddd',
        borderRadius: '8px',
        backgroundColor: '#fff',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <div className="profile-header" style={{ 
          textAlign: 'center', 
          marginBottom: '40px' 
        }}>
          <h1 style={{ 
            color: '#333', 
            marginBottom: '10px',
            fontSize: '2rem'
          }}>
            Welcome to Value Investor's Compass
          </h1>
          <p style={{ 
            color: '#666', 
            fontSize: '1.1rem' 
          }}>
            Your investment analysis dashboard
          </p>
        </div>

        <div className="user-info" style={{ 
          marginBottom: '40px' 
        }}>
          <h2 style={{ 
            color: '#333', 
            marginBottom: '20px',
            fontSize: '1.5rem',
            borderBottom: '2px solid #1976d2',
            paddingBottom: '10px'
          }}>
            Account Information
          </h2>
          
          <div className="info-item" style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            padding: '15px',
            backgroundColor: '#f8f9fa',
            borderRadius: '6px',
            marginBottom: '15px'
          }}>
            <span style={{ 
              fontWeight: '600', 
              color: '#333' 
            }}>
              Email Address:
            </span>
            <span style={{ 
              color: '#666',
              fontSize: '1rem'
            }}>
              {user.email}
            </span>
          </div>

          <div className="info-item" style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            padding: '15px',
            backgroundColor: '#f8f9fa',
            borderRadius: '6px',
            marginBottom: '15px'
          }}>
            <span style={{ 
              fontWeight: '600', 
              color: '#333' 
            }}>
              Account Created:
            </span>
            <span style={{ 
              color: '#666',
              fontSize: '1rem'
            }}>
              {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
            </span>
          </div>

          <div className="info-item" style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            padding: '15px',
            backgroundColor: '#f8f9fa',
            borderRadius: '6px',
            marginBottom: '15px'
          }}>
            <span style={{ 
              fontWeight: '600', 
              color: '#333' 
            }}>
              Last Sign In:
            </span>
            <span style={{ 
              color: '#666',
              fontSize: '1rem'
            }}>
              {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'N/A'}
            </span>
          </div>

          <div className="info-item" style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            padding: '15px',
            backgroundColor: '#f8f9fa',
            borderRadius: '6px'
          }}>
            <span style={{ 
              fontWeight: '600', 
              color: '#333' 
            }}>
              User ID:
            </span>
            <span style={{ 
              color: '#666',
              fontSize: '0.9rem',
              fontFamily: 'monospace'
            }}>
              {user.id}
            </span>
          </div>
        </div>

        <div className="profile-actions" style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '15px' 
        }}>
          <div style={{ 
            padding: '20px',
            backgroundColor: '#e3f2fd',
            borderRadius: '6px',
            border: '1px solid #bbdefb'
          }}>
            <h3 style={{ 
              color: '#1565c0', 
              marginBottom: '10px',
              fontSize: '1.2rem'
            }}>
              Getting Started
            </h3>
            <p style={{ 
              color: '#1976d2', 
              marginBottom: '15px',
              lineHeight: '1.5'
            }}>
              Welcome to Value Investor's Compass! Your account is now set up and ready to use. 
              You can now access all the investment analysis features.
            </p>
            <button
              style={{
                padding: '10px 20px',
                backgroundColor: '#1976d2',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '500'
              }}
              onClick={() => {
                // This would navigate to the main dashboard in a real app
                alert('Dashboard feature coming soon!')
              }}
            >
              Go to Dashboard
            </button>
          </div>

          <div className="sign-out-section" style={{ 
            textAlign: 'center',
            paddingTop: '20px',
            borderTop: '1px solid #eee'
          }}>
            <p style={{ 
              color: '#666', 
              marginBottom: '15px' 
            }}>
              Ready to sign out?
            </p>
            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              style={{
                padding: '12px 24px',
                backgroundColor: isSigningOut ? '#ccc' : '#d32f2f',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isSigningOut ? 'not-allowed' : 'pointer',
                fontSize: '1rem',
                fontWeight: '500',
                transition: 'background-color 0.3s'
              }}
            >
              {isSigningOut ? 'Signing Out...' : 'Sign Out'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfilePage