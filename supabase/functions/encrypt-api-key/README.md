# Encrypt API Key Edge Function

This Edge Function provides secure AES-256-GCM encryption for Google API keys before they are stored in the database. It's part of the Signal-360 backend analysis system and ensures that user API keys are never stored in plain text.

## Endpoint

```
POST /functions/v1/encrypt-api-key
```

## Authentication

This function does not require authentication as it's used during the initial API key setup process. However, it validates the API key format to ensure only valid Google API keys are encrypted.

## Request Format

```json
{
  "api_key": "AIzaSyDxVlAabc123def456ghi789jkl012mno345"
}
```

### Request Parameters

- `api_key` (string, required): A valid Google API key in the format `AIza[35 characters]`

## Response Format

### Success Response (200)

```json
{
  "success": true,
  "data": {
    "encrypted_key": "base64-encoded-encrypted-data",
    "algorithm": "AES-256-GCM",
    "key_length": 256
  },
  "request_id": "req_1234567890_abcdef123",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Error Response (400/500)

```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Validation failed: Field 'api_key' does not match required pattern",
    "details": "Additional error details if available"
  },
  "request_id": "req_1234567890_abcdef123",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Error Codes

- `INVALID_REQUEST` (400): Invalid request format or missing required fields
- `ENCRYPTION_ERROR` (500): Failed to encrypt the API key
- `METHOD_NOT_ALLOWED` (405): HTTP method not allowed (only POST is supported)

## Security Features

### Encryption Algorithm
- **Algorithm**: AES-256-GCM (Galois/Counter Mode)
- **Key Size**: 256 bits
- **IV Size**: 96 bits (12 bytes)
- **Authentication**: Built-in authentication tag prevents tampering

### Key Management
- Encryption key is derived from environment variable using SHA-256
- Each encryption uses a randomly generated IV for semantic security
- No encryption keys are logged or exposed in responses

### Input Validation
- Validates Google API key format: `^AIza[0-9A-Za-z-_]{35}$`
- Sanitizes input to prevent injection attacks
- Validates request content type and JSON format

## Implementation Details

### Encryption Process
1. Generate random 96-bit IV
2. Derive 256-bit encryption key from environment variable
3. Encrypt API key using AES-256-GCM
4. Combine IV + encrypted data
5. Return base64-encoded result

### Environment Variables
- `ENCRYPTION_KEY`: Master encryption key (minimum 32 characters)
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key

## Usage Example

```bash
curl -X POST https://your-project.supabase.co/functions/v1/encrypt-api-key \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "AIzaSyDxVlAabc123def456ghi789jkl012mno345"
  }'
```

## Testing

Run the unit tests:

```bash
deno test supabase/functions/encrypt-api-key/encrypt-api-key.test.ts --allow-all
```

Run integration tests:

```bash
deno test supabase/functions/_shared/encryption-integration.test.ts --allow-all
```

## Security Considerations

1. **Never log the plain text API key** - Only log success/failure status
2. **Validate encryption key strength** - Minimum 32 characters required
3. **Use secure random IV** - Each encryption uses a unique IV
4. **Validate input format** - Only accept valid Google API key format
5. **Handle errors securely** - Don't expose sensitive information in error messages

## Related Functions

- [`decrypt-api-key`](../decrypt-api-key/README.md): Decrypts encrypted API keys
- [Encryption Integration Tests](../_shared/encryption-integration.test.ts): Full cycle testing

## Performance

- Average encryption time: ~10-50ms
- Memory usage: Minimal (< 1MB)
- Concurrent requests: Supported (stateless operation)

## Monitoring

The function logs the following events:
- Successful encryption (without sensitive data)
- Validation failures
- Encryption errors
- Request metadata (method, headers, timing)