# Shared Utilities for Signal-360 Edge Functions

This directory contains shared utilities and types used across all Signal-360 Edge Functions. These utilities provide consistent interfaces, error handling, authentication, and database operations.

## Structure

```
_shared/
├── index.ts          # Main exports file
├── types.ts          # TypeScript interfaces and types
├── auth.ts           # Authentication utilities
├── validation.ts     # Input validation and sanitization
├── errors.ts         # Error handling and logging
├── config.ts         # Configuration management
├── database.ts       # Database operations
├── http.ts           # HTTP utilities and response formatting
└── README.md         # This documentation
```

## Usage

Import utilities in your Edge Functions:

```typescript
import { 
  AnalysisRequest,
  authenticateUser,
  validateAnalysisRequest,
  createErrorHttpResponse,
  createSuccessHttpResponse,
  DatabaseService
} from '../_shared/index.ts';
```

## Core Components

### Types (`types.ts`)

Defines all TypeScript interfaces used across the application:

- **Request/Response interfaces**: `AnalysisRequest`, `AnalysisResponse`, etc.
- **Analysis module interfaces**: `FundamentalAnalysisInput`, `TechnicalAnalysisOutput`, etc.
- **Data structures**: `AnalysisFactor`, `ConvergenceFactor`, `DivergenceFactor`
- **Database types**: `Profile`, `Analysis`

### Authentication (`auth.ts`)

Provides JWT token validation and user context extraction:

```typescript
const authResult = await authenticateUser(request);
if (!authResult.success) {
  return createAuthErrorResponse(authResult, requestId);
}
const userId = authResult.user!.user_id;
```

### Validation (`validation.ts`)

Input validation and sanitization utilities:

```typescript
const validation = validateAnalysisRequest(requestBody);
if (!validation.isValid) {
  throw new AppError(ERROR_CODES.INVALID_REQUEST, validation.error);
}
const sanitizedData = validation.sanitizedData;
```

### Error Handling (`errors.ts`)

Standardized error handling and logging:

```typescript
try {
  // Your code here
} catch (error) {
  return createErrorHttpResponse(error, requestId);
}
```

### Configuration (`config.ts`)

Environment configuration and constants:

```typescript
const config = getConfig();
const timeout = config.external.apiTimeout;
const weights = config.analysis.weighting.investment;
```

### Database (`database.ts`)

Database operations with error handling:

```typescript
const db = new DatabaseService();
const profile = await db.getProfile(userId);
const analysis = await db.createAnalysis(userId, analysisData);
```

### HTTP Utilities (`http.ts`)

HTTP request/response utilities:

```typescript
const handler = createRequestHandler(async (request, requestId) => {
  const body = await parseJsonBody(request);
  // Process request
  return createSuccessHttpResponse(result, requestId);
}, ['POST']);
```

## Error Codes

The system uses standardized error codes defined in `errors.ts`:

- **Validation Errors (400)**: `INVALID_REQUEST`, `INVALID_TICKER`, `MISSING_PARAMETER`
- **Authentication Errors (401)**: `MISSING_TOKEN`, `INVALID_TOKEN`, `EXPIRED_TOKEN`
- **Authorization Errors (403)**: `MISSING_API_KEY`, `INVALID_API_KEY`
- **External API Errors (502/503)**: `EXTERNAL_API_ERROR`, `RATE_LIMIT_EXCEEDED`
- **Internal Errors (500)**: `INTERNAL_ERROR`, `DATABASE_ERROR`, `PROCESSING_ERROR`

## Configuration

Environment variables used by the shared utilities:

### Required
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key

### Optional
- `EXTERNAL_API_TIMEOUT`: External API timeout in ms (default: 30000)
- `MAX_RETRIES`: Maximum retry attempts (default: 3)
- `BASE_RETRY_DELAY`: Base retry delay in ms (default: 1000)
- `ENCRYPTION_KEY`: Encryption key for API keys
- `RATE_LIMIT_PER_USER`: Rate limit per user per hour (default: 100)
- `RATE_LIMIT_PER_IP`: Rate limit per IP per hour (default: 1000)
- `RATE_LIMIT_BURST`: Burst rate limit per minute (default: 10)

### Analysis Weighting
- `INVESTMENT_FUNDAMENTAL_WEIGHT`: Investment fundamental weight (default: 0.5)
- `INVESTMENT_TECHNICAL_WEIGHT`: Investment technical weight (default: 0.2)
- `INVESTMENT_ESG_WEIGHT`: Investment ESG weight (default: 0.3)
- `TRADING_FUNDAMENTAL_WEIGHT`: Trading fundamental weight (default: 0.25)
- `TRADING_TECHNICAL_WEIGHT`: Trading technical weight (default: 0.6)
- `TRADING_ESG_WEIGHT`: Trading ESG weight (default: 0.15)

### Cache Timeouts
- `MARKET_DATA_CACHE_TIMEOUT`: Market data cache timeout in ms (default: 300000)
- `FUNDAMENTALS_CACHE_TIMEOUT`: Fundamentals cache timeout in ms (default: 3600000)
- `ESG_DATA_CACHE_TIMEOUT`: ESG data cache timeout in ms (default: 86400000)

## Best Practices

1. **Always use shared types** for consistency across functions
2. **Validate all inputs** using the validation utilities
3. **Handle errors consistently** using the error utilities
4. **Log requests and errors** for debugging and monitoring
5. **Use the database service** for all database operations
6. **Follow the authentication pattern** for protected endpoints
7. **Use configuration constants** instead of hardcoded values

## Testing

Each utility module should be tested independently. Example test structure:

```typescript
import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import { validateAnalysisRequest } from './validation.ts';

Deno.test('validateAnalysisRequest - valid input', () => {
  const result = validateAnalysisRequest({
    ticker_symbol: 'AAPL',
    analysis_context: 'investment'
  });
  
  assertEquals(result.isValid, true);
  assertEquals(result.sanitizedData.ticker_symbol, 'AAPL');
});
```

## Security Considerations

- **Never log sensitive data** (API keys, tokens, personal information)
- **Always validate and sanitize inputs** to prevent injection attacks
- **Use service role key** for database operations in Edge Functions
- **Implement rate limiting** to prevent abuse
- **Use HTTPS only** for all external API calls
- **Encrypt sensitive data** before storing in database