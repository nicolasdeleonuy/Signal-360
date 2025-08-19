// Authentication utilities for Edge Functions
// Provides JWT validation and user context extraction

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ErrorResponse } from './types.ts';

/**
 * User context extracted from JWT token
 */
export interface UserContext {
  user_id: string;
  email?: string;
  role?: string;
}

/**
 * Authentication result
 */
export interface AuthResult {
  success: boolean;
  user?: UserContext;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Extract and validate user from JWT token
 * @param request HTTP request with Authorization header
 * @returns Promise<AuthResult> Authentication result
 */
export async function authenticateUser(request: Request): Promise<AuthResult> {
  try {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Authorization header with Bearer token is required'
        }
      };
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!token) {
      return {
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'JWT token is required'
        }
      };
    }

    // Create Supabase client for token validation
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Validate the JWT token
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return {
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired JWT token'
        }
      };
    }

    return {
      success: true,
      user: {
        user_id: user.id,
        email: user.email,
        role: user.role
      }
    };

  } catch (error) {
    console.error('Authentication error:', error);
    return {
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication failed'
      }
    };
  }
}

/**
 * Create authenticated Supabase client with service role
 * @returns Supabase client with service role privileges
 */
export function createServiceClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * Create error response for authentication failures
 * @param authResult Failed authentication result
 * @param requestId Request ID for tracking
 * @returns Response object with error details
 */
export function createAuthErrorResponse(authResult: AuthResult, requestId: string): Response {
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      code: authResult.error?.code || 'AUTH_ERROR',
      message: authResult.error?.message || 'Authentication failed'
    },
    request_id: requestId,
    timestamp: new Date().toISOString()
  };

  const statusCode = authResult.error?.code === 'MISSING_TOKEN' ? 401 : 403;

  return new Response(JSON.stringify(errorResponse), {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
    }
  });
}