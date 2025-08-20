import { User, Session, AuthChangeEvent } from '@supabase/supabase-js'

export interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
}

export interface AuthActions {
  signUp: (email: string, password: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

export interface AuthContextType extends AuthState, AuthActions {}

export interface AuthError {
  message: string
  status?: number
}

// Callback type definitions for auth state changes
export type AuthCallback = (event: AuthChangeEvent, session: Session | null) => void | Promise<void>

// Mock callback types for testing are now in types/mocks.ts

// Subscription interface for auth state change listeners
export interface AuthSubscription {
  data: {
    subscription: {
      unsubscribe: () => void
    }
  }
}