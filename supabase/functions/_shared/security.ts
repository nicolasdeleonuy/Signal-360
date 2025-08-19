// Security utilities for Edge Functions
// Provides input sanitization, rate limiting, and security headers

import { AppError, ERROR_CODES } from './errors.ts';
import { Logger } from './logging.ts';

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (request: Request) => string; // Custom key generator
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
}

/**
 * Rate limiter implementation
 */
export class RateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  /**
   * Check if request is within rate limit
   */
  async checkLimit(request: Request): Promise<{ allowed: boolean; retryAfter?: number }> {
    const key = this.config.keyGenerator ? 
      this.config.keyGenerator(request) : 
      this.getDefaultKey(request);

    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Clean up old entries
    this.cleanup(windowStart);

    const entry = this.requests.get(key);
    
    if (!entry) {
      // First request for this key
      this.requests.set(key, { count: 1, resetTime: now + this.config.windowMs });
      return { allowed: true };
    }

    if (now > entry.resetTime) {
      // Window has expired, reset
      this.requests.set(key, { count: 1, resetTime: now + this.config.windowMs });
      return { allowed: true };
    }

    if (entry.count >= this.config.maxRequests) {
      // Rate limit exceeded
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      return { allowed: false, retryAfter };
    }

    // Increment counter
    entry.count++;
    return { allowed: true };
  }

  /**
   * Record request result (for conditional counting)
   */
  recordResult(request: Request, success: boolean): void {
    if (this.config.skipSuccessfulRequests && success) {
      this.decrementCount(request);
    } else if (this.config.skipFailedRequests && !success) {
      this.decrementCount(request);
    }
  }

  private getDefaultKey(request: Request): string {
    // Use IP address if available, otherwise use a default key
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
    return `ip:${ip}`;
  }

  private decrementCount(request: Request): void {
    const key = this.config.keyGenerator ? 
      this.config.keyGenerator(request) : 
      this.getDefaultKey(request);

    const entry = this.requests.get(key);
    if (entry && entry.count > 0) {
      entry.count--;
    }
  }

  private cleanup(windowStart: number): void {
    for (const [key, entry] of this.requests.entries()) {
      if (entry.resetTime < windowStart) {
        this.requests.delete(key);
      }
    }
  }
}

/**
 * Input sanitization utilities
 */
export class InputSanitizer {
  /**
   * Sanitize string input to prevent XSS and injection attacks
   */
  static sanitizeString(input: string): string {
    return input
      .trim()
      .replace(/[<>\"'&]/g, '') // Remove potentially dangerous characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .substring(0, 1000); // Limit length
  }

  /**
   * Sanitize ticker symbol
   */
  static sanitizeTicker(ticker: string): string {
    return ticker
      .toUpperCase()
      .replace(/[^A-Z]/g, '') // Only allow letters
      .substring(0, 5); // Max 5 characters
  }

  /**
   * Sanitize numeric input
   */
  static sanitizeNumber(input: any, min?: number, max?: number): number {
    const num = Number(input);
    
    if (isNaN(num)) {
      throw new AppError(ERROR_CODES.INVALID_PARAMETER, 'Invalid numeric value');
    }

    if (min !== undefined && num < min) {
      throw new AppError(ERROR_CODES.INVALID_PARAMETER, `Value must be at least ${min}`);
    }

    if (max !== undefined && num > max) {
      throw new AppError(ERROR_CODES.INVALID_PARAMETER, `Value must be no more than ${max}`);
    }

    return num;
  }

  /**
   * Sanitize and validate email
   */
  static sanitizeEmail(email: string): string {
    const sanitized = email.toLowerCase().trim();
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitized)) {
      throw new AppError(ERROR_CODES.INVALID_PARAMETER, 'Invalid email format');
    }

    return sanitized;
  }

  /**
   * Remove sensitive data from objects for logging
   */
  static sanitizeForLogging(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    const sensitiveKeys = [
      'password', 'token', 'secret', 'key', 'api_key', 'apiKey',
      'authorization', 'encrypted_key', 'decrypted_key', 'private_key'
    ];

    const sanitized = Array.isArray(obj) ? [] : {};

    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = sensitiveKeys.some(sensitive => lowerKey.includes(sensitive));

      if (isSensitive) {
        (sanitized as any)[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        (sanitized as any)[key] = this.sanitizeForLogging(value);
      } else {
        (sanitized as any)[key] = value;
      }
    }

    return sanitized;
  }
}

/**
 * Security headers utility
 */
export class SecurityHeaders {
  /**
   * Get security headers for responses
   */
  static getSecurityHeaders(): Record<string, string> {
    return {
      // CORS headers
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      
      // Security headers
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline';",
      
      // Cache control
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    };
  }

  /**
   * Get CORS headers only
   */
  static getCorsHeaders(): Record<string, string> {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
    };
  }
}

/**
 * Request validation and security middleware
 */
export class SecurityMiddleware {
  private rateLimiter?: RateLimiter;
  private logger: Logger;

  constructor(logger: Logger, rateLimitConfig?: RateLimitConfig) {
    this.logger = logger;
    if (rateLimitConfig) {
      this.rateLimiter = new RateLimiter(rateLimitConfig);
    }
  }

  /**
   * Validate request security
   */
  async validateRequest(request: Request): Promise<void> {
    // Check rate limiting
    if (this.rateLimiter) {
      const { allowed, retryAfter } = await this.rateLimiter.checkLimit(request);
      
      if (!allowed) {
        this.logger.warn('Rate limit exceeded', {
          ip: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        });
        
        throw new AppError(
          ERROR_CODES.RATE_LIMIT_EXCEEDED,
          'Rate limit exceeded',
          `Too many requests. Try again in ${retryAfter} seconds.`,
          retryAfter
        );
      }
    }

    // Validate content type for POST requests
    if (request.method === 'POST') {
      const contentType = request.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new AppError(
          ERROR_CODES.INVALID_REQUEST,
          'Content-Type must be application/json'
        );
      }
    }

    // Check for suspicious headers
    this.checkSuspiciousHeaders(request);
  }

  /**
   * Record request result for rate limiting
   */
  recordResult(request: Request, success: boolean): void {
    if (this.rateLimiter) {
      this.rateLimiter.recordResult(request, success);
    }
  }

  private checkSuspiciousHeaders(request: Request): void {
    const suspiciousHeaders = [
      'x-forwarded-host',
      'x-original-url',
      'x-rewrite-url'
    ];

    for (const header of suspiciousHeaders) {
      if (request.headers.get(header)) {
        this.logger.warn('Suspicious header detected', { header });
      }
    }

    // Check for overly long headers
    for (const [name, value] of request.headers.entries()) {
      if (value.length > 8192) { // 8KB limit
        throw new AppError(
          ERROR_CODES.INVALID_REQUEST,
          `Header ${name} is too long`
        );
      }
    }
  }
}

/**
 * JWT token utilities
 */
export class JWTUtils {
  /**
   * Extract user ID from JWT token without validation
   * (Use only for logging/metrics, not for authorization)
   */
  static extractUserIdUnsafe(token: string): string | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const payload = JSON.parse(atob(parts[1]));
      return payload.sub || null;
    } catch {
      return null;
    }
  }

  /**
   * Check if token is expired (without validation)
   */
  static isTokenExpired(token: string): boolean {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return true;

      const payload = JSON.parse(atob(parts[1]));
      const exp = payload.exp;
      
      if (!exp) return false; // No expiration claim
      
      return Date.now() >= exp * 1000;
    } catch {
      return true;
    }
  }
}

/**
 * Default rate limit configurations
 */
export const DEFAULT_RATE_LIMITS = {
  // General API endpoints
  GENERAL: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100
  },
  
  // Analysis endpoints (more restrictive)
  ANALYSIS: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10
  },
  
  // Authentication endpoints
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5
  },
  
  // Idea generation (very restrictive)
  IDEAS: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 3
  }
};

/**
 * Create security middleware with default configuration
 */
export function createSecurityMiddleware(
  logger: Logger,
  rateLimitType: keyof typeof DEFAULT_RATE_LIMITS = 'GENERAL'
): SecurityMiddleware {
  return new SecurityMiddleware(logger, DEFAULT_RATE_LIMITS[rateLimitType]);
}