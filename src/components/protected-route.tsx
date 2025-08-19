import React, { ReactNode, useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/auth-context'
import { LoadingSpinner } from './loading-spinner'

interface ProtectedRouteProps {
  children: ReactNode
  fallback?: ReactNode
}

export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { user, loading, session } = useAuth()
  const location = useLocation()
  const [authCheckComplete, setAuthCheckComplete] = useState(false)

  useEffect(() => {
    // Mark auth check as complete when loading finishes
    if (!loading) {
      setAuthCheckComplete(true)
    }
  }, [loading])

  // Show loading spinner while checking authentication
  if (loading || !authCheckComplete) {
    return (
      fallback || (
        <div style={{ height: '100vh' }}>
          <LoadingSpinner 
            size="large" 
            message="Checking authentication..." 
            fullScreen={true}
          />
        </div>
      )
    )
  }

  // Redirect to login if not authenticated
  if (!user || !session) {
    // Save the attempted location for redirect after login
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Render protected content if authenticated
  return <>{children}</>
}

export default ProtectedRoute