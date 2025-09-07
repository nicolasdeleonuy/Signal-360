// Migrated to Vitest
import { MockedFunction } from 'vitest'
import { 
  AuthResponse, 
  Session, 
  AuthError,
  AuthChangeEvent,
  SignUpWithPasswordCredentials,
  SignInWithPasswordCredentials,
  SignOut
} from '@supabase/supabase-js'

// Mock interfaces for Supabase Auth methods
export interface MockSupabaseAuth {
  getSession: MockedFunction<() => Promise<{
    data: { session: Session | null }
    error: AuthError | null
  }>>
  onAuthStateChange: MockedFunction<(
    callback: (event: AuthChangeEvent, session: Session | null) => void | Promise<void>
  ) => {
    data: { subscription: { unsubscribe: () => void } }
  }>
  signUp: MockedFunction<(credentials: SignUpWithPasswordCredentials) => Promise<AuthResponse>>
  signInWithPassword: MockedFunction<(credentials: SignInWithPasswordCredentials) => Promise<AuthResponse>>
  signOut: MockedFunction<(options?: SignOut) => Promise<{ error: AuthError | null }>>
  refreshSession: MockedFunction<(currentSession?: { refresh_token: string }) => Promise<AuthResponse>>
}

// Mock interface for the entire Supabase client
export interface MockSupabaseClient {
  auth: MockSupabaseAuth
}

// Mock callback types for testing
export type MockAuthCallback = (event: AuthChangeEvent, session: Session | null) => void | Promise<void>

// Vitest timer utilities interface
export interface VitestTimerUtils {
  advanceTimers: (ms: number) => void
  advanceTimersByTime: (ms: number) => void
  runAllTimers: () => void
  runOnlyPendingTimers: () => void
  clearAllTimers: () => void
  getTimerCount: () => number
}

// Mock query metrics interface for load testing
export interface MockQueryMetrics {
  cacheHits: number
  cacheMisses: number
  totalQueries: number
  averageResponseTime: number
}