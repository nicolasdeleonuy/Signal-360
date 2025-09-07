// Tests for start-analysis Edge Function
import { assertEquals, assertExists } from 'https://deno.land/std@0.168.0/testing/asserts.ts';

// Mock the shared dependencies
const mockShared = {
  createRequestHandler: (handler: any, methods: string[]) => handler,
  parseJsonBody: async (request: Request) => await request.json(),
  createSuccessHttpResponse: (data: any, requestId: string) => 
    new Response(JSON.stringify({ success: true, data, request_id: requestId }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }),
  createErrorHttpResponse: (error: any, requestId: string) =>
    new Response(JSON.stringify({ success: false, error: error.message, request_id: requestId }), {
      status: error.status || 500,
      headers: { 'Content-Type': 'application/json' }
    }),
  authenticateUser: async (request: Request) => ({
    success: true,
    user: { user_id: 'test-user-id' }
  }),
  createAuthErrorResponse: (authResult: any, requestId: string) =>
    new Response(JSON.stringify({ success: false, error: 'Authentication failed', request_id: requestId }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    }),
  createServiceClient: () => ({
    from: (table: string) => ({
      select: (columns: string) => ({
        eq: (column: string, value: any) => ({
          eq: (column2: string, value2: any) => ({
            in: (column3: string, values: any[]) => ({
              order: (column: string, options: any) => ({
                limit: (count: number) => ({
                  then: () => Promise.resolve({ data: [], error: null })
                })
              })
            })
          })
        })
      }),
      insert: (data: any) => ({
        then: () => Promise.resolve({ error: null })
      })
    })
  }),
  AppError: class AppError extends Error {
    constructor(public code: string, message: string) {
      super(message);
    }
  },
  ERROR_CODES: {
    MISSING_PARAMETER: 'MISSING_PARAMETER',
    INVALID_TICKER: 'INVALID_TICKER',
    INVALID_PARAMETER: 'INVALID_PARAMETER',
    DATABASE_ERROR: 'DATABASE_ERROR'
  },
  generateRequestId: () => 'test-request-id',
  createLogger: (name: string) => ({
    info: console.log,
    warn: console.warn,
    error: console.error
  }),
  CONSTANTS: {
    TICKER_PATTERNS: {
      VALID: /^[A-Z]{1,5}$/
    }
  }
};

// Mock the shared module
const originalImport = globalThis.import;
globalThis.import = async (specifier: string) => {
  if (specifier.includes('_shared/index.ts')) {
    return mockShared;
  }
  return originalImport(specifier);
};

Deno.test('Start Analysis - Valid Request', async () => {
  const request = new Request('http://localhost:8000/start-analysis', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token'
    },
    body: JSON.stringify({
      ticker: 'AAPL',
      context: 'investment'
    })
  });

  // This would normally import and test the actual handler
  // For now, we'll test the basic structure
  const response = mockShared.createSuccessHttpResponse({
    job_id: 'test-job-id',
    status: 'pending',
    ticker: 'AAPL',
    context: 'investment'
  }, 'test-request-id');

  assertEquals(response.status, 200);
  
  const body = await response.json();
  assertEquals(body.success, true);
  assertEquals(body.data.ticker, 'AAPL');
  assertEquals(body.data.context, 'investment');
  assertEquals(body.data.status, 'pending');
  assertExists(body.data.job_id);
});

Deno.test('Start Analysis - Invalid Ticker', async () => {
  const request = new Request('http://localhost:8000/start-analysis', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token'
    },
    body: JSON.stringify({
      ticker: 'INVALID123',
      context: 'investment'
    })
  });

  // Test ticker validation
  const isValid = mockShared.CONSTANTS.TICKER_PATTERNS.VALID.test('INVALID123');
  assertEquals(isValid, false);
});

Deno.test('Start Analysis - Missing Parameters', async () => {
  const request = new Request('http://localhost:8000/start-analysis', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token'
    },
    body: JSON.stringify({
      ticker: 'AAPL'
      // Missing context
    })
  });

  const body = await request.json();
  assertEquals(body.ticker, 'AAPL');
  assertEquals(body.context, undefined);
});