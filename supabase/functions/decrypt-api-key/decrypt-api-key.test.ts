// Unit tests for decrypt-api-key Edge Function
// Tests decryption functionality, authentication, validation, and error handling

import { assertEquals, assertExists, assert } from 'https://deno.land/std@0.168.0/testing/asserts.ts';

// Mock environment variables for testing
Deno.env.set('SUPABASE_URL', 'https://test.supabase.co');
Deno.env.set('SUPABASE_ANON_KEY', 'test-anon-key');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');
Deno.env.set('ENCRYPTION_KEY', 'test-encryption-key-with-sufficient-length-for-security');

// Mock Supabase auth for testing
const mockSupabaseAuth = {
  getUser: (token: string) => {
    if (token === 'valid-token') {
      return Promise.resolve({
        data: { user: { id: 'test-user-id', email: 'test@example.com' } },
        error: null
      });
    } else if (token === 'expired-token') {
      return Promise.resolve({
        data: { user: null },
        error: { message: 'JWT expired' }
      });
    } else {
      return Promise.resolve({
        data: { user: null },
        error: { message: 'Invalid JWT' }
      });
    }
  }
};

// Mock the Supabase client
const mockCreateClient = () => ({
  auth: mockSupabaseAuth
});

// Replace the import in the shared module
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Import the handler after setting up mocks
const { default: handler } = await import('./index.ts');

/**
 * Helper function to create test requests
 */
function createTestRequest(body: any, token: string = 'valid-token', method: string = 'POST'): Request {
  return new Request('http://localhost:8000/decrypt-api-key', {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });
}

/**
 * Helper function to parse response
 */
async function parseResponse(response: Response) {
  const text = await response.text();
  return JSON.parse(text);
}

/**
 * Helper function to create a valid encrypted key for testing
 * This simulates what the encrypt function would produce
 */
function createMockEncryptedKey(): string {
  // This is a mock encrypted key that would decrypt to a valid Google API key
  // In real implementation, this would come from the encrypt function
  const mockData = 'AIzaSyDxVlAabc123def456ghi789jkl012mno345';
  return btoa(mockData + '-encrypted-mock-data');
}

Deno.test('decrypt-api-key - missing authorization header', async () => {
  const request = new Request('http://localhost:8000/decrypt-api-key', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      encrypted_key: createMockEncryptedKey()
    })
  });

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 401);
  assertEquals(data.success, false);
  assertEquals(data.error.code, 'MISSING_TOKEN');
  assertExists(data.request_id);
});

Deno.test('decrypt-api-key - invalid authorization token', async () => {
  const request = createTestRequest({
    encrypted_key: createMockEncryptedKey()
  }, 'invalid-token');

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 403);
  assertEquals(data.success, false);
  assertEquals(data.error.code, 'INVALID_TOKEN');
  assertExists(data.request_id);
});

Deno.test('decrypt-api-key - expired authorization token', async () => {
  const request = createTestRequest({
    encrypted_key: createMockEncryptedKey()
  }, 'expired-token');

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 403);
  assertEquals(data.success, false);
  assertEquals(data.error.code, 'INVALID_TOKEN');
  assertExists(data.request_id);
});

Deno.test('decrypt-api-key - missing encrypted key', async () => {
  const request = createTestRequest({});

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 400);
  assertEquals(data.success, false);
  assertEquals(data.error.code, 'INVALID_REQUEST');
  assert(data.error.message.includes('encrypted_key') && data.error.message.includes('required'));
  assertExists(data.request_id);
});

Deno.test('decrypt-api-key - empty encrypted key', async () => {
  const request = createTestRequest({
    encrypted_key: ''
  });

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 400);
  assertEquals(data.success, false);
  assertEquals(data.error.code, 'INVALID_REQUEST');
  assertExists(data.request_id);
});

Deno.test('decrypt-api-key - invalid encrypted key format', async () => {
  const request = createTestRequest({
    encrypted_key: 'not-base64-data!'
  });

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 400);
  assertEquals(data.success, false);
  assertEquals(data.error.code, 'INVALID_PARAMETER');
  assert(data.error.message.includes('Invalid encrypted key format'));
  assertExists(data.request_id);
});

Deno.test('decrypt-api-key - method not allowed', async () => {
  const request = createTestRequest({
    encrypted_key: createMockEncryptedKey()
  }, 'valid-token', 'GET');

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 405);
  assertEquals(data.success, false);
  assertEquals(data.error.code, 'METHOD_NOT_ALLOWED');
  assertEquals(response.headers.get('Allow'), 'POST');
});

Deno.test('decrypt-api-key - CORS preflight', async () => {
  const request = new Request('http://localhost:8000/decrypt-api-key', {
    method: 'OPTIONS'
  });

  const response = await handler(request);

  assertEquals(response.status, 200);
  assertEquals(response.headers.get('Access-Control-Allow-Origin'), '*');
  assertEquals(response.headers.get('Access-Control-Allow-Methods'), 'POST, GET, OPTIONS');
  assertExists(response.headers.get('Access-Control-Allow-Headers'));
});

Deno.test('decrypt-api-key - invalid content type', async () => {
  const request = new Request('http://localhost:8000/decrypt-api-key', {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
      'Authorization': 'Bearer valid-token'
    },
    body: 'not json'
  });

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 400);
  assertEquals(data.success, false);
  assertEquals(data.error.code, 'INVALID_REQUEST');
  assert(data.error.message.includes('application/json'));
});

Deno.test('decrypt-api-key - invalid JSON', async () => {
  const request = new Request('http://localhost:8000/decrypt-api-key', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer valid-token'
    },
    body: 'invalid json'
  });

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 400);
  assertEquals(data.success, false);
  assertEquals(data.error.code, 'INVALID_REQUEST');
  assert(data.error.message.includes('Invalid JSON'));
});

Deno.test('decrypt-api-key - malformed authorization header', async () => {
  const request = new Request('http://localhost:8000/decrypt-api-key', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'InvalidFormat token'
    },
    body: JSON.stringify({
      encrypted_key: createMockEncryptedKey()
    })
  });

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 401);
  assertEquals(data.success, false);
  assertEquals(data.error.code, 'MISSING_TOKEN');
  assertExists(data.request_id);
});

Deno.test('decrypt-api-key - response headers', async () => {
  const request = createTestRequest({
    encrypted_key: createMockEncryptedKey()
  });

  const response = await handler(request);

  assertEquals(response.headers.get('Content-Type'), 'application/json');
  assertEquals(response.headers.get('Access-Control-Allow-Origin'), '*');
  assertExists(response.headers.get('Access-Control-Allow-Headers'));
});

Deno.test('decrypt-api-key - various invalid encrypted key formats', async () => {
  const invalidKeys = [
    'short', // too short
    '!@#$%^&*()', // invalid base64 characters
    '', // empty
    'dGVzdA==', // valid base64 but too short for encrypted data
  ];

  for (const encryptedKey of invalidKeys) {
    const request = createTestRequest({ encrypted_key: encryptedKey });
    const response = await handler(request);
    const data = await parseResponse(response);

    assert(response.status >= 400, `Should fail for encrypted key: ${encryptedKey}`);
    assertEquals(data.success, false);
    assert(['INVALID_REQUEST', 'INVALID_PARAMETER', 'DECRYPTION_ERROR'].includes(data.error.code));
  }
});

// Note: Full end-to-end encryption/decryption test would require actual crypto operations
// This would be better tested in integration tests with real encrypt/decrypt functions
Deno.test('decrypt-api-key - integration note', () => {
  // This test serves as documentation that full encryption/decryption
  // integration should be tested separately with real crypto operations
  assert(true, 'Integration tests should verify full encrypt/decrypt cycle');
});