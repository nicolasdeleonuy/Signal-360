// Security configuration for Edge Functions
// Centralized security settings and policies

import { RateLimitConfig } from './security.ts';

/**
 * Security configuration interface
 */
export interface SecurityConfig {
  rateLimiting: {
    [endpoint: string]: RateLimitConfig;
  };
  validation: {
    maxRequestSize: number;
    maxHeaderSize: number;
    allowedContentTypes: string[];
  };
  headers: {
    enforceSecurityHeaders: boolean;
    customHeaders?: Record<string, string>;
  };
  monitoring: {
    logSensitiveData: boolean;
    alertThresholds: {
      rateLimitViolations: number;
      validationFailures: number;
      authFailures: number;
    };
  };
}

/**
 * Default security configuration
 */
export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  rateLimiting: {
    // Analysis endpoints (resource intensive)
    'analyze-ticker': {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 5, // 5 analyses per minute
      keyGenerator: (request) => {
        const authHeader = request.headers.get('Authorization');
        if (authHeader) {
          // Extract user ID from token for user-based limiting
          const token = authHeader.substring(7);
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return `user:${payload.sub}`;
          } catch {
            // Fall back to IP-based limiting
          }
        }
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        return `ip:${ip}`;
      }
    },

    // Idea generation (very resource intensive)
    'generate-ideas': {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 2, // 2 ideas per minute
      keyGenerator: (request) => {
        const authHeader = request.headers.get('Authorization');
        if (authHeader) {
          const token = authHeader.substring(7);
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return `user:${payload.sub}`;
          } catch {
            // Fall back to IP-based limiting
          }
        }
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        return `ip:${ip}`;
      }
    },

    // Individual analysis modules
    'fundamental-analysis': {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 20
    },

    'technical-analysis': {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 20
    },

    'esg-analysis': {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 20
    },

    'synthesis-engine': {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 30
    },

    // Encryption services
    'encrypt-api-key': {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5 // Limited API key operations
    },

    'decrypt-api-key': {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100 // Higher limit for internal use
    }
  },

  validation: {
    maxRequestSize: 1024 * 1024, // 1MB max request size
    maxHeaderSize: 8192, // 8KB max header size
    allowedContentTypes: [
      'application/json',
      'application/x-www-form-urlencoded'
    ]
  },

  headers: {
    enforceSecurityHeaders: true,
    customHeaders: {
      'X-Service': 'Signal-360-Analysis',
      'X-Version': '1.0.0'
    }
  },

  monitoring: {
    logSensitiveData: false,
    alertThresholds: {
      rateLimitViolations: 10, // Alert after 10 violations per minute
      validationFailures: 50, // Alert after 50 validation failures per hour
      authFailures: 20 // Alert after 20 auth failures per hour
    }
  }
};

/**
 * Get security configuration for a specific function
 */
export function getSecurityConfig(functionName: string): SecurityConfig {
  // In a production environment, this could load from environment variables
  // or a configuration service
  return DEFAULT_SECURITY_CONFIG;
}

/**
 * Validate security configuration
 */
export function validateSecurityConfig(config: SecurityConfig): boolean {
  // Validate rate limiting configurations
  for (const [endpoint, rateLimitConfig] of Object.entries(config.rateLimiting)) {
    if (rateLimitConfig.windowMs <= 0 || rateLimitConfig.maxRequests <= 0) {
      console.error(`Invalid rate limit configuration for ${endpoint}`);
      return false;
    }
  }

  // Validate request size limits
  if (config.validation.maxRequestSize <= 0 || config.validation.maxHeaderSize <= 0) {
    console.error('Invalid request size limits');
    return false;
  }

  // Validate alert thresholds
  const thresholds = config.monitoring.alertThresholds;
  if (thresholds.rateLimitViolations <= 0 || 
      thresholds.validationFailures <= 0 || 
      thresholds.authFailures <= 0) {
    console.error('Invalid alert thresholds');
    return false;
  }

  return true;
}

/**
 * Security policy enforcement levels
 */
export enum SecurityLevel {
  STRICT = 'strict',
  MODERATE = 'moderate',
  PERMISSIVE = 'permissive'
}

/**
 * Get security configuration based on environment
 */
export function getEnvironmentSecurityConfig(): SecurityConfig {
  const environment = Deno.env.get('ENVIRONMENT') || 'development';
  const securityLevel = Deno.env.get('SECURITY_LEVEL') as SecurityLevel || SecurityLevel.MODERATE;

  const config = { ...DEFAULT_SECURITY_CONFIG };

  // Adjust configuration based on environment and security level
  if (environment === 'production') {
    if (securityLevel === SecurityLevel.STRICT) {
      // Stricter limits for production
      for (const rateLimitConfig of Object.values(config.rateLimiting)) {
        rateLimitConfig.maxRequests = Math.floor(rateLimitConfig.maxRequests * 0.5);
      }
      config.validation.maxRequestSize = 512 * 1024; // 512KB
    }
  } else if (environment === 'development') {
    if (securityLevel === SecurityLevel.PERMISSIVE) {
      // More permissive limits for development
      for (const rateLimitConfig of Object.values(config.rateLimiting)) {
        rateLimitConfig.maxRequests = rateLimitConfig.maxRequests * 2;
      }
    }
  }

  return config;
}

/**
 * Security metrics interface
 */
export interface SecurityMetrics {
  rateLimitViolations: number;
  validationFailures: number;
  authFailures: number;
  suspiciousRequests: number;
  blockedRequests: number;
  lastUpdated: string;
}

/**
 * Security event types
 */
export enum SecurityEventType {
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  VALIDATION_FAILED = 'validation_failed',
  AUTH_FAILED = 'auth_failed',
  SUSPICIOUS_HEADER = 'suspicious_header',
  MALFORMED_REQUEST = 'malformed_request',
  BLOCKED_REQUEST = 'blocked_request'
}

/**
 * Security event interface
 */
export interface SecurityEvent {
  type: SecurityEventType;
  timestamp: string;
  functionName: string;
  requestId: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  details: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Create a security event
 */
export function createSecurityEvent(
  type: SecurityEventType,
  functionName: string,
  requestId: string,
  details: Record<string, any>,
  severity: SecurityEvent['severity'] = 'medium',
  request?: Request
): SecurityEvent {
  return {
    type,
    timestamp: new Date().toISOString(),
    functionName,
    requestId,
    userId: details.userId,
    ip: request?.headers.get('x-forwarded-for') || 'unknown',
    userAgent: request?.headers.get('user-agent') || 'unknown',
    details,
    severity
  };
}