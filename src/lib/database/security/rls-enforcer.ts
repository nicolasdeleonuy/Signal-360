// Row Level Security (RLS) enforcement utilities
// Provides RLS policy enforcement and security validation

import { supabase } from '../../supabaseClient';
import { DatabaseErrorHandler } from '../error-handler';
import { DatabaseError } from '../../../types/database';

/**
 * RLS policy enforcer
 * Ensures Row Level Security policies are properly enforced in application code
 */
export class RLSEnforcer {
  /**
   * Verify user can access profile
   * @param profileId Profile ID to access
   * @param userId Current user ID
   * @returns Promise<boolean> True if access is allowed
   */
  static async canAccessProfile(profileId: string, userId: string): Promise<boolean> {
    try {
      if (!profileId || !userId) {
        return false;
      }

      // For profiles, user can only access their own profile
      return profileId === userId;
    } catch (error) {
      console.error('Error checking profile access:', error);
      return false;
    }
  }

  /**
   * Verify user can access analysis
   * @param analysisId Analysis ID to access
   * @param userId Current user ID
   * @returns Promise<boolean> True if access is allowed
   */
  static async canAccessAnalysis(analysisId: number, userId: string): Promise<boolean> {
    try {
      if (!analysisId || !userId) {
        return false;
      }

      // Query the analysis to check ownership
      const { data, error } = await supabase
        .from('analyses')
        .select('user_id')
        .eq('id', analysisId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return false; // Analysis not found
        }
        throw DatabaseErrorHandler.handleSupabaseError(error, 'Check analysis access');
      }

      return data.user_id === userId;
    } catch (error) {
      console.error('Error checking analysis access:', error);
      return false;
    }
  }

  /**
   * Enforce RLS policy for profile operations
   * @param operation Operation type
   * @param profileId Profile ID
   * @param userId Current user ID
   * @throws DatabaseError if access is denied
   */
  static async enforceProfileAccess(
    operation: 'read' | 'write' | 'delete',
    profileId: string,
    userId: string
  ): Promise<void> {
    const canAccess = await this.canAccessProfile(profileId, userId);
    
    if (!canAccess) {
      throw {
        code: 'RLS_VIOLATION',
        message: `Access denied: Cannot ${operation} profile ${profileId}`,
        hint: 'You can only access your own profile',
      } as DatabaseError;
    }
  }

  /**
   * Enforce RLS policy for analysis operations
   * @param operation Operation type
   * @param analysisId Analysis ID
   * @param userId Current user ID
   * @throws DatabaseError if access is denied
   */
  static async enforceAnalysisAccess(
    operation: 'read' | 'write' | 'delete',
    analysisId: number,
    userId: string
  ): Promise<void> {
    const canAccess = await this.canAccessAnalysis(analysisId, userId);
    
    if (!canAccess) {
      throw {
        code: 'RLS_VIOLATION',
        message: `Access denied: Cannot ${operation} analysis ${analysisId}`,
        hint: 'You can only access your own analyses',
      } as DatabaseError;
    }
  }

  /**
   * Validate user context for database operations
   * @param userId User ID to validate
   * @throws DatabaseError if user context is invalid
   */
  static validateUserContext(userId: string): void {
    if (!userId || typeof userId !== 'string') {
      throw {
        code: 'INVALID_USER_CONTEXT',
        message: 'Invalid user context: User ID is required',
        hint: 'Ensure user is authenticated before performing database operations',
      } as DatabaseError;
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      throw {
        code: 'INVALID_USER_ID_FORMAT',
        message: 'Invalid user ID format',
        hint: 'User ID must be a valid UUID',
      } as DatabaseError;
    }
  }

  /**
   * Check if current user matches authenticated user
   * @param userId User ID to check
   * @returns Promise<boolean> True if user is authenticated
   */
  static async isUserAuthenticated(userId: string): Promise<boolean> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        return false;
      }

      return user.id === userId;
    } catch (error) {
      console.error('Error checking user authentication:', error);
      return false;
    }
  }

  /**
   * Enforce user authentication
   * @param userId User ID to validate
   * @throws DatabaseError if user is not authenticated
   */
  static async enforceAuthentication(userId: string): Promise<void> {
    const isAuthenticated = await this.isUserAuthenticated(userId);
    
    if (!isAuthenticated) {
      throw {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required',
        hint: 'Please log in to access this resource',
      } as DatabaseError;
    }
  }

  /**
   * Get current authenticated user ID
   * @returns Promise<string | null> Current user ID or null
   */
  static async getCurrentUserId(): Promise<string | null> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        return null;
      }

      return user.id;
    } catch (error) {
      console.error('Error getting current user ID:', error);
      return null;
    }
  }

  /**
   * Validate operation permissions
   * @param operation Operation details
   * @returns Promise<void>
   * @throws DatabaseError if operation is not permitted
   */
  static async validateOperation(operation: SecurityOperation): Promise<void> {
    // Validate user context
    this.validateUserContext(operation.userId);

    // Enforce authentication
    await this.enforceAuthentication(operation.userId);

    // Enforce resource-specific access
    switch (operation.resource) {
      case 'profile':
        await this.enforceProfileAccess(
          operation.action,
          operation.resourceId as string,
          operation.userId
        );
        break;

      case 'analysis':
        await this.enforceAnalysisAccess(
          operation.action,
          operation.resourceId as number,
          operation.userId
        );
        break;

      default:
        throw {
          code: 'UNKNOWN_RESOURCE',
          message: `Unknown resource type: ${operation.resource}`,
        } as DatabaseError;
    }
  }

  /**
   * Create security context for operations
   * @param userId User ID
   * @returns Promise<SecurityContext> Security context
   */
  static async createSecurityContext(userId: string): Promise<SecurityContext> {
    this.validateUserContext(userId);
    
    const isAuthenticated = await this.isUserAuthenticated(userId);
    const currentUserId = await this.getCurrentUserId();

    return {
      userId,
      isAuthenticated,
      isCurrentUser: currentUserId === userId,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Log security events
   * @param event Security event details
   */
  static logSecurityEvent(event: SecurityEvent): void {
    const logData = {
      ...event,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
    };

    switch (event.level) {
      case 'error':
        console.error('Security Event:', logData);
        break;
      case 'warning':
        console.warn('Security Event:', logData);
        break;
      case 'info':
        console.info('Security Event:', logData);
        break;
      default:
        console.log('Security Event:', logData);
    }
  }
}

/**
 * Security operation interface
 */
export interface SecurityOperation {
  userId: string;
  resource: 'profile' | 'analysis';
  resourceId: string | number;
  action: 'read' | 'write' | 'delete';
}

/**
 * Security context interface
 */
export interface SecurityContext {
  userId: string;
  isAuthenticated: boolean;
  isCurrentUser: boolean;
  timestamp: string;
}

/**
 * Security event interface
 */
export interface SecurityEvent {
  type: 'access_denied' | 'unauthorized_access' | 'invalid_operation' | 'security_violation';
  level: 'error' | 'warning' | 'info';
  userId?: string;
  resource?: string;
  resourceId?: string | number;
  message: string;
  details?: Record<string, any>;
}