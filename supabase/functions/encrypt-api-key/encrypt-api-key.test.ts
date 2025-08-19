// Unit tests for encrypt-api-key Edge Function
// Tests encryption functionality, validation, and error handling

import { assertEquals, assertExists, assert } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Mock environment variables for testing
Deno.env.set('SUPABASE_URL', 'https://test.supabase.co');
Deno.env.set('SUPABASE_ANON_KEY', 'test-anon-key');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');
Deno.env.set('ENCRYPTION_KEY', 'test-encryption-key-with-sufficient-length-for-security');

// Import the handler after setting environment variables
const { default: handler } = await import('./index.ts');

/**
 * Helper function to create test requests
 */
function createTestRequest(body: any, method: string = 'POST'): Request {
  return new Request('http://localhost:8000/encrypt-api-key', {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token'
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

Deno.test('encrypt-api-key - successful encryption', async () => {
  const validApiKey = 'AIzaSyDxVlAabc123def456ghi789jkl012mno345';
  
  const request = createTestRequest({
    api_key: validApiKey
  });

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 200);
  assertEquals(data.success, true);
  assertExists(data.data.encrypted_key);
  assertEquals(data.data.algorithm, 'AES-256-GCM');
  assertEquals(data.data.key_length, 256);
  assertExists(data.request_id);
  assertExists(data.timestamp);

  // Encrypted key should be different from original
  assert(data.data.encrypted_key !== validApiKey);
  
  // Encrypted key should be base64 encoded
  assert(/^[A-Za-z0-9+/]+=*$/.test(data.data.encrypted_key));
});

Deno.test('encrypt-api-key - invalid API key format', async () => {
  const invalidApiKey = 'invalid-api-key-format';
  
  const request = createTestRequest({
    api_key: invalidApiKey
  });

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 400);
  assertEquals(data.success, false);
  assertEquals(data.error.code, 'INVALID_REQUEST');
  assert(data.error.message.includes('does not match required pattern'));
  assertExists(data.request_id);
});

Deno.test('encrypt-api-key - missing API key', async () => {
  const request = createTestRequest({});

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 400);
  assertEquals(data.success, false);
  assertEquals(data.error.code, 'INVALID_REQUEST');
  assert(data.error.message.includes('api_key') && data.error.message.includes('required'));
  assertExists(data.request_id);
});

Deno.test('encrypt-api-key - empty API key', async () => {
  const request = createTestRequest({
    api_key: ''
  });

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 400);
  assertEquals(data.success, false);
  assertEquals(data.error.code, 'INVALID_REQUEST');
  assertExists(data.request_id);
});

Deno.test('encrypt-api-key - invalid content type', async () => {
  const request = new Request('http://localhost:8000/encrypt-api-key', {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain'
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

Deno.test('encrypt-api-key - invalid JSON', async () => {
  const request = new Request('http://localhost:8000/encrypt-api-key', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
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

Deno.test('encrypt-api-key - method not allowed', async () => {
  const request = createTestRequest({
    api_key: 'AIzaSyDxVlAabc123def456ghi789jkl012mno345'
  }, 'GET');

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 405);
  assertEquals(data.success, false);
  assertEquals(data.error.code, 'METHOD_NOT_ALLOWED');
  assertEquals(response.headers.get('Allow'), 'POST');
});

Deno.test('encrypt-api-key - CORS preflight', async () => {
  const request = new Request('http://localhost:8000/encrypt-api-key', {
    method: 'OPTIONS'
  });

  const response = await handler(request);

  assertEquals(response.status, 200);
  assertEquals(response.headers.get('Access-Control-Allow-Origin'), '*');
  assertEquals(response.headers.get('Access-Control-Allow-Methods'), 'POST, GET, OPTIONS');
  assertExists(response.headers.get('Access-Control-Allow-Headers'));
});

Deno.test('encrypt-api-key - consistent encryption', async () => {
  const apiKey = 'AIzaSyDxVlAabc123def456ghi789jkl012mno345';
  
  // Encrypt the same key twice
  const request1 = createTestRequest({ api_key: apiKey });
  const request2 = createTestRequest({ api_key: apiKey });

  const response1 = await handler(request1);
  const response2 = await handler(request2);

  const data1 = await parseResponse(response1);
  const data2 = await parseResponse(response2);

  assertEquals(response1.status, 200);
  assertEquals(response2.status, 200);
  
  // Results should be different due to random IV
  assert(data1.data.encrypted_key !== data2.data.encrypted_key);
  
  // But both should be valid base64
  assert(/^[A-Za-z0-9+/]+=*$/.test(data1.data.encrypted_key));
  assert(/^[A-Za-z0-9+/]+=*$/.test(data2.data.encrypted_key));
});

Deno.test('encrypt-api-key - various valid API key formats', async () => {
  const validApiKeys = [
    'AIzaSyDxVlAabc123def456ghi789jkl012mno345',
    'AIzaBCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-',
    'AIzaA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R'
  ];

  for (const apiKey of validApiKeys) {
    const request = createTestRequest({ api_key: apiKey });
    const response = await handler(request);
    const data = await parseResponse(response);

    assertEquals(response.status, 200, `Failed for API key: ${apiKey}`);
    assertEquals(data.success, true);
    assertExists(data.data.encrypted_key);
  }
});

Deno.test('encrypt-api-key - various invalid API key formats', async () => {
  const invalidApiKeys = [
    'AIza123', // too short
    'AIzaSyDxVlAabc123def456ghi789jkl012mno345extra', // too long
    'BIzaSyDxVlAabc123def456ghi789jkl012mno345', // wrong prefix
    'AIzaSyDxVlAabc123def456ghi789jkl012mno34@', // invalid character
    '', // empty
    'not-an-api-key-at-all'
  ];

  for (const apiKey of invalidApiKeys) {
    const request = createTestRequest({ api_key: apiKey });
    const response = await handler(request);
    const data = await parseResponse(response);

    assertEquals(response.status, 400, `Should fail for API key: ${apiKey}`);
    assertEquals(data.success, false);
    assertEquals(data.error.code, 'INVALID_REQUEST');
  }
});

Deno.test('encrypt-api-key - response headers', async () => {
  const request = createTestRequest({
    api_key: 'AIzaSyDxVlAabc123def456ghi789jkl012mno345'
  });

  const response = await handler(request);

  assertEquals(response.headers.get('Content-Type'), 'application/json');
  assertEquals(response.headers.get('Access-Control-Allow-Origin'), '*');
  assertExists(response.headers.get('Access-Control-Allow-Headers'));
});