// Comprehensive tests for security and validation utilities
// Tests input validation, sanitization, rate limiting, and security headers

import { assertEquals, assertExists, assert } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import {
  validateAnalysisRequest,
  validateIdeaGenerationRequest,
  validateEncryptionRequest,
  validateDecryptionRequest,
  isValidTicker,
  isValidTimeframe,
  isValidGoogleApiKey,
  isValidEmail,
  isValidUUID
} from './validation.ts';
import {
  RateLimiter,
  InputSanitizer,
  SecurityHeaders,
  SecurityMiddleware,
  JWTUtils,
  DEFAULT_RATE_LIMITS
} from './security.ts';
import { createLogger } from './logging.ts';
import { AppError, ERROR_CODES } from './errors.ts';

// Validation Tests
Deno.test('validateAnalysisRequest - valid investment request', () => {
  const validRequest = {
    ticker_symbol: 'AAPL',
    analysis_context: 'investment'
  };

  const result = validateAnalysisRequest(validRequest);
  
  assert(result.isValid);
  assertEquals(result.sanitizedData.ticker_symbol, 'AAPL');
  assertEquals(result.sanitizedData.analysis_context, 'investment');
});

Deno.test('validateAnalysisRequest - valid trading request', () => {
  const validRequest = {
    ticker_symbol: 'MSFT',
    analysis_context: 'trading',
    trading_timeframe: '1D'
  };

  const result = validateAnalysisRequest(validRequest);
  
  assert(result.isValid);
  assertEquals(result.sanitizedData.ticker_symbol, 'MSFT');
  assertEquals(result.sanitizedData.analysis_context, 'trading');
  assertEquals(result.sanitizedData.trading_timeframe, '1D');
});

Deno.test('validateAnalysisRequest - missing required fields', () => {
  const invalidRequest = {
    ticker_symbol: 'AAPL'
    // Missing analysis_context
  };

  const result = validateAnalysisRequest(invalidRequest);
  
  assert(!result.isValid);
  assert(result.error?.includes('analysis_context is required'));
});

Deno.test('validateAnalysisRequest - invalid ticker format', () => {
  const invalidRequest = {
    ticker_symbol: 'invalid-ticker',
    analysis_context: 'investment'
  };

  const result = validateAnalysisRequest(invalidRequest);
  
  assert(!result.isValid);
  assert(result.error?.includes('ticker_symbol format is invalid'));
});

Deno.test('validateAnalysisRequest - trading without timeframe', () => {
  const invalidRequest = {
    ticker_symbol: 'AAPL',
    analysis_context: 'trading'
    // Missing trading_timeframe
  };

  const result = validateAnalysisRequest(invalidRequest);
  
  assert(!result.isValid);
  assert(result.error?.includes('trading_timeframe is required'));
});

Deno.test('validateAnalysisRequest - unexpected fields', () => {
  const invalidRequest = {
    ticker_symbol: 'AAPL',
    analysis_context: 'investment',
    unexpected_field: 'value'
  };

  const result = validateAnalysisRequest(invalidRequest);
  
  assert(!result.isValid);
  assert(result.error?.includes('Unexpected field: unexpected_field'));
});

Deno.test('validateIdeaGenerationRequest - valid investment idea', () => {
  const validRequest = {
    context: 'investment_idea'
  };

  const result = validateIdeaGenerationRequest(validRequest);
  
  assert(result.isValid);
  assertEquals(result.sanitizedData.context, 'investment_idea');
});

Deno.test('validateIdeaGenerationRequest - valid trade idea', () => {
  const validRequest = {
    context: 'trade_idea',
    timeframe: '1W'
  };

  const result = validateIdeaGenerationRequest(validRequest);
  
  assert(result.isValid);
  assertEquals(result.sanitizedData.context, 'trade_idea');
  assertEquals(result.sanitizedData.timeframe, '1W');
});

Deno.test('validateIdeaGenerationRequest - trade idea without timeframe', () => {
  const invalidRequest = {
    context: 'trade_idea'
    // Missing timeframe
  };

  const result = validateIdeaGenerationRequest(invalidRequest);
  
  assert(!result.isValid);
  assert(result.error?.includes('timeframe is required'));
});

Deno.test('validateEncryptionRequest - valid Google API key', () => {
  const validRequest = {
    api_key: 'AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI'
  };

  const result = validateEncryptionRequest(validRequest);
  
  assert(result.isValid);
  assertEquals(result.sanitizedData.api_key, 'AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI');
});

Deno.test('validateEncryptionRequest - invalid API key format', () => {
  const invalidRequest = {
    api_key: 'invalid-api-key'
  };

  const result = validateEncryptionRequest(invalidRequest);
  
  assert(!result.isValid);
  assert(result.error?.includes('api_key format is invalid'));
});

Deno.test('validateDecryptionRequest - valid base64 encrypted key', () => {
  const validRequest = {
    encrypted_key: btoa('encrypted-data')
  };

  const result = validateDecryptionRequest(validRequest);
  
  assert(result.isValid);
  assertEquals(result.sanitizedData.encrypted_key, btoa('encrypted-data'));
});

Deno.test('validateDecryptionRequest - invalid base64 format', () => {
  const invalidRequest = {
    encrypted_key: 'not-base64!'
  };

  const result = validateDecryptionRequest(invalidRequest);
  
  assert(!result.isValid);
  assert(result.error?.includes('must be valid base64 encoded data'));
});

// Validation helper function tests
Deno.test('isValidTicker - valid tickers', () => {
  assert(isValidTicker('AAPL'));
  assert(isValidTicker('MSFT'));
  assert(isValidTicker('GOOGL'));
  assert(isValidTicker('A'));
  assert(isValidTicker('ABCDE'));
});

Deno.test('isValidTicker - invalid tickers', () => {
  assert(!isValidTicker('aapl')); // lowercase
  assert(!isValidTicker('ABCDEF')); // too long
  assert(!isValidTicker('')); // empty
  assert(!isValidTicker('123')); // numbers
  assert(!isValidTicker('A-B')); // special characters
});

Deno.test('isValidTimeframe - valid timeframes', () => {
  assert(isValidTimeframe('1D'));
  assert(isValidTimeframe('1W'));
  assert(isValidTimeframe('1M'));
  assert(isValidTimeframe('3M'));
  assert(isValidTimeframe('6M'));
  assert(isValidTimeframe('1Y'));
});

Deno.test('isValidTimeframe - invalid timeframes', () => {
  assert(!isValidTimeframe('1d')); // lowercase
  assert(!isValidTimeframe('2D')); // invalid number
  assert(!isValidTimeframe('1H')); // invalid unit
  assert(!isValidTimeframe('')); // empty
});

Deno.test('isValidGoogleApiKey - valid keys', () => {
  assert(isValidGoogleApiKey('AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI'));
  assert(isValidGoogleApiKey('AIzaBCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'));
});

Deno.test('isValidGoogleApiKey - invalid keys', () => {
  assert(!isValidGoogleApiKey('invalid-key'));
  assert(!isValidGoogleApiKey('AIza')); // too short
  assert(!isValidGoogleApiKey('BIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI')); // wrong prefix
});

Deno.test('isValidEmail - valid emails', () => {
  assert(isValidEmail('test@example.com'));
  assert(isValidEmail('user.name@domain.co.uk'));
  assert(isValidEmail('test+tag@example.org'));
});

Deno.test('isValidEmail - invalid emails', () => {
  assert(!isValidEmail('invalid-email'));
  assert(!isValidEmail('@example.com'));
  assert(!isValidEmail('test@'));
  assert(!isValidEmail('test@.com'));
});

Deno.test('isValidUUID - valid UUIDs', () => {
  assert(isValidUUID('123e4567-e89b-12d3-a456-426614174000'));
  assert(isValidUUID('550e8400-e29b-41d4-a716-446655440000'));
});

Deno.test('isValidUUID - invalid UUIDs', () => {
  assert(!isValidUUID('invalid-uuid'));
  assert(!isValidUUID('123e4567-e89b-12d3-a456')); // too short
  assert(!isValidUUID('123e4567-e89b-12d3-a456-426614174000-extra')); // too long
});

// Rate Limiter Tests
Deno.test('RateLimiter - allows requests within limit', async () => {
  const rateLimiter = new RateLimiter({
    windowMs: 60000, // 1 minute
    maxRequests: 5
  });

  const request = new Request('https://example.com');
  
  // First 5 requests should be allowed
  for (let i = 0; i < 5; i++) {
    const result = await rateLimiter.checkLimit(request);
    assert(result.allowed);
  }
});

Deno.test('RateLimiter - blocks requests over limit', async () => {
  const rateLimiter = new RateLimiter({
    windowMs: 60000, // 1 minute
    maxRequests: 2
  });

  const request = new Request('https://example.com');
  
  // First 2 requests should be allowed
  for (let i = 0; i < 2; i++) {
    const result = await rateLimiter.checkLimit(request);
    assert(result.allowed);
  }
  
  // Third request should be blocked
  const result = await rateLimiter.checkLimit(request);
  assert(!result.allowed);
  assertExists(result.retryAfter);
  assert(result.retryAfter! > 0);
});

Deno.test('RateLimiter - resets after window expires', async () => {
  const rateLimiter = new RateLimiter({
    windowMs: 100, // 100ms window
    maxRequests: 1
  });

  const request = new Request('https://example.com');
  
  // First request should be allowed
  let result = await rateLimiter.checkLimit(request);
  assert(result.allowed);
  
  // Second request should be blocked
  result = await rateLimiter.checkLimit(request);
  assert(!result.allowed);
  
  // Wait for window to expire
  await new Promise(resolve => setTimeout(resolve, 150));
  
  // Request should be allowed again
  result = await rateLimiter.checkLimit(request);
  assert(result.allowed);
});

// Input Sanitizer Tests
Deno.test('InputSanitizer.sanitizeString - removes dangerous characters', () => {
  const input = '<script>alert("xss")</script>';
  const sanitized = InputSanitizer.sanitizeString(input);
  
  assertEquals(sanitized, 'scriptalert("xss")/script');
});

Deno.test('InputSanitizer.sanitizeString - trims whitespace', () => {
  const input = '  test string  ';
  const sanitized = InputSanitizer.sanitizeString(input);
  
  assertEquals(sanitized, 'test string');
});

Deno.test('InputSanitizer.sanitizeString - limits length', () => {
  const input = 'a'.repeat(2000);
  const sanitized = InputSanitizer.sanitizeString(input);
  
  assertEquals(sanitized.length, 1000);
});

Deno.test('InputSanitizer.sanitizeTicker - formats correctly', () => {
  assertEquals(InputSanitizer.sanitizeTicker('aapl'), 'AAPL');
  assertEquals(InputSanitizer.sanitizeTicker('msft123'), 'MSFT');
  assertEquals(InputSanitizer.sanitizeTicker('google-x'), 'GOOGL');
});

Deno.test('InputSanitizer.sanitizeNumber - validates range', () => {
  assertEquals(InputSanitizer.sanitizeNumber('42'), 42);
  assertEquals(InputSanitizer.sanitizeNumber(42, 0, 100), 42);
  
  try {
    InputSanitizer.sanitizeNumber('invalid');
    assert(false, 'Should have thrown an error');
  } catch (error) {
    assert(error instanceof AppError);
    assertEquals(error.code, ERROR_CODES.INVALID_PARAMETER);
  }
  
  try {
    InputSanitizer.sanitizeNumber(150, 0, 100);
    assert(false, 'Should have thrown an error');
  } catch (error) {
    assert(error instanceof AppError);
    assertEquals(error.code, ERROR_CODES.INVALID_PARAMETER);
  }
});

Deno.test('InputSanitizer.sanitizeEmail - formats correctly', () => {
  assertEquals(InputSanitizer.sanitizeEmail('  TEST@EXAMPLE.COM  '), 'test@example.com');
  
  try {
    InputSanitizer.sanitizeEmail('invalid-email');
    assert(false, 'Should have thrown an error');
  } catch (error) {
    assert(error instanceof AppError);
    assertEquals(error.code, ERROR_CODES.INVALID_PARAMETER);
  }
});

Deno.test('InputSanitizer.sanitizeForLogging - redacts sensitive data', () => {
  const input = {
    username: 'testuser',
    password: 'secret123',
    api_key: 'AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI',
    data: {
      token: 'jwt-token',
      value: 'normal-data'
    }
  };

  const sanitized = InputSanitizer.sanitizeForLogging(input);
  
  assertEquals(sanitized.username, 'testuser');
  assertEquals(sanitized.password, '[REDACTED]');
  assertEquals(sanitized.api_key, '[REDACTED]');
  assertEquals(sanitized.data.token, '[REDACTED]');
  assertEquals(sanitized.data.value, 'normal-data');
});

// Security Headers Tests
Deno.test('SecurityHeaders.getSecurityHeaders - includes all required headers', () => {
  const headers = SecurityHeaders.getSecurityHeaders();
  
  assertExists(headers['Access-Control-Allow-Origin']);
  assertExists(headers['X-Content-Type-Options']);
  assertExists(headers['X-Frame-Options']);
  assertExists(headers['X-XSS-Protection']);
  assertExists(headers['Referrer-Policy']);
  assertExists(headers['Content-Security-Policy']);
  assertExists(headers['Cache-Control']);
});

Deno.test('SecurityHeaders.getCorsHeaders - includes CORS headers only', () => {
  const headers = SecurityHeaders.getCorsHeaders();
  
  assertExists(headers['Access-Control-Allow-Origin']);
  assertExists(headers['Access-Control-Allow-Headers']);
  assertExists(headers['Access-Control-Allow-Methods']);
  
  // Should not include other security headers
  assertEquals(headers['X-Frame-Options'], undefined);
});

// Security Middleware Tests
Deno.test('SecurityMiddleware - validates content type', async () => {
  const logger = createLogger('test');
  const middleware = new SecurityMiddleware(logger);
  
  const validRequest = new Request('https://example.com', {
    method: 'POST',
    headers: { 'content-type': 'application/json' }
  });
  
  // Should not throw
  await middleware.validateRequest(validRequest);
  
  const invalidRequest = new Request('https://example.com', {
    method: 'POST',
    headers: { 'content-type': 'text/plain' }
  });
  
  try {
    await middleware.validateRequest(invalidRequest);
    assert(false, 'Should have thrown an error');
  } catch (error) {
    assert(error instanceof AppError);
    assertEquals(error.code, ERROR_CODES.INVALID_REQUEST);
  }
});

Deno.test('SecurityMiddleware - enforces rate limiting', async () => {
  const logger = createLogger('test');
  const middleware = new SecurityMiddleware(logger, {
    windowMs: 60000,
    maxRequests: 1
  });
  
  const request = new Request('https://example.com');
  
  // First request should pass
  await middleware.validateRequest(request);
  
  // Second request should fail
  try {
    await middleware.validateRequest(request);
    assert(false, 'Should have thrown a rate limit error');
  } catch (error) {
    assert(error instanceof AppError);
    assertEquals(error.code, ERROR_CODES.RATE_LIMIT_EXCEEDED);
  }
});

// JWT Utils Tests
Deno.test('JWTUtils.extractUserIdUnsafe - extracts user ID', () => {
  // Create a mock JWT token (header.payload.signature)
  const payload = { sub: 'user-123', exp: Math.floor(Date.now() / 1000) + 3600 };
  const token = `header.${btoa(JSON.stringify(payload))}.signature`;
  
  const userId = JWTUtils.extractUserIdUnsafe(token);
  assertEquals(userId, 'user-123');
});

Deno.test('JWTUtils.extractUserIdUnsafe - handles invalid tokens', () => {
  assertEquals(JWTUtils.extractUserIdUnsafe('invalid-token'), null);
  assertEquals(JWTUtils.extractUserIdUnsafe(''), null);
});

Deno.test('JWTUtils.isTokenExpired - detects expired tokens', () => {
  // Expired token
  const expiredPayload = { exp: Math.floor(Date.now() / 1000) - 3600 };
  const expiredToken = `header.${btoa(JSON.stringify(expiredPayload))}.signature`;
  assert(JWTUtils.isTokenExpired(expiredToken));
  
  // Valid token
  const validPayload = { exp: Math.floor(Date.now() / 1000) + 3600 };
  const validToken = `header.${btoa(JSON.stringify(validPayload))}.signature`;
  assert(!JWTUtils.isTokenExpired(validToken));
  
  // Token without expiration
  const noExpPayload = { sub: 'user-123' };
  const noExpToken = `header.${btoa(JSON.stringify(noExpPayload))}.signature`;
  assert(!JWTUtils.isTokenExpired(noExpToken));
});

// Default Rate Limits Tests
Deno.test('DEFAULT_RATE_LIMITS - has all required configurations', () => {
  assertExists(DEFAULT_RATE_LIMITS.GENERAL);
  assertExists(DEFAULT_RATE_LIMITS.ANALYSIS);
  assertExists(DEFAULT_RATE_LIMITS.AUTH);
  assertExists(DEFAULT_RATE_LIMITS.IDEAS);
  
  // Check that each config has required properties
  for (const config of Object.values(DEFAULT_RATE_LIMITS)) {
    assertExists(config.windowMs);
    assertExists(config.maxRequests);
    assert(config.windowMs > 0);
    assert(config.maxRequests > 0);
  }
});