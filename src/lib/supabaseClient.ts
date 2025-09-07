/// <reference types="vite/client" />
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// TypeScript interfaces for configuration
interface SupabaseConfig {
  url: string;
  anonKey: string;
  options?: {
    auth: {
      autoRefreshToken: boolean;
      persistSession: boolean;
      detectSessionInUrl: boolean;
    };
  };
}

interface EnvironmentVariables {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
}

// Enhanced error handling for missing environment variables
function validateEnvironmentVariables(): SupabaseConfig {
  const env: EnvironmentVariables = {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY
  };

  const missingVars: string[] = [];

  if (!env.VITE_SUPABASE_URL) {
    missingVars.push('VITE_SUPABASE_URL');
  }

  if (!env.VITE_SUPABASE_ANON_KEY) {
    missingVars.push('VITE_SUPABASE_ANON_KEY');
  }

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required Supabase environment variables: ${missingVars.join(', ')}. ` +
      'Please ensure these are set in your .env.local file.'
    );
  }

  // Validate URL format
  try {
    new URL(env.VITE_SUPABASE_URL!);
  } catch {
    throw new Error(
      'Invalid VITE_SUPABASE_URL format. Please provide a valid URL.'
    );
  }

  return {
    url: env.VITE_SUPABASE_URL!,
    anonKey: env.VITE_SUPABASE_ANON_KEY!,
    options: {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    }
  };
}

// Initialize Supabase client with enhanced configuration
function createSupabaseClient(): SupabaseClient {
  try {
    const config = validateEnvironmentVariables();
    
    const client = createClient(config.url, config.anonKey, config.options);
    
    // Verify client initialization
    if (!client) {
      throw new Error('Failed to initialize Supabase client');
    }

    return client;
  } catch (error) {
    console.error('Supabase client initialization failed:', error);
    throw error;
  }
}

// Export the configured Supabase client
export const supabase = createSupabaseClient();

// Export types for use in other modules
export type { SupabaseClient };
export type { SupabaseConfig };