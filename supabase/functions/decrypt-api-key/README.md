# Decrypt API Key Edge Function

This Edge Function provides secure AES-256-GCM decryption for encrypted Google API keys stored in the database. It's part of the Signal-360 backend analysis system and is used by other Edge Functions to retrieve user API keys for external API calls.

## Endpoint

```
POST /functions/v1/decrypt-api-key
```

## Authentication

**Required**: This function requires a valid JWT token in the Authorization header. Only authenticated users can decrypt their own API keys.

```
Authorization: Bearer <jwt-token>
```

## Request Format

```json
{
  "encrypted_key": "base64-encoded-encrypted-data"
}
```

### Request Parameters

- `encrypted_key` (string, required): Base64-encoded encrypted API key data from the database

## Response Format

### Success Response (200)

```json
{
  "success": true,
  "data": {
    "api_key": "AIzaSyDxVlAabc123def456ghi789jkl012mno345",
    "algorithm": "AES-256-GCM",
    "user_id": "user-uuid-from-jwt"
  },
  "request_id": "req_1234567890_abcdef123",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Error Response (400/401/403/500)

```json
{
  "success": false,
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Invalid or expired JWT token",
    "details": "Additional error details if available"
  },
  "request_id": "req_1234567890_abcdef123",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Error Codes

- `MISSING_TOKEN` (401): Authorization header missing or malformed
- `INVALID_TOKEN` (403): JWT token is invalid or expired
- `INVALID_REQUEST` (400): Invalid request format or missing required fields
- `INVALID_PARAMETER` (400): Invalid encrypted key format
- `DECRYPTION_ERROR` (500): Failed to decrypt the API key
- `METHOD_NOT_ALLOWED` (405): HTTP method not allowed (only POST is supported)

## Security Features

### Authentication & Authorization
- Requires valid JWT token for all requests
- Validates token using Supabase Auth
- Extracts user context from token
- Logs user ID for audit purposes (without sensitive data)

### Decryption Algorithm
- **Algorithm**: AES-256-GCM (Galois/Counter Mode)
- **Key Size**: 256 bits
- **IV Size**: 96 bits (12 bytes)
- **Authentication**: Verifies authentication tag to detect tampering

### Input Validation
- Validates encrypted key is valid base64
- Validates minimum encrypted data length
- Validates decrypted result matches Google API key format
- Sanitizes all inputs to prevent injection attacks

### Output Validation
- Verifies decrypted key matches expected Google API key pattern
- Fails if decrypted data doesn't match expected format
- Prevents returning corrupted or invalid keys

## Implementation Details

### Decryption Process
1. Validate JWT token and extract user context
2. Decode base64 encrypted data
3. Extract IV and encrypted payload
4. Derive decryption key from environment variable
5. Decrypt using AES-256-GCM
6. Validate decrypted key format
7. Return decrypted API key

### Environment Variables
- `ENCRYPTION_KEY`: Master encryption key (must match encrypt function)
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for auth validation

## Usage Example

```bash
curl -X POST https://your-project.supabase.co/functions/v1/decrypt-api-key \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -d '{
    "encrypted_key": "base64-encoded-encrypted-data"
  }'
```

## Internal Usage

This function is primarily used by other Edge Functions in the analysis pipeline:

```typescript
// Example usage in another Edge Function
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const { data, error } = await supabase.functions.invoke('decrypt-api-key', {
  body: { encrypted_key: userEncryptedKey },
  headers: { Authorization: `Bearer ${userToken}` }
});

if (data?.api_key) {
  // Use decrypted API key for external API calls
  const googleApiKey = data.api_key;
}
```

## Testing

Run the unit tests:

```bash
deno test supabase/functions/decrypt-api-key/decrypt-api-key.test.ts --allow-all
```

Run integration tests:

```bash
deno test supabase/functions/_shared/encryption-integration.test.ts --allow-all
```

## Security Considerations

1. **Authentication Required** - All requests must include valid JWT token
2. **Never log decrypted keys** - Only log success/failure and user ID
3. **Validate decrypted output** - Ensure result matches expected format
4. **Secure error handling** - Don't expose decryption details in errors
5. **Audit logging** - Log all decryption attempts with user context
6. **Rate limiting** - Consider implementing rate limits for abuse prevention

## Performance

- Average decryption time: ~10-50ms
- Memory usage: Minimal (< 1MB)
- Concurrent requests: Supported (stateless operation)
- Authentication overhead: ~5-10ms per request

## Monitoring

The function logs the following events:
- Successful decryption (with user ID, no sensitive data)
- Authentication failures
- Validation failures
- Decryption errors
- Request metadata (method, headers, timing)

## Related Functions

- [`encrypt-api-key`](../encrypt-api-key/README.md): Encrypts API keys for storage
- [Encryption Integration Tests](../_shared/encryption-integration.test.ts): Full cycle testing

## Troubleshooting

### Common Issues

1. **"Invalid or expired JWT token"**
   - Check that the Authorization header is properly formatted
   - Verify the JWT token is not expired
   - Ensure the token was issued by the correct Supabase project

2. **"Invalid encrypted key format"**
   - Verify the encrypted key is valid base64
   - Check that the encrypted key was generated by the encrypt function
   - Ensure the encrypted key hasn't been corrupted

3. **"Failed to decrypt API key"**
   - Verify the encryption key environment variable matches the encrypt function
   - Check that the encrypted data hasn't been tampered with
   - Ensure the encrypted key was generated with the same encryption key

4. **"Decrypted key does not match expected format"**
   - The encrypted data may be corrupted
   - The encryption key may be different from when the data was encrypted
   - The encrypted data may not contain a valid Google API key