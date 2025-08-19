import { useState, useEffect, ReactNode } from 'react'
import { useToast } from './toast'

interface NetworkErrorHandlerProps {
  children: ReactNode
}

export function NetworkErrorHandler({ children }: NetworkErrorHandlerProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [hasNetworkError, setHasNetworkError] = useState(false)
  const { showToast } = useToast()

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setHasNetworkError(false)
      showToast('success', 'Connection restored')
    }

    const handleOffline = () => {
      setIsOnline(false)
      setHasNetworkError(true)
      showToast('error', 'No internet connection', 0) // Persistent toast
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [showToast])

  // Global error handler for network requests
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason
      
      if (error?.name === 'NetworkError' || 
          error?.message?.includes('fetch') ||
          error?.message?.includes('network') ||
          error?.code === 'NETWORK_ERROR') {
        
        setHasNetworkError(true)
        showToast('error', 'Network error occurred. Please check your connection.')
        event.preventDefault()
      }
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [showToast])

  if (!isOnline || hasNetworkError) {
    return (
      <div className="network-error-overlay" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '40px',
          borderRadius: '8px',
          textAlign: 'center',
          maxWidth: '400px',
          margin: '20px'
        }}>
          <div style={{
            fontSize: '3rem',
            marginBottom: '20px'
          }}>
            📡
          </div>
          
          <h2 style={{
            color: '#d32f2f',
            marginBottom: '15px',
            fontSize: '1.5rem'
          }}>
            Connection Problem
          </h2>
          
          <p style={{
            color: '#666',
            marginBottom: '25px',
            lineHeight: '1.5'
          }}>
            {!isOnline 
              ? 'You appear to be offline. Please check your internet connection.'
              : 'We\'re having trouble connecting to our servers. Please try again.'
            }
          </p>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button
              onClick={() => window.location.reload()}
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
              Retry
            </button>
            
            {hasNetworkError && (
              <button
                onClick={() => setHasNetworkError(false)}
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
                Continue Offline
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export default NetworkErrorHandler