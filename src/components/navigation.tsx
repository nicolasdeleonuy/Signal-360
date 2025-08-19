import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/auth-context'

interface NavigationProps {
  className?: string
}

export function Navigation({ className = '' }: NavigationProps) {
  const { user, signOut } = useAuth()
  const location = useLocation()

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Navigation sign out error:', error)
    }
  }

  const isActive = (path: string) => location.pathname === path

  if (!user) {
    // Public navigation for unauthenticated users
    return (
      <nav className={`navigation ${className}`} style={{
        padding: '1rem',
        backgroundColor: '#f8f9fa',
        borderBottom: '1px solid #dee2e6'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <div className="nav-brand">
            <Link 
              to="/" 
              style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: '#1976d2',
                textDecoration: 'none'
              }}
            >
              Signal-360
            </Link>
          </div>
          
          <div className="nav-links" style={{ display: 'flex', gap: '1rem' }}>
            <Link
              to="/login"
              style={{
                padding: '0.5rem 1rem',
                color: isActive('/login') ? '#1976d2' : '#666',
                textDecoration: 'none',
                fontWeight: isActive('/login') ? '600' : '400',
                borderBottom: isActive('/login') ? '2px solid #1976d2' : 'none'
              }}
            >
              Sign In
            </Link>
            <Link
              to="/sign-up"
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#1976d2',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '4px',
                fontWeight: '500'
              }}
            >
              Sign Up
            </Link>
          </div>
        </div>
      </nav>
    )
  }

  // Authenticated navigation
  return (
    <nav className={`navigation ${className}`} style={{
      padding: '1rem',
      backgroundColor: '#f8f9fa',
      borderBottom: '1px solid #dee2e6'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <div className="nav-brand">
          <Link 
            to="/profile" 
            style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: '#1976d2',
              textDecoration: 'none'
            }}
          >
            Signal-360
          </Link>
        </div>
        
        <div className="nav-links" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '1rem' 
        }}>
          <Link
            to="/profile"
            style={{
              padding: '0.5rem 1rem',
              color: isActive('/profile') ? '#1976d2' : '#666',
              textDecoration: 'none',
              fontWeight: isActive('/profile') ? '600' : '400',
              borderBottom: isActive('/profile') ? '2px solid #1976d2' : 'none'
            }}
          >
            Profile
          </Link>
          
          <div className="user-info" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem',
            backgroundColor: '#e3f2fd',
            borderRadius: '4px',
            fontSize: '0.9rem'
          }}>
            <span style={{ color: '#1976d2' }}>
              {user.email}
            </span>
          </div>
          
          <button
            onClick={handleSignOut}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#d32f2f',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '500'
            }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  )
}

export default Navigation