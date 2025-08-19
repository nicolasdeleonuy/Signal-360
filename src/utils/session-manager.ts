import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export interface SessionData {
  session: Session | null
  user: User | null
  expiresAt: number | null
}

export class SessionManager {
  private static readonly SESSION_KEY = 'signal360_session'
  private static readonly REFRESH_THRESHOLD = 5 * 60 * 1000 // 5 minutes before expiry
  private static refreshTimer: NodeJS.Timeout | null = null

  /**
   * Initialize session management
   */
  static async initialize(): Promise<SessionData> {
    try {
      // First try to get session from Supabase (handles automatic refresh)
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Error getting session:', error)
        this.clearStoredSession()
        return { session: null, user: null, expiresAt: null }
      }

      if (session) {
        // Store the session and set up refresh timer
        this.storeSession(session)
        this.scheduleRefresh(session)
        
        return {
          session,
          user: session.user,
          expiresAt: session.expires_at ? session.expires_at * 1000 : null
        }
      }

      // No active session
      this.clearStoredSession()
      return { session: null, user: null, expiresAt: null }
    } catch (error) {
      console.error('Error initializing session:', error)
      this.clearStoredSession()
      return { session: null, user: null, expiresAt: null }
    }
  }

  /**
   * Store session data in localStorage
   */
  private static storeSession(session: Session): void {
    try {
      const sessionData = {
        session,
        expiresAt: session.expires_at ? session.expires_at * 1000 : null,
        storedAt: Date.now()
      }
      localStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionData))
    } catch (error) {
      console.error('Error storing session:', error)
    }
  }

  /**
   * Get stored session from localStorage
   */
  static getStoredSession(): SessionData {
    try {
      const stored = localStorage.getItem(this.SESSION_KEY)
      if (!stored) {
        return { session: null, user: null, expiresAt: null }
      }

      const sessionData = JSON.parse(stored)
      const now = Date.now()

      // Check if session is expired
      if (sessionData.expiresAt && now >= sessionData.expiresAt) {
        this.clearStoredSession()
        return { session: null, user: null, expiresAt: null }
      }

      return {
        session: sessionData.session,
        user: sessionData.session?.user || null,
        expiresAt: sessionData.expiresAt
      }
    } catch (error) {
      console.error('Error getting stored session:', error)
      this.clearStoredSession()
      return { session: null, user: null, expiresAt: null }
    }
  }

  /**
   * Clear stored session data
   */
  static clearStoredSession(): void {
    try {
      localStorage.removeItem(this.SESSION_KEY)
    } catch (error) {
      console.error('Error clearing stored session:', error)
    }
  }

  /**
   * Check if session needs refresh
   */
  static needsRefresh(session: Session | null): boolean {
    if (!session || !session.expires_at) {
      return false
    }

    const expiresAt = session.expires_at * 1000
    const now = Date.now()
    
    return (expiresAt - now) <= this.REFRESH_THRESHOLD
  }

  /**
   * Refresh the current session
   */
  static async refreshSession(): Promise<SessionData> {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession()
      
      if (error) {
        console.error('Error refreshing session:', error)
        this.clearStoredSession()
        return { session: null, user: null, expiresAt: null }
      }

      if (session) {
        this.storeSession(session)
        this.scheduleRefresh(session)
        
        return {
          session,
          user: session.user,
          expiresAt: session.expires_at ? session.expires_at * 1000 : null
        }
      }

      this.clearStoredSession()
      return { session: null, user: null, expiresAt: null }
    } catch (error) {
      console.error('Error refreshing session:', error)
      this.clearStoredSession()
      return { session: null, user: null, expiresAt: null }
    }
  }

  /**
   * Schedule automatic session refresh
   */
  private static scheduleRefresh(session: Session): void {
    // Clear existing timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
    }

    if (!session.expires_at) {
      return
    }

    const expiresAt = session.expires_at * 1000
    const now = Date.now()
    const refreshAt = expiresAt - this.REFRESH_THRESHOLD

    if (refreshAt <= now) {
      // Session expires soon, refresh immediately
      this.refreshSession()
      return
    }

    // Schedule refresh
    const delay = refreshAt - now
    this.refreshTimer = setTimeout(() => {
      this.refreshSession()
    }, delay)
  }

  /**
   * Clear refresh timer
   */
  static clearRefreshTimer(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
      this.refreshTimer = null
    }
  }

  /**
   * Handle session expiry
   */
  static handleSessionExpiry(): void {
    this.clearStoredSession()
    this.clearRefreshTimer()
    
    // Trigger sign out
    supabase.auth.signOut().catch(error => {
      console.error('Error signing out after session expiry:', error)
    })
  }

  /**
   * Validate session integrity
   */
  static validateSession(session: Session | null): boolean {
    if (!session) {
      return false
    }

    // Check if session has required properties
    if (!session.access_token || !session.user) {
      return false
    }

    // Check if session is expired
    if (session.expires_at) {
      const expiresAt = session.expires_at * 1000
      const now = Date.now()
      
      if (now >= expiresAt) {
        return false
      }
    }

    return true
  }

  /**
   * Handle cross-tab session synchronization
   */
  static setupCrossTabSync(): void {
    // Listen for storage changes from other tabs
    window.addEventListener('storage', (event) => {
      if (event.key === this.SESSION_KEY) {
        // Session changed in another tab
        if (event.newValue === null) {
          // Session was cleared in another tab
          this.handleSessionExpiry()
        } else {
          // Session was updated in another tab
          try {
            const sessionData = JSON.parse(event.newValue)
            if (sessionData.session) {
              this.scheduleRefresh(sessionData.session)
            }
          } catch (error) {
            console.error('Error parsing session data from storage event:', error)
          }
        }
      }
    })

    // Listen for focus events to check session validity
    window.addEventListener('focus', () => {
      const stored = this.getStoredSession()
      if (stored.session && !this.validateSession(stored.session)) {
        this.handleSessionExpiry()
      }
    })
  }

  /**
   * Get session time remaining in milliseconds
   */
  static getTimeRemaining(session: Session | null): number {
    if (!session || !session.expires_at) {
      return 0
    }

    const expiresAt = session.expires_at * 1000
    const now = Date.now()
    
    return Math.max(0, expiresAt - now)
  }

  /**
   * Check if session is about to expire
   */
  static isSessionExpiringSoon(session: Session | null): boolean {
    const timeRemaining = this.getTimeRemaining(session)
    return timeRemaining > 0 && timeRemaining <= this.REFRESH_THRESHOLD
  }
}