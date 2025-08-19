import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { AuthContextType } from '../types/auth'
import { SessionManager } from '../utils/session-manager'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Initialize session management
    const initializeSession = async () => {
      try {
        const sessionData = await SessionManager.initialize()
        setSession(sessionData.session)
        setUser(sessionData.user)
      } catch (error) {
        console.error('Error initializing session:', error)
        setSession(null)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    initializeSession()

    // Set up cross-tab synchronization
    SessionManager.setupCrossTabSync()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email)
        
        if (event === 'SIGNED_IN' && session) {
          // Store new session
          setSession(session)
          setUser(session.user)
        } else if (event === 'SIGNED_OUT') {
          // Clear session
          SessionManager.clearStoredSession()
          SessionManager.clearRefreshTimer()
          setSession(null)
          setUser(null)
        } else if (event === 'TOKEN_REFRESHED' && session) {
          // Update refreshed session
          setSession(session)
          setUser(session.user)
        } else if (event === 'USER_UPDATED' && session) {
          // Update user data
          setSession(session)
          setUser(session.user)
        }
        
        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
      SessionManager.clearRefreshTimer()
    }
  }, [])

  const signUp = async (email: string, password: string): Promise<void> => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      })
      if (error) {
        throw error
      }
    } catch (error) {
      throw error
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string): Promise<void> => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) {
        throw error
      }
    } catch (error) {
      throw error
    } finally {
      setLoading(false)
    }
  }

  const signOut = async (): Promise<void> => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        throw error
      }
    } catch (error) {
      throw error
    } finally {
      setLoading(false)
    }
  }

  const value: AuthContextType = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}