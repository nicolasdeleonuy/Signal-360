# API Key Decryption Integration for Signal-360 Analysis Pipeline

## Overview

The Signal-360 analysis pipeline now includes comprehensive API key decryption integration that provides secure, seamless access to external APIs for analysis functions. This system ensures that user API keys are stored encrypted in the database and decrypted only when needed for analysis operations.

## Key Features

- **Secure API Key Storage**: All API keys are encrypted using AES-256-GCM encryption
- **Automatic Decryption**: Seamless decryption during analysis requests
- **Multiple API Key Types**: Support for Google API, Financial Data, and News API keys
- **Enhanced Authentication**: Combined user authentication and API key retrieval
- **Comprehensive Validation**: Format validation for different API key types
- **Usage Tracking**: Monitor API key usage and statistics
- **Error Handling**: Robust error handling for all key-related operations
- **Testing Support**: Built-in API key testing capabilities

## Architecture

### Components

1. **API Key Service** (`api-key-service.ts`)
   - Core service for API key management
   - Handles encryption/decryption operations
   - Provides validation and testing capabilities

2. **Decryption Edge Function** (`decrypt-api-key/index.ts`)
   - Secure AES-256-GCM decryption service
   - Validates encrypted data format
   - Returns decrypted API keys

3. **Database Integration**
   - Encrypted storage in `user_api_keys` table
   - Usage statistics tracking
   - Active/inactive key management

4. **Enhanced Authentication**
   - Combined user auth and API key retrieval
   - Seamless integration with analysis functions
   - Automatic error handling

## Usage Guide

### Basic API Key Retrieval

```typescript
import { getDecryptedApiKey } from '../_shared/index.ts';

// Get decrypted API key for a user
const apiKey = await getDecryptedApiKey(
  'user-123',           // User ID
  'google_api',         // Key type
  'request-456'         // Request ID (optional)
);

// Use the API key for external API calls
const response = await fetch(`https://api.google.com/search?key=${apiKey}`);
```

### Enhanced Authentication with API Key

```typescript
import { authenticateWithApiKey } from '../_shared/index.ts';

const handleRequest = async (request: Request, requestId: string): Promise<Response> => {
  // Authenticate user and get API key in one call
  const authResult = await authenticateWithApiKey(request, 'google_api');
  
  if (!authResult.success) {
    return createErrorHttpResponse(authResult.error, requestId);
  }
  
  const { user, apiKey } = authResult;
  
  // Use the API key for analysis
  const analysisResult = await performAnalysis(apiKey);
  
  return createSuccessHttpResponse(analysisResult, requestId);
};
```

### API Key Service Class

```typescript
import { ApiKeyService } from '../_shared/index.ts';

const apiKeyService = new ApiKeyService(logger);

// Get decrypted API key with full error handling
const keyInfo = await apiKeyService.getDecryptedApiKey(
  userId,
  'google_api',
  requestId
);

// Check if user has valid API key
const hasKey = await apiKeyService.hasValidApiKey(userId, 'google_api');

// Get API key usage statistics
const keyStats = await apiKeyService.getApiKeyInfo(userId, 'google_api');

// Test API key functionality
const isWorking = await apiKeyService.testApiKey(apiKey, 'google_api');

// Validate API key format
const validation = apiKeyService.validateApiKey(apiKey);
```

## API Key Types and Validation

### Google API Keys

- **Format**: `AIza[0-9A-Za-z-_]{35}`
- **Length**: 39 characters
- **Prefix**: `AIza`
- **Use Case**: Google Custom Search, Google Finance, Google News

```typescript
// Valid Google API key example
const googleKey = 'AIzaSyDMockGoogleApiKey1234567890123456';

const validation = apiKeyService.validateApiKey(googleKey);
// validation.is_valid = true
// validation.key_type = 'google_api'
```

### Financial Data API Keys

- **Length**: 16-64 characters
- **Format**: Flexible (depends on provider)
- **Use Case**: Financial market data, stock prices, company financials

```typescript
// Financial data API key example
const financialKey = 'fin-api-key-1234567890123456';

const validation = apiKeyService.validateApiKey(financialKey);
// validation.key_type = 'financial_data'
```

### News API Keys

- **Length**: 20-50 characters
- **Format**: Flexible (depends on provider)
- **Use Case**: News articles, sentiment analysis, market news

```typescript
// News API key example
const newsKey = 'news-api-key-abcdef1234567890';

const validation = apiKeyService.validateApiKey(newsKey);
// validation.key_type = 'news_api'
```

## Database Schema

### user_api_keys Table

```sql
CREATE TABLE user_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_type TEXT NOT NULL CHECK (key_type IN ('google_api', 'financial_data', 'news_api')),
  encrypted_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used TIMESTAMP WITH TIME ZONE,
  usage_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, key_type)
);

-- Indexes for performance
CREATE INDEX idx_user_api_keys_user_id ON user_api_keys(user_id);
CREATE INDEX idx_user_api_keys_active ON user_api_keys(user_id, key_type, is_active);
```

## Integration Examples

### Fundamental Analysis Function

```typescript
const handleFundamentalAnalysis = async (request: Request, requestId: string): Promise<Response> => {
  const logger = createLogger('fundamental-analysis', requestId);
  
  try {
    // Authenticate and get API key
    const authResult = await authenticateWithApiKey(request, 'google_api');
    if (!authResult.success) {
      throw new AnalysisError(
        ANALYSIS_ERROR_CODES.MISSING_API_KEY,
        'Authentication failed',
        AnalysisStage.AUTHENTICATION
      );
    }

    const { user, apiKey } = authResult;
    
    // Parse request body
    const body = await parseJsonBody(request);
    
    // Validate ticker
    const tickerValidation = TickerValidator.validate(body.ticker_symbol);
    if (!tickerValidation.valid) {
      throw new AnalysisError(
        ANALYSIS_ERROR_CODES.TICKER_VALIDATION_FAILED,
        'Invalid ticker format',
        AnalysisStage.VALIDATION
      );
    }

    // Perform analysis with API key
    const result = await performFundamentalAnalysis(
      tickerValidation.normalized,
      apiKey,
      body.analysis_context
    );

    return createSuccessHttpResponse(result, requestId);

  } catch (error) {
    logger.error('Analysis failed', error);
    return createErrorHttpResponse(error, requestId);
  }
};
```

### Technical Analysis Function

```typescript
const handleTechnicalAnalysis = async (request: Request, requestId: string): Promise<Response> => {
  const logger = createLogger('technical-analysis', requestId);
  const pipelineMonitor = new AnalysisPipelineMonitor(requestId, ticker, context, logger);
  
  try {
    // Enhanced authentication with pipeline monitoring
    pipelineMonitor.startStage(AnalysisStage.AUTHENTICATION);
    
    const authResult = await authenticateWithApiKey(request, 'financial_data');
    if (!authResult.success) {
      const error = new AnalysisError(
        ANALYSIS_ERROR_CODES.MISSING_API_KEY,
        'Financial data API key required',
        AnalysisStage.AUTHENTICATION
      );
      pipelineMonitor.endStage(AnalysisStage.AUTHENTICATION, undefined, error);
      throw error;
    }
    
    pipelineMonitor.endStage(AnalysisStage.AUTHENTICATION, { userId: authResult.user.user_id });

    // Continue with technical analysis...
    pipelineMonitor.startStage(AnalysisStage.TECHNICAL_ANALYSIS);
    
    const result = await performTechnicalAnalysis(
      ticker,
      authResult.apiKey,
      context
    );
    
    pipelineMonitor.endStage(AnalysisStage.TECHNICAL_ANALYSIS, result);

    return createSuccessHttpResponse(result, requestId);

  } catch (error) {
    logger.error('Technical analysis failed', error);
    return createErrorHttpResponse(error, requestId);
  }
};
```

## Error Handling

### Common Error Scenarios

1. **Missing API Key**
   ```typescript
   // Error: MISSING_API_KEY
   // User hasn't configured their API key
   // Solution: Direct user to profile settings
   ```

2. **Invalid API Key Format**
   ```typescript
   // Error: INVALID_API_KEY
   // API key doesn't match expected format
   // Solution: Validate key format before saving
   ```

3. **Decryption Failure**
   ```typescript
   // Error: DECRYPTION_ERROR
   // Unable to decrypt stored API key
   // Solution: Re-encrypt key or ask user to re-enter
   ```

4. **API Key Expired/Invalid**
   ```typescript
   // Error: EXTERNAL_API_ERROR (403)
   // API key is expired or revoked
   // Solution: Ask user to update their API key
   ```

### Error Response Format

```typescript
{
  "success": false,
  "error": {
    "code": "MISSING_API_KEY",
    "message": "No active google_api API key found for user",
    "details": "User needs to configure their API key in profile settings",
    "stage": "authentication"
  },
  "request_id": "req_1234567890",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Security Considerations

### Encryption

- **Algorithm**: AES-256-GCM
- **Key Derivation**: SHA-256 hash of master key
- **IV**: 96-bit random initialization vector
- **Storage**: Base64 encoded encrypted data

### Access Control

- **Authentication Required**: All API key operations require valid JWT
- **User Isolation**: Users can only access their own API keys
- **Audit Logging**: All key operations are logged
- **Rate Limiting**: Decryption operations are rate limited

### Best Practices

1. **Never Log API Keys**: API keys are never logged in plain text
2. **Secure Transmission**: All API key operations use HTTPS
3. **Key Rotation**: Support for updating API keys without service interruption
4. **Minimal Exposure**: API keys are only decrypted when needed
5. **Error Sanitization**: Error messages don't expose sensitive information

## Testing

### Unit Tests

```bash
# Run API key service tests
deno test --allow-env supabase/functions/_shared/api-key-service.test.ts
```

### Test Coverage

- ✅ API key format validation (all types)
- ✅ Successful key retrieval and decryption
- ✅ Missing API key handling
- ✅ Decryption failure scenarios
- ✅ Authentication integration
- ✅ Usage statistics tracking
- ✅ API key testing functionality
- ✅ Error handling and recovery

### Mock Data

```typescript
// Test data for different API key types
const testKeys = {
  google_api: 'AIzaSyDMockGoogleApiKey1234567890123456',
  financial_data: 'fin-api-key-1234567890123456',
  news_api: 'news-api-key-abcdef1234567890'
};

// Mock encrypted keys
const encryptedKeys = {
  google_api: 'mock-encrypted-key-base64',
  financial_data: 'mock-encrypted-financial-key',
  news_api: 'mock-encrypted-news-key'
};
```

## Migration Guide

### Updating Existing Functions

1. **Add Imports**
   ```typescript
   import {
     authenticateWithApiKey,
     getDecryptedApiKey,
     AnalysisError,
     AnalysisStage,
     ANALYSIS_ERROR_CODES
   } from '../_shared/index.ts';
   ```

2. **Replace Authentication**
   ```typescript
   // Old approach
   const authResult = await authenticateUser(request);
   const apiKey = body.api_key; // From request body
   
   // New approach
   const authResult = await authenticateWithApiKey(request, 'google_api');
   const { user, apiKey } = authResult;
   ```

3. **Update Error Handling**
   ```typescript
   // Old approach
   throw new AppError(ERROR_CODES.MISSING_PARAMETER, 'Missing API key');
   
   // New approach
   throw new AnalysisError(
     ANALYSIS_ERROR_CODES.MISSING_API_KEY,
     'API key required for analysis',
     AnalysisStage.AUTHENTICATION
   );
   ```

4. **Add Pipeline Monitoring**
   ```typescript
   const pipelineMonitor = new AnalysisPipelineMonitor(requestId, ticker, context, logger);
   pipelineMonitor.startStage(AnalysisStage.AUTHENTICATION);
   // ... authentication logic
   pipelineMonitor.endStage(AnalysisStage.AUTHENTICATION, result);
   ```

### Database Migration

```sql
-- Create user_api_keys table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_type TEXT NOT NULL CHECK (key_type IN ('google_api', 'financial_data', 'news_api')),
  encrypted_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used TIMESTAMP WITH TIME ZONE,
  usage_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, key_type)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON user_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_active ON user_api_keys(user_id, key_type, is_active);

-- Add RLS policies
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own API keys" ON user_api_keys
  FOR ALL USING (auth.uid() = user_id);
```

## Monitoring and Metrics

### Key Metrics

- API key usage frequency
- Decryption success/failure rates
- Authentication success rates
- API key validation errors
- External API response times

### Logging

```typescript
// Successful operations
logger.info('API key retrieved successfully', {
  userId: 'user-123',
  keyType: 'google_api',
  requestId: 'req-456'
});

// Error conditions
logger.error('API key decryption failed', error, {
  userId: 'user-123',
  keyType: 'google_api',
  errorCode: 'DECRYPTION_ERROR'
});
```

### Alerts

- High decryption failure rate
- Unusual API key usage patterns
- External API authentication failures
- Missing API key errors above threshold

This comprehensive API key integration system ensures secure, reliable access to external APIs while maintaining the highest security standards and providing excellent developer experience for the Signal-360 analysis pipeline.