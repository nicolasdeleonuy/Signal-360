import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/auth-context'
import { SessionManager } from '../utils/session-manager'

interface SessionExpiryWarningProps {
  warningThreshold?: number // Minutes before expiry to show warning
  onExtendSession?: () => void
}

export function SessionExpiryWarning({ 
  warningThreshold = 5,
  onExtendSession 
}: SessionExpiryWarningProps) {
  const { session, signOut } = useAuth()
  const [showWarning, setShowWarning] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(0)

  useEffect(() => {
    if (!session) {
      setShowWarning(false)
      return
    }

    const checkSessionExpiry = () => {
      const remaining = SessionManager.getTimeRemaining(session)
      const warningThresholdMs = warningThreshold * 60 * 1000

      setTimeRemaining(remaining)

      if (remaining > 0 && remaining <= warningThresholdMs) {
        setShowWarning(true)
      } else {
        setShowWarning(false)
      }

      if (remaining <= 0) {
        // Session has expired
        handleSessionExpired()
      }
    }

    // Check immediately
    checkSessionExpiry()

    // Check every 30 seconds
    const interval = setInterval(checkSessionExpiry, 30000)

    return () => clearInterval(interval)
  }, [session, warningThreshold])

  const handleSessionExpired = async () => {
    setShowWarning(false)
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out after session expiry:', error)
    }
  }

  const handleExtendSession = async () => {
    try {
      const refreshedSession = await SessionManager.refreshSession()
      if (refreshedSession.session) {
        setShowWarning(false)
        if (onExtendSession) {
          onExtendSession()
        }
      } else {
        // Refresh failed, sign out
        await handleSessionExpired()
      }
    } catch (error) {
      console.error('Error extending session:', error)
      await handleSessionExpired()
    }
  }

  const formatTimeRemaining = (ms: number): string => {
    const minutes = Math.floor(ms / (1000 * 60))
    const seconds = Math.floor((ms % (1000 * 60)) / 1000)
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`
    }
    return `${seconds}s`
  }

  if (!showWarning) {
    return null
  }

  return (
    <div 
      className="session-expiry-warning"
      style={{
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: '#fff3cd',
        color: '#856404',
        border: '1px solid #ffeaa7',
        borderRadius: '6px',
        padding: '16px 20px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        zIndex: 10001,
        maxWidth: '400px',
        textAlign: 'center'
      }}
    >
      <div style={{ marginBottom: '12px' }}>
        <strong>⚠️ Session Expiring Soon</strong>
      </div>
      
      <div style={{ marginBottom: '16px', fontSize: '0.9rem' }}>
        Your session will expire in {formatTimeRemaining(timeRemaining)}.
        <br />
        Would you like to extend your session?
      </div>

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
        <button
          onClick={handleExtendSession}
          style={{
            padding: '8px 16px',
            backgroundColor: '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: '500'
          }}
        >
          Extend Session
        </button>
        
        <button
          onClick={handleSessionExpired}
          style={{
            padding: '8px 16px',
            backgroundColor: '#666',
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
  )
}

export default SessionExpiryWarning