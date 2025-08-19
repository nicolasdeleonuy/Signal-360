import { useState, useEffect } from 'react'
import { Session } from '@supabase/supabase-js'
import { useAuth } from '../contexts/auth-context'
import { SessionManager } from '../utils/session-manager'

export interface UseSessionReturn {
  session: Session | null
  isExpired: boolean
  isExpiringSoon: boolean
  timeRemaining: number
  refreshSession: () => Promise<boolean>
  isRefreshing: boolean
}

export function useSession(): UseSessionReturn {
  const { session } = useAuth()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(0)

  useEffect(() => {
    if (!session) {
      setTimeRemaining(0)
      return
    }

    const updateTimeRemaining = () => {
      const remaining = SessionManager.getTimeRemaining(session)
      setTimeRemaining(remaining)
    }

    // Update immediately
    updateTimeRemaining()

    // Update every second for accurate countdown
    const interval = setInterval(updateTimeRemaining, 1000)

    return () => clearInterval(interval)
  }, [session])

  const refreshSession = async (): Promise<boolean> => {
    if (isRefreshing) {
      return false
    }

    setIsRefreshing(true)
    try {
      const result = await SessionManager.refreshSession()
      return result.session !== null
    } catch (error) {
      console.error('Error refreshing session:', error)
      return false
    } finally {
      setIsRefreshing(false)
    }
  }

  const isExpired = session ? !SessionManager.validateSession(session) : true
  const isExpiringSoon = SessionManager.isSessionExpiringSoon(session)

  return {
    session,
    isExpired,
    isExpiringSoon,
    timeRemaining,
    refreshSession,
    isRefreshing
  }
}