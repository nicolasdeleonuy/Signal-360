# Enhanced Error Handling and Logging System

## Overview

The Signal-360 Edge Functions now include a comprehensive error handling and logging system that provides:

- **Structured Logging**: JSON-formatted logs with consistent metadata
- **Retry Logic**: Exponential backoff with jitter for external API calls
- **Circuit Breakers**: Automatic failure detection and recovery
- **Performance Monitoring**: Request tracking and metrics collection
- **Health Checks**: System health monitoring and diagnostics
- **Security**: Automatic sanitization of sensitive data in logs

## Core Components

### 1. Error Handling (`errors.ts`)

#### AppError Class
```typescript
const error = new AppError(
  ERROR_CODES.EXTERNAL_API_ERROR,
  'API request failed',
  'Connection timeout after 30s',
  5000 // retry after 5 seconds
);
```

#### Retry Logic
```typescript
// Basic retry
const result = await withRetry(
  () => externalApiCall(),
  DEFAULT_RETRY_CONFIG,
  'external-api-call'
);

// Retry with timeout
const result = await withRetryAndTimeout(
  () => externalApiCall(),
  30000, // 30 second timeout
  RATE_LIMITED_RETRY_CONFIG,
  'rate-limited-api-call'
);
```

#### Circuit Breaker
```typescript
const circuitBreaker = new CircuitBreaker('external-api', {
  failureThreshold: 5,
  recoveryTimeout: 60000, // 1 minute
  monitoringPeriod: 300000 // 5 minutes
});

const result = await circuitBreaker.execute(() => externalApiCall());
```

### 2. Structured Logging (`logging.ts`)

#### Basic Usage
```typescript
const logger = createLogger('function-name', requestId, userId);

logger.info('Processing request', { ticker: 'AAPL', context: 'investment' });
logger.warn('Rate limit approaching', { remaining: 10 });
logger.error('External API failed', error, { attempt: 3 });
```

#### Performance Monitoring
```typescript
const perfMonitor = createPerformanceMonitor(logger, 'database-query');
const result = await database.query('SELECT * FROM analyses');
const duration = perfMonitor.end({ rowCount: result.length });
```

#### Security Features
- Automatically redacts sensitive fields (api_key, password, token, etc.)
- Structured JSON output for log aggregation
- Request ID tracking for distributed tracing

### 3. Request Monitoring (`monitoring.ts`)

#### Request Lifecycle Tracking
```typescript
const monitor = createRequestMonitor('analyze-ticker', requestId, 'POST', logger, userId);

// Add metadata throughout request
monitor.addMetadata({ ticker: 'AAPL', context: 'investment' });

// End request with status and metrics
monitor.end(200, undefined, { 
  synthesisScore: 85,
  executionTime: 2500 
});
```

#### Health Checks
```typescript
const healthChecker = createHealthChecker();

// Register custom health checks
healthChecker.registerCheck('database', async () => {
  try {
    await database.ping();
    return { status: 'pass', message: 'Database connection healthy' };
  } catch (error) {
    return { status: 'fail', message: `Database error: ${error.message}` };
  }
});

// Run all checks
const health = await healthChecker.runChecks();
```

### 4. HTTP Utilities (`http.ts`)

#### Enhanced Request Handler
```typescript
const handler = createRequestHandler(
  async (request: Request, requestId: string) => {
    // Your function logic here
    return createSuccessHttpResponse(data, requestId);
  },
  ['POST', 'GET'] // Allowed methods
);

serve(handler);
```

#### Error Responses
```typescript
// Automatic error handling
try {
  const result = await processRequest();
  return createSuccessHttpResponse(result, requestId);
} catch (error) {
  return createErrorHttpResponse(error, requestId);
}
```

## Error Codes and Status Mapping

### Validation Errors (400)
- `INVALID_REQUEST`: Malformed request body
- `INVALID_TICKER`: Invalid ticker symbol format
- `MISSING_PARAMETER`: Required parameter missing
- `INVALID_PARAMETER`: Parameter value invalid

### Authentication Errors (401)
- `MISSING_TOKEN`: No authorization header
- `INVALID_TOKEN`: Invalid or expired JWT
- `EXPIRED_TOKEN`: Token has expired

### Authorization Errors (403)
- `MISSING_API_KEY`: No API key found for user
- `INVALID_API_KEY`: API key format invalid
- `INSUFFICIENT_PERMISSIONS`: User lacks required permissions

### External API Errors (502/503/504)
- `EXTERNAL_API_ERROR`: External service error
- `RATE_LIMIT_EXCEEDED`: API rate limit hit (429)
- `SERVICE_UNAVAILABLE`: External service down (503)
- `API_TIMEOUT`: Request timeout (504)

### Internal Errors (500)
- `INTERNAL_ERROR`: Unexpected system error
- `DATABASE_ERROR`: Database operation failed
- `PROCESSING_ERROR`: Analysis processing failed
- `ENCRYPTION_ERROR`: Encryption operation failed
- `DECRYPTION_ERROR`: Decryption operation failed

## Retry Configurations

### Default Retry Config
```typescript
{
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  jitter: true
}
```

### Rate Limited Retry Config
```typescript
{
  maxAttempts: 5,
  baseDelay: 2000, // 2 seconds
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 1.5,
  jitter: true
}
```

## Best Practices

### 1. Function Structure
```typescript
const handleFunction = async (request: Request, requestId: string): Promise<Response> => {
  const logger = createLogger('function-name', requestId);
  const monitor = createRequestMonitor('function-name', requestId, request.method, logger);

  try {
    logger.info('Starting function execution');

    // Authenticate user
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      monitor.end(401, authResult.error?.code);
      throw new AppError(
        authResult.error?.code || ERROR_CODES.INVALID_TOKEN,
        authResult.error?.message || 'Authentication failed'
      );
    }

    const userId = authResult.user!.user_id;
    logger.info('User authenticated', { userId });
    monitor.addMetadata({ userId });

    // Your function logic here...

    monitor.end(200);
    return createSuccessHttpResponse(result, requestId);

  } catch (error) {
    logger.error('Function execution failed', error);
    monitor.end(error.statusCode || 500, error.code);
    return createErrorHttpResponse(error, requestId);
  }
};
```

### 2. External API Calls
```typescript
// Always use retry logic for external APIs
const apiResult = await withRetryAndTimeout(
  async () => {
    const response = await fetch(apiUrl, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    
    if (!response.ok) {
      throw new AppError(
        ERROR_CODES.EXTERNAL_API_ERROR,
        `API request failed: ${response.status}`,
        await response.text()
      );
    }
    
    return response.json();
  },
  30000, // 30 second timeout
  DEFAULT_RETRY_CONFIG,
  'external-api-call'
);
```

### 3. Database Operations
```typescript
// Use circuit breakers for database operations
const dbCircuitBreaker = new CircuitBreaker('database', {
  failureThreshold: 3,
  recoveryTimeout: 30000,
  monitoringPeriod: 60000
});

const result = await dbCircuitBreaker.execute(async () => {
  return await database.query('SELECT * FROM analyses WHERE user_id = $1', [userId]);
});
```

### 4. Performance Monitoring
```typescript
// Monitor critical operations
const perfMonitor = createPerformanceMonitor(logger, 'synthesis-calculation');
const synthesisResult = await synthesisEngine.calculate(analysisData);
const duration = perfMonitor.end({ 
  inputSize: analysisData.length,
  outputScore: synthesisResult.score 
});

// Log slow operations
if (duration > 5000) {
  logger.warn('Slow synthesis calculation detected', { duration });
}
```

## Monitoring and Observability

### Metrics Collection
- Request count and error rates
- Average response times
- Memory usage tracking
- Circuit breaker status

### Log Aggregation
All logs are structured JSON for easy aggregation:
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "INFO",
  "message": "Analysis completed successfully",
  "functionName": "analyze-ticker",
  "requestId": "req_1705312200000_abc123",
  "userId": "user-456",
  "duration": 2500,
  "metadata": {
    "ticker": "AAPL",
    "synthesisScore": 85,
    "context": "investment"
  }
}
```

### Health Monitoring
```typescript
// Register default health checks
const healthChecker = createHealthChecker();
registerDefaultHealthChecks(healthChecker);

// Add custom checks
healthChecker.registerCheck('external-api', async () => {
  const response = await fetch('https://api.example.com/health');
  return response.ok 
    ? { status: 'pass', message: 'API healthy' }
    : { status: 'fail', message: 'API unreachable' };
});
```

## Testing

The error handling system includes comprehensive tests covering:
- Retry logic with various failure scenarios
- Circuit breaker state transitions
- Structured logging output
- Request monitoring lifecycle
- Health check execution

Run tests with:
```bash
deno test --allow-env supabase/functions/_shared/error-handling.test.ts
```

## Migration Guide

To update existing functions to use the enhanced error handling:

1. **Import the new utilities**:
   ```typescript
   import {
     createRequestHandler,
     createLogger,
     createRequestMonitor,
     withRetryAndTimeout,
     AppError,
     ERROR_CODES
   } from '../_shared/index.ts';
   ```

2. **Replace the serve call**:
   ```typescript
   // Old
   serve(async (req) => { /* handler logic */ });
   
   // New
   const handler = createRequestHandler(handleFunction, ['POST']);
   serve(handler);
   ```

3. **Add structured logging**:
   ```typescript
   const logger = createLogger('function-name', requestId);
   const monitor = createRequestMonitor('function-name', requestId, request.method, logger);
   ```

4. **Use retry logic for external calls**:
   ```typescript
   const result = await withRetryAndTimeout(
     () => externalApiCall(),
     30000,
     DEFAULT_RETRY_CONFIG,
     'api-call-name'
   );
   ```

5. **Throw AppError instead of generic errors**:
   ```typescript
   throw new AppError(
     ERROR_CODES.INVALID_REQUEST,
     'Validation failed',
     validationErrors.join(', ')
   );
   ```