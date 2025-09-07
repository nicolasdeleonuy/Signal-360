# API Key Service Documentation

## Overview

The API Key Service provides secure management, encryption, decryption, and validation of user API keys for the Signal-360 analysis platform. It includes in-memory caching, comprehensive validation, and integration with the analysis pipeline.

## Features

- **Secure Encryption/Decryption**: AES-256-GCM encryption for API keys at rest
- **In-Memory Caching**: 1-hour TTL cache to avoid repeated decryption
- **Format Validation**: Comprehensive validation for different API key types
- **Functionality Testing**: Live API testing to verify key functionality
- **Error Handling**: Detailed error reporting with user-friendly messages
- **Performance Monitoring**: Cache statistics and performance tracking

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Analysis      │    │   API Key        │    │   Encryption    │
│   Functions     │───▶│   Service        │───▶│   Service       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌──────────────────┐    ┌─────────────────┐
                       │   Cache Layer    │    │   Database      │
                       │   (In-Memory)    │    │   (Encrypted)   │
                       └──────────────────┘    └─────────────────┘
```

## Core Classes

### ApiKeyService

Main service class for API key management.

```typescript
const service = new ApiKeyService(logger);

// Get decrypted API key with caching
const result = await service.getDecryptedApiKey(userId, 'google_api', requestId);

// Validate API key format
const validation = service.validateApiKey(apiKey);

// Test API key functionality
const isWorking = await service.testApiKey(apiKey, 'google_api');

// Clear cached key
service.clearCachedApiKey(userId, 'google_api');

// Get cache statistics
const stats = service.getCacheStats();
```

### AnalysisOrchestrator

High-level orchestrator for analysis pipeline integration.

```typescript
const orchestrator = new AnalysisOrchestrator(logger);

// Validate and get API key for analysis
const apiKey = await orchestrator.validateAndGetApiKey(userId, requestId);

// Execute complete analysis with progress tracking
const results = await orchestrator.executeAnalysis(
  userId, 
  ticker, 
  context,
  (progress, phase) => console.log(`${progress}% - ${phase}`)
);

// Get API key status
const status = await orchestrator.getApiKeyStatus(userId);
```

## Helper Functions

### Simple API Key Retrieval

```typescript
import { getDecryptedApiKeySimple } from './api-key-service.ts';

// Simple function for getting decrypted API key
const apiKey = await getDecryptedApiKeySimple(userId, 'google_api', requestId);
```

### Complete Validation

```typescript
import { validateApiKeyComplete } from './api-key-service.ts';

// Validate both format and functionality
const validation = await validateApiKeyComplete(apiKey, 'google_api');
if (validation.isValid) {
  console.log('API key is valid and working');
} else {
  console.log('Errors:', validation.errors);
}
```

### Authentication with API Key

```typescript
import { authenticateWithApiKey } from './api-key-service.ts';

// Authenticate user and get API key in one call
const result = await authenticateWithApiKey(request, 'google_api');
if (result.success) {
  console.log('User:', result.user);
  console.log('API Key:', result.apiKey);
}
```

## API Key Types

### Google API Keys

- **Format**: `AIza[35 alphanumeric characters]`
- **Length**: 39 characters
- **Validation**: Format + Custom Search API test
- **Usage**: Financial data retrieval, company information

### Financial Data API Keys

- **Format**: Variable (16-64 characters)
- **Validation**: Length-based + API test
- **Usage**: Market data, financial statements

### News API Keys

- **Format**: Variable (20-50 characters)
- **Validation**: Length-based + API test
- **Usage**: News sentiment, ESG information

## Caching Strategy

### Cache Key Format
```
{userId}:{keyType}
```

### Cache Behavior
- **TTL**: 1 hour (3600 seconds)
- **Storage**: In-memory Map
- **Cleanup**: Automatic expiration
- **Statistics**: Size and key tracking

### Cache Operations
```typescript
// Cache is automatically managed, but you can:

// Clear specific user's cache
service.clearCachedApiKey(userId, 'google_api');

// Get cache statistics
const stats = service.getCacheStats();
console.log(`Cache size: ${stats.size}`);
console.log(`Cached keys: ${stats.keys.join(', ')}`);
```

## Error Handling

### Error Types

1. **Missing API Key**
   - Code: `MISSING_API_KEY`
   - Message: User needs to configure API key

2. **Invalid API Key**
   - Code: `INVALID_API_KEY`
   - Message: Key format or functionality validation failed

3. **Decryption Error**
   - Code: `DECRYPTION_ERROR`
   - Message: Failed to decrypt stored key

4. **Database Error**
   - Code: `DATABASE_ERROR`
   - Message: Failed to retrieve key from database

### Error Response Format
```typescript
{
  success: false,
  error: {
    code: 'INVALID_API_KEY',
    message: 'API key format is invalid',
    details: 'Key must be 39 characters starting with AIza'
  }
}
```

## Integration Examples

### Analysis Function Integration

```typescript
import { getValidatedApiKey } from './analysis-orchestrator.ts';

async function performAnalysis(userId: string, ticker: string) {
  try {
    // Get validated API key
    const apiKey = await getValidatedApiKey(userId);
    
    // Use API key for external calls
    const response = await fetch(`https://api.example.com/data?key=${apiKey}&symbol=${ticker}`);
    
    // Process results...
    
  } catch (error) {
    if (error.code === 'MISSING_API_KEY') {
      return {
        success: false,
        error: 'Please configure your Google API key in profile settings'
      };
    }
    throw error;
  }
}
```

### Async Analysis Integration

```typescript
import { AnalysisOrchestrator } from './analysis-orchestrator.ts';

async function startAsyncAnalysis(jobId: string, userId: string, ticker: string) {
  const orchestrator = new AnalysisOrchestrator();
  
  try {
    const results = await orchestrator.executeAnalysis(
      userId,
      ticker,
      'investment',
      (progress, phase) => {
        // Update job progress in database
        updateJobProgress(jobId, progress, phase);
      }
    );
    
    // Store results
    await storeAnalysisResults(jobId, results);
    
  } catch (error) {
    await markJobAsFailed(jobId, error.message);
  }
}
```

## Security Considerations

### Encryption
- **Algorithm**: AES-256-GCM
- **Key Derivation**: SHA-256 hash of master key
- **IV**: Random 96-bit initialization vector
- **Storage**: Base64 encoded encrypted data

### Memory Management
- **Cache TTL**: 1 hour maximum
- **Automatic Cleanup**: Expired keys removed automatically
- **No Logging**: API keys never logged in plain text
- **Secure Cleanup**: Keys cleared from memory after use

### Access Control
- **User Isolation**: Users can only access their own keys
- **Service Role**: Backend services can decrypt any key
- **Authentication**: All operations require valid authentication
- **Audit Trail**: All operations logged (without sensitive data)

## Performance Optimization

### Caching Benefits
- **Reduced Latency**: Cached keys retrieved in ~1ms vs ~100ms for decryption
- **Lower CPU Usage**: Avoids repeated cryptographic operations
- **Better UX**: Faster analysis startup times

### Monitoring
```typescript
// Get performance statistics
const stats = service.getCacheStats();
console.log(`Cache hit rate: ${calculateHitRate(stats)}`);

// Monitor cache usage
setInterval(() => {
  const stats = service.getCacheStats();
  if (stats.size > 1000) {
    console.warn('Cache size is large:', stats.size);
  }
}, 60000);
```

## Testing

### Unit Tests
```bash
deno test supabase/functions/_shared/api-key-service.test.ts
```

### Integration Tests
```bash
deno test supabase/functions/_shared/api-key-service.test.ts --filter "Integration"
```

### Test Coverage
- ✅ API key format validation
- ✅ Encryption/decryption workflow
- ✅ Cache behavior and TTL
- ✅ Error handling scenarios
- ✅ Multiple key type support
- ✅ Authentication integration

## Troubleshooting

### Common Issues

1. **"API key not found"**
   - User hasn't configured API key in profile
   - Check database for encrypted_google_api_key

2. **"Decryption failed"**
   - Encryption key mismatch between environments
   - Corrupted encrypted data in database

3. **"API key format invalid"**
   - Key doesn't match expected Google API key format
   - Key may have been truncated or modified

4. **"API key functionality test failed"**
   - Key is valid format but doesn't work with Google APIs
   - May be expired, disabled, or quota exceeded

### Debug Commands
```typescript
// Check API key status
const status = await orchestrator.getApiKeyStatus(userId);
console.log('API Key Status:', status);

// Test specific key
const validation = await validateApiKeyComplete(apiKey, 'google_api');
console.log('Validation Result:', validation);

// Check cache
const stats = service.getCacheStats();
console.log('Cache Stats:', stats);
```

## Migration Guide

### From Old API Key Service

1. **Update Imports**
   ```typescript
   // Old
   import { getApiKey } from './old-api-service.ts';
   
   // New
   import { getDecryptedApiKeySimple } from './api-key-service.ts';
   ```

2. **Update Function Calls**
   ```typescript
   // Old
   const key = await getApiKey(userId);
   
   // New
   const key = await getDecryptedApiKeySimple(userId, 'google_api', requestId);
   ```

3. **Add Error Handling**
   ```typescript
   try {
     const key = await getDecryptedApiKeySimple(userId, 'google_api');
   } catch (error) {
     if (error.code === 'MISSING_API_KEY') {
       // Handle missing key
     }
   }
   ```

## Future Enhancements

- **Multiple API Key Support**: Support for multiple keys per user
- **Key Rotation**: Automatic key rotation and versioning
- **Usage Analytics**: Detailed API key usage tracking
- **Rate Limiting**: Per-key rate limiting and quota management
- **Key Sharing**: Secure key sharing between team members