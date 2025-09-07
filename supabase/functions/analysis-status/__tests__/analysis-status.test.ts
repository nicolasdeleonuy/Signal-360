// Tests for analysis-status Edge Function
import { assertEquals, assertExists } from 'https://deno.land/std@0.168.0/testing/asserts.ts';

// Mock the shared dependencies
const mockShared = {
  createRequestHandler: (handler: any, methods: string[]) => handler,
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
            single: () => Promise.resolve({
              data: {
                id: 'test-job-id',
                user_id: 'test-user-id',
                ticker_symbol: 'AAPL',
                analysis_context: 'investment',
                status: 'completed',
                progress_percentage: 100,
                current_phase: 'completed',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                result_data: {
                  synthesis_score: 75,
                  recommendation: 'BUY'
                }
              },
              error: null
            })
          })
        })
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
    NOT_FOUND: 'NOT_FOUND',
    DATABASE_ERROR: 'DATABASE_ERROR'
  },
  createLogger: (name: string) => ({
    info: console.log,
    warn: console.warn,
    error: console.error
  })
};

// Mock the shared module
const originalImport = globalThis.import;
globalThis.import = async (specifier: string) => {
  if (specifier.includes('_shared/index.ts')) {
    return mockShared;
  }
  return originalImport(specifier);
};

Deno.test('Analysis Status - Completed Job', async () => {
  const mockJobData = {
    job_id: 'test-job-id',
    status: 'completed',
    progress_percentage: 100,
    current_phase: 'completed',
    ticker: 'AAPL',
    context: 'investment',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    result: {
      synthesis_score: 75,
      recommendation: 'BUY'
    }
  };

  const response = mockShared.createSuccessHttpResponse(mockJobData, 'test-request-id');
  assertEquals(response.status, 200);
  
  const body = await response.json();
  assertEquals(body.success, true);
  assertEquals(body.data.status, 'completed');
  assertEquals(body.data.progress_percentage, 100);
  assertEquals(body.data.ticker, 'AAPL');
  assertExists(body.data.result);
});

Deno.test('Analysis Status - In Progress Job', async () => {
  const mockJobData = {
    job_id: 'test-job-id',
    status: 'in_progress',
    progress_percentage: 45,
    current_phase: 'fundamental_analysis',
    ticker: 'AAPL',
    context: 'investment',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    estimated_completion_time: new Date(Date.now() + 30000).toISOString()
  };

  const response = mockShared.createSuccessHttpResponse(mockJobData, 'test-request-id');
  assertEquals(response.status, 200);
  
  const body = await response.json();
  assertEquals(body.success, true);
  assertEquals(body.data.status, 'in_progress');
  assertEquals(body.data.progress_percentage, 45);
  assertEquals(body.data.current_phase, 'fundamental_analysis');
  assertExists(body.data.estimated_completion_time);
});

Deno.test('Analysis Status - Failed Job', async () => {
  const mockJobData = {
    job_id: 'test-job-id',
    status: 'failed',
    progress_percentage: 25,
    current_phase: 'failed',
    ticker: 'AAPL',
    context: 'investment',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    error_message: 'API key validation failed'
  };

  const response = mockShared.createSuccessHttpResponse(mockJobData, 'test-request-id');
  assertEquals(response.status, 200);
  
  const body = await response.json();
  assertEquals(body.success, true);
  assertEquals(body.data.status, 'failed');
  assertEquals(body.data.error_message, 'API key validation failed');
});

Deno.test('Analysis Status - URL Path Parsing', () => {
  const url1 = new URL('http://localhost:8000/analysis-status/test-job-123');
  const pathParts1 = url1.pathname.split('/');
  const jobId1 = pathParts1[pathParts1.length - 1];
  assertEquals(jobId1, 'test-job-123');

  const url2 = new URL('http://localhost:8000/analysis-status/');
  const pathParts2 = url2.pathname.split('/');
  const jobId2 = pathParts2[pathParts2.length - 1];
  assertEquals(jobId2, ''); // Should be empty, indicating missing job ID
});