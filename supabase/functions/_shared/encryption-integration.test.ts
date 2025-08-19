// Integration tests for encryption/decryption cycle
// Tests the complete encrypt -> decrypt workflow

import { assertEquals, assertExists, assert } from 'https://deno.land/std@0.168.0/testing/asserts.ts';

// Mock environment variables for testing
Deno.env.set('SUPABASE_URL', 'https://test.supabase.co');
Deno.env.set('SUPABASE_ANON_KEY', 'test-anon-key');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');
Deno.env.set('ENCRYPTION_KEY', 'test-encryption-key-with-sufficient-length-for-security-testing');

// Mock Supabase auth for testing
const mockSupabaseAuth = {
  getUser: (token: string) => {
    if (token === 'valid-token') {
      return Promise.resolve({
        data: { user: { id: 'test-user-id', email: 'test@example.com' } },
        error: null
      });
    }
    return Promise.resolve({
      data: { user: null },
      error: { message: 'Invalid JWT' }
    });
  }
};

// Import handlers
const encryptHandler = (await import('../encrypt-api-key/index.ts')).default;
const decryptHandler = (await import('../decrypt-api-key/index.ts')).default;

/**
 * Helper function to create test requests
 */
function createEncryptRequest(apiKey: string): Request {
  return new Request('http://localhost:8000/encrypt-api-key', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ api_key: apiKey })
  });
}

function createDecryptRequest(encryptedKey: string, token: string = 'valid-token'): Request {
  return new Request('http://localhost:8000/decrypt-api-key', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ encrypted_key: encryptedKey })
  });
}

/**
 * Helper function to parse response
 */
async function parseResponse(response: Response) {
  const text = await response.text();
  return JSON.parse(text);
}

Deno.test('encryption-integration - full encrypt/decrypt cycle', async () => {
  const originalApiKey = 'AIzaSyDxVlAabc123def456ghi789jkl012mno345';

  // Step 1: Encrypt the API key
  const encryptRequest = createEncryptRequest(originalApiKey);
  const encryptResponse = await encryptHandler(encryptRequest);
  const encryptData = await parseResponse(encryptResponse);

  assertEquals(encryptResponse.status, 200);
  assertEquals(encryptData.success, true);
  assertExists(encryptData.data.encrypted_key);

  const encryptedKey = encryptData.data.encrypted_key;

  // Step 2: Decrypt the encrypted key
  const decryptRequest = createDecryptRequest(encryptedKey);
  const decryptResponse = await decryptHandler(decryptRequest);
  const decryptData = await parseResponse(decryptResponse);

  assertEquals(decryptResponse.status, 200);
  assertEquals(decryptData.success, true);
  assertExists(decryptData.data.api_key);

  // Step 3: Verify the decrypted key matches the original
  assertEquals(decryptData.data.api_key, originalApiKey);
});

Deno.test('encryption-integration - multiple keys same result', async () => {
  const apiKey = 'AIzaSyDxVlAabc123def456ghi789jkl012mno345';

  // Encrypt the same key multiple times
  const results = [];
  for (let i = 0; i < 3; i++) {
    const encryptRequest = createEncryptRequest(apiKey);
    const encryptResponse = await encryptHandler(encryptRequest);
    const encryptData = await parseResponse(encryptResponse);
    
    assertEquals(encryptResponse.status, 200);
    results.push(encryptData.data.encrypted_key);
  }

  // All encrypted results should be different (due to random IV)
  assert(results[0] !== results[1]);
  assert(results[1] !== results[2]);
  assert(results[0] !== results[2]);

  // But all should decrypt to the same original key
  for (const encryptedKey of results) {
    const decryptRequest = createDecryptRequest(encryptedKey);
    const decryptResponse = await decryptHandler(decryptRequest);
    const decryptData = await parseResponse(decryptResponse);

    assertEquals(decryptResponse.status, 200);
    assertEquals(decryptData.data.api_key, apiKey);
  }
});

Deno.test('encryption-integration - different keys different results', async () => {
  const apiKeys = [
    'AIzaSyDxVlAabc123def456ghi789jkl012mno345',
    'AIzaBCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-',
    'AIzaA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R'
  ];

  const encryptedKeys = [];

  // Encrypt all keys
  for (const apiKey of apiKeys) {
    const encryptRequest = createEncryptRequest(apiKey);
    const encryptResponse = await encryptHandler(encryptRequest);
    const encryptData = await parseResponse(encryptResponse);

    assertEquals(encryptResponse.status, 200);
    encryptedKeys.push({
      original: apiKey,
      encrypted: encryptData.data.encrypted_key
    });
  }

  // All encrypted keys should be different
  for (let i = 0; i < encryptedKeys.length; i++) {
    for (let j = i + 1; j < encryptedKeys.length; j++) {
      assert(encryptedKeys[i].encrypted !== encryptedKeys[j].encrypted);
    }
  }

  // Each should decrypt back to its original
  for (const { original, encrypted } of encryptedKeys) {
    const decryptRequest = createDecryptRequest(encrypted);
    const decryptResponse = await decryptHandler(decryptRequest);
    const decryptData = await parseResponse(decryptResponse);

    assertEquals(decryptResponse.status, 200);
    assertEquals(decryptData.data.api_key, original);
  }
});

Deno.test('encryption-integration - tampered encrypted key fails', async () => {
  const originalApiKey = 'AIzaSyDxVlAabc123def456ghi789jkl012mno345';

  // Encrypt the API key
  const encryptRequest = createEncryptRequest(originalApiKey);
  const encryptResponse = await encryptHandler(encryptRequest);
  const encryptData = await parseResponse(encryptResponse);

  assertEquals(encryptResponse.status, 200);
  const encryptedKey = encryptData.data.encrypted_key;

  // Tamper with the encrypted key
  const tamperedKey = encryptedKey.slice(0, -5) + 'XXXXX';

  // Try to decrypt the tampered key
  const decryptRequest = createDecryptRequest(tamperedKey);
  const decryptResponse = await decryptHandler(decryptRequest);
  const decryptData = await parseResponse(decryptResponse);

  // Should fail with decryption error
  assert(decryptResponse.status >= 400);
  assertEquals(decryptData.success, false);
  assert(['DECRYPTION_ERROR', 'INVALID_PARAMETER'].includes(decryptData.error.code));
});

Deno.test('encryption-integration - cross-contamination test', async () => {
  const apiKey1 = 'AIzaSyDxVlAabc123def456ghi789jkl012mno345';
  const apiKey2 = 'AIzaBCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-';

  // Encrypt both keys
  const encrypt1 = await encryptHandler(createEncryptRequest(apiKey1));
  const encrypt2 = await encryptHandler(createEncryptRequest(apiKey2));

  const encryptData1 = await parseResponse(encrypt1);
  const encryptData2 = await parseResponse(encrypt2);

  const encryptedKey1 = encryptData1.data.encrypted_key;
  const encryptedKey2 = encryptData2.data.encrypted_key;

  // Decrypt key1 with key2's encrypted data should fail or return wrong result
  const decryptWrong = await decryptHandler(createDecryptRequest(encryptedKey2));
  const decryptWrongData = await parseResponse(decryptWrong);

  if (decryptWrong.status === 200) {
    // If decryption succeeds, it should return key2, not key1
    assert(decryptWrongData.data.api_key !== apiKey1);
    assertEquals(decryptWrongData.data.api_key, apiKey2);
  }

  // Correct decryption should work
  const decryptCorrect = await decryptHandler(createDecryptRequest(encryptedKey1));
  const decryptCorrectData = await parseResponse(decryptCorrect);

  assertEquals(decryptCorrect.status, 200);
  assertEquals(decryptCorrectData.data.api_key, apiKey1);
});

Deno.test('encryption-integration - performance test', async () => {
  const apiKey = 'AIzaSyDxVlAabc123def456ghi789jkl012mno345';
  const iterations = 10;

  const startTime = Date.now();

  // Perform multiple encrypt/decrypt cycles
  for (let i = 0; i < iterations; i++) {
    const encryptRequest = createEncryptRequest(apiKey);
    const encryptResponse = await encryptHandler(encryptRequest);
    const encryptData = await parseResponse(encryptResponse);

    assertEquals(encryptResponse.status, 200);

    const decryptRequest = createDecryptRequest(encryptData.data.encrypted_key);
    const decryptResponse = await decryptHandler(decryptRequest);
    const decryptData = await parseResponse(decryptResponse);

    assertEquals(decryptResponse.status, 200);
    assertEquals(decryptData.data.api_key, apiKey);
  }

  const endTime = Date.now();
  const totalTime = endTime - startTime;
  const avgTime = totalTime / iterations;

  console.log(`Average encrypt/decrypt cycle time: ${avgTime}ms`);
  
  // Performance should be reasonable (less than 1 second per cycle)
  assert(avgTime < 1000, `Performance too slow: ${avgTime}ms per cycle`);
});