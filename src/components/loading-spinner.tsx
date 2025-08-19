import React from 'react'

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large'
  message?: string
  fullScreen?: boolean
  color?: string
}

export function LoadingSpinner({ 
  size = 'medium', 
  message = 'Loading...', 
  fullScreen = false,
  color = '#1976d2'
}: LoadingSpinnerProps) {
  const sizeMap = {
    small: '24px',
    medium: '40px',
    large: '60px'
  }

  const spinnerSize = sizeMap[size]

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    ...(fullScreen && {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      zIndex: 9999
    })
  }

  const spinnerStyle: React.CSSProperties = {
    width: spinnerSize,
    height: spinnerSize,
    border: `4px solid #f3f3f3`,
    borderTop: `4px solid ${color}`,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  }

  return (
    <div className="loading-spinner-container" style={containerStyle}>
      <div className="loading-spinner" style={spinnerStyle}></div>
      {message && (
        <div 
          className="loading-message" 
          style={{ 
            color: '#666', 
            fontSize: size === 'small' ? '0.9rem' : '1rem',
            fontWeight: '500'
          }}
        >
          {message}
        </div>
      )}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default LoadingSpinner