import React, { ComponentType } from 'react'
import { ProtectedRoute } from './protected-route'

interface WithAuthOptions {
  fallback?: React.ReactNode
  redirectTo?: string
}

/**
 * Higher-order component that wraps a component with authentication protection
 * @param Component - The component to protect
 * @param options - Configuration options for the auth wrapper
 * @returns Protected component
 */
export function withAuth<P extends object>(
  Component: ComponentType<P>,
  options: WithAuthOptions = {}
) {
  const WrappedComponent = (props: P) => {
    return (
      <ProtectedRoute fallback={options.fallback}>
        <Component {...props} />
      </ProtectedRoute>
    )
  }

  // Set display name for debugging
  WrappedComponent.displayName = `withAuth(${Component.displayName || Component.name})`

  return WrappedComponent
}

export default withAuth