# Security and Validation Framework

## Overview

The Signal-360 Edge Functions implement a comprehensive security and validation framework that provides:

- **Input Validation**: Schema-based validation with sanitization
- **Rate Limiting**: Configurable request throttling per endpoint
- **Input Sanitization**: XSS and injection attack prevention
- **Security Headers**: OWASP-compliant HTTP security headers
- **JWT Utilities**: Token validation and user context extraction
- **Request Monitoring**: Security event logging and alerting

## Core Components

### 1. Input Validation (`validation.ts`)

#### Schema-Based Validation
```typescript
const schema = {
  ticker_symbol: {
    type: 'string',
    required: true,
    pattern: /^[A-Z]{1,5}$/
  },
  analysis_context: {
    type: 'string',
    required: true,
    enum: ['investment', 'trading']
  }
};

const result = validateRequest(data, schema);
if (!result.isValid) {
  throw new AppError(ERROR_CODES.INVALID_REQUEST, result.error);
}
```

#### Pre-built Validators
```typescript
// Analysis requests
const result = validateAnalysisRequest(requestData);

// Idea generation requests
const result = validateIdeaGenerationRequest(requestData);

// Encryption/decryption requests
const result = validateEncryptionRequest(requestData);
const result = validateDecryptionRequest(requestData);
```

#### Validation Helpers
```typescript
// Individual field validation
const isValid = isValidTicker('AAPL'); // true
const isValid = isValidTimeframe('1D'); // true
const isValid = isValidGoogleApiKey('AIza...'); // true
const isValid = isValidEmail('user@example.com'); // true
const isValid = isValidUUID('123e4567-e89b-12d3-a456-426614174000'); // true
```

### 2. Rate Limiting (`security.ts`)

#### Basic Rate Limiting
```typescript
const rateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
  keyGenerator: (request) => {
    // Custom key generation (default uses IP)
    const userId = extractUserIdFromRequest(request);
    return `user:${userId}`;
  }
});

const { allowed, retryAfter } = await rateLimiter.checkLimit(request);
if (!allowed) {
  throw new AppError(
    ERROR_CODES.RATE_LIMIT_EXCEEDED,
    'Rate limit exceeded',
    `Try again in ${retryAfter} seconds`,
    retryAfter
  );
}
```

#### Pre-configured Rate Limits
```typescript
// Different limits for different endpoint types
const limits = {
  GENERAL: { windowMs: 60000, maxRequests: 100 },
  ANALYSIS: { windowMs: 60000, maxRequests: 10 },
  AUTH: { windowMs: 900000, maxRequests: 5 },
  IDEAS: { windowMs: 60000, maxRequests: 3 }
};

const middleware = createSecurityMiddleware(logger, 'ANALYSIS');
```

### 3. Input Sanitization

#### String Sanitization
```typescript
// Remove XSS vectors and normalize
const clean = InputSanitizer.sanitizeString('<script>alert("xss")</script>');
// Result: 'scriptalert("xss")/script'

// Ticker symbol formatting
const ticker = InputSanitizer.sanitizeTicker('aapl123'); // 'AAPL'

// Email normalization
const email = InputSanitizer.sanitizeEmail('  USER@EXAMPLE.COM  '); 
// Result: 'user@example.com'
```

#### Numeric Validation
```typescript
// Range validation
const value = InputSanitizer.sanitizeNumber('42', 0, 100); // 42
const value = InputSanitizer.sanitizeNumber('150', 0, 100); // Throws AppError
```

#### Logging Sanitization
```typescript
const sensitiveData = {
  username: 'john',
  password: 'secret123',
  api_key: 'AIza...',
  normal_field: 'value'
};

const safe = InputSanitizer.sanitizeForLogging(sensitiveData);
// Result: { username: 'john', password: '[REDACTED]', api_key: '[REDACTED]', normal_field: 'value' }
```

### 4. Security Headers

#### Complete Security Headers
```typescript
const headers = SecurityHeaders.getSecurityHeaders();
// Includes: CORS, X-Content-Type-Options, X-Frame-Options, X-XSS-Protection,
// Referrer-Policy, Content-Security-Policy, Cache-Control
```

#### CORS Only
```typescript
const corsHeaders = SecurityHeaders.getCorsHeaders();
// Includes only CORS headers for preflight responses
```

### 5. Security Middleware

#### Comprehensive Request Validation
```typescript
const middleware = new SecurityMiddleware(logger, rateLimitConfig);

// Validates:
// - Rate limits
// - Content-Type headers
// - Suspicious headers
// - Header length limits
await middleware.validateRequest(request);

// Record result for conditional rate limiting
middleware.recordResult(request, success);
```

#### Usage in Edge Functions
```typescript
const handleRequest = async (request: Request, requestId: string): Promise<Response> => {
  const logger = createLogger('function-name', requestId);
  const security = createSecurityMiddleware(logger, 'ANALYSIS');

  try {
    // Security validation
    await security.validateRequest(request);

    // Your function logic here...
    const result = await processRequest();
    
    security.recordResult(request, true);
    return createSuccessHttpResponse(result, requestId);

  } catch (error) {
    security.recordResult(request, false);
    return createErrorHttpResponse(error, requestId);
  }
};
```

### 6. JWT Utilities

#### Safe Token Inspection
```typescript
// Extract user ID without validation (for logging only)
const userId = JWTUtils.extractUserIdUnsafe(token);

// Check expiration without validation
const isExpired = JWTUtils.isTokenExpired(token);
```

**⚠️ Warning**: These utilities are for logging and metrics only. Always use `authenticateUser()` for actual authorization.

## Security Best Practices

### 1. Input Validation
```typescript
// ✅ Good: Always validate and sanitize input
const validation = validateAnalysisRequest(requestBody);
if (!validation.isValid) {
  throw new AppError(ERROR_CODES.INVALID_REQUEST, validation.error);
}
const sanitizedData = validation.sanitizedData;

// ❌ Bad: Using raw input directly
const ticker = requestBody.ticker_symbol; // Potentially unsafe
```

### 2. Rate Limiting
```typescript
// ✅ Good: Apply appropriate rate limits
const security = createSecurityMiddleware(logger, 'ANALYSIS');
await security.validateRequest(request);

// ✅ Good: Use different limits for different endpoints
const authSecurity = createSecurityMiddleware(logger, 'AUTH');
const ideaSecurity = createSecurityMiddleware(logger, 'IDEAS');

// ❌ Bad: No rate limiting
// Direct processing without rate limit checks
```

### 3. Error Handling
```typescript
// ✅ Good: Sanitize error responses
try {
  await processRequest();
} catch (error) {
  logger.error('Request failed', error);
  return createErrorHttpResponse(error, requestId); // Sanitized response
}

// ❌ Bad: Exposing internal errors
catch (error) {
  return new Response(error.stack, { status: 500 }); // Exposes internals
}
```

### 4. Logging Security
```typescript
// ✅ Good: Sanitize sensitive data
logger.info('Processing request', InputSanitizer.sanitizeForLogging(requestData));

// ❌ Bad: Logging sensitive data
logger.info('Processing request', { api_key: userApiKey }); // Exposes API key
```

### 5. Headers and CORS
```typescript
// ✅ Good: Use security headers
return new Response(JSON.stringify(data), {
  status: 200,
  headers: {
    'Content-Type': 'application/json',
    ...SecurityHeaders.getSecurityHeaders()
  }
});

// ❌ Bad: Missing security headers
return new Response(JSON.stringify(data)); // No security headers
```

## Validation Schemas

### Analysis Request Schema
```typescript
{
  ticker_symbol: {
    type: 'string',
    required: true,
    pattern: /^[A-Z]{1,5}$/
  },
  analysis_context: {
    type: 'string',
    required: true,
    enum: ['investment', 'trading']
  },
  trading_timeframe: {
    type: 'string',
    required: false,
    pattern: /^(1D|1W|1M|3M|6M|1Y)$/
  }
}
```

### Idea Generation Schema
```typescript
{
  context: {
    type: 'string',
    required: true,
    enum: ['investment_idea', 'trade_idea']
  },
  timeframe: {
    type: 'string',
    required: false,
    pattern: /^(1D|1W|1M|3M|6M|1Y)$/
  }
}
```

### Encryption Request Schema
```typescript
{
  api_key: {
    type: 'string',
    required: true,
    pattern: /^AIza[0-9A-Za-z-_]{35}$/ // Google API key format
  }
}
```

## Rate Limit Configurations

| Endpoint Type | Window | Max Requests | Use Case |
|---------------|--------|--------------|----------|
| GENERAL | 1 minute | 100 | General API endpoints |
| ANALYSIS | 1 minute | 10 | Analysis functions (resource intensive) |
| AUTH | 15 minutes | 5 | Authentication endpoints |
| IDEAS | 1 minute | 3 | Idea generation (very resource intensive) |

## Security Headers Reference

### CORS Headers
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type`
- `Access-Control-Allow-Methods: POST, GET, OPTIONS`

### Security Headers
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline';`

### Cache Control
- `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate`
- `Pragma: no-cache`
- `Expires: 0`

## Common Attack Vectors and Mitigations

### 1. Cross-Site Scripting (XSS)
**Attack**: Malicious scripts in input data
**Mitigation**: 
- Input sanitization removes `<>\"'&` characters
- Security headers prevent script execution
- Content-Type validation

### 2. SQL Injection
**Attack**: Malicious SQL in input parameters
**Mitigation**:
- Parameterized queries in database layer
- Input validation and sanitization
- Type checking

### 3. Rate Limiting Bypass
**Attack**: Overwhelming the service with requests
**Mitigation**:
- IP-based and user-based rate limiting
- Different limits for different endpoint types
- Exponential backoff for repeated violations

### 4. JWT Token Attacks
**Attack**: Token manipulation or replay
**Mitigation**:
- Server-side token validation via Supabase
- Token expiration checking
- Secure token storage recommendations

### 5. Header Injection
**Attack**: Malicious headers to bypass security
**Mitigation**:
- Header length validation
- Suspicious header detection
- Content-Type enforcement

## Testing

The security framework includes comprehensive tests covering:

### Validation Tests
- Schema validation with valid/invalid inputs
- Business logic validation
- Edge cases and boundary conditions
- Sanitization effectiveness

### Security Tests
- Rate limiting enforcement
- Input sanitization
- Header validation
- JWT token handling

### Integration Tests
- End-to-end security validation
- Error handling and response sanitization
- Performance under attack scenarios

Run security tests:
```bash
deno test --allow-env supabase/functions/_shared/security-validation.test.ts
```

## Migration Guide

### Updating Existing Functions

1. **Add Security Middleware**:
   ```typescript
   // Before
   serve(async (req) => {
     // Direct processing
   });

   // After
   const handleRequest = async (request: Request, requestId: string) => {
     const logger = createLogger('function-name', requestId);
     const security = createSecurityMiddleware(logger, 'ANALYSIS');
     
     await security.validateRequest(request);
     // Process request...
   };
   
   serve(createRequestHandler(handleRequest, ['POST']));
   ```

2. **Replace Manual Validation**:
   ```typescript
   // Before
   if (!body.ticker_symbol || typeof body.ticker_symbol !== 'string') {
     return errorResponse('Invalid ticker');
   }

   // After
   const validation = validateAnalysisRequest(body);
   if (!validation.isValid) {
     throw new AppError(ERROR_CODES.INVALID_REQUEST, validation.error);
   }
   ```

3. **Add Security Headers**:
   ```typescript
   // Before
   return new Response(JSON.stringify(data), {
     headers: { 'Content-Type': 'application/json' }
   });

   // After
   return new Response(JSON.stringify(data), {
     headers: {
       'Content-Type': 'application/json',
       ...SecurityHeaders.getSecurityHeaders()
     }
   });
   ```

4. **Sanitize Logging**:
   ```typescript
   // Before
   logger.info('Request data', requestData);

   // After
   logger.info('Request data', InputSanitizer.sanitizeForLogging(requestData));
   ```

## Performance Considerations

### Rate Limiting
- In-memory storage with automatic cleanup
- O(1) lookup and update operations
- Configurable cleanup intervals

### Validation
- Schema compilation for repeated use
- Early validation failure for performance
- Minimal regex operations

### Sanitization
- Efficient string operations
- Lazy evaluation where possible
- Minimal memory allocation

## Monitoring and Alerting

### Security Events to Monitor
- Rate limit violations
- Validation failures
- Suspicious header patterns
- Authentication failures
- Unusual request patterns

### Metrics Collection
- Request validation success/failure rates
- Rate limiting effectiveness
- Security header compliance
- Input sanitization statistics

### Alerting Thresholds
- Rate limit violations > 10/minute
- Validation failures > 50/hour
- Authentication failures > 20/hour
- Suspicious headers detected

The security framework provides comprehensive protection while maintaining performance and usability for the Signal-360 platform.