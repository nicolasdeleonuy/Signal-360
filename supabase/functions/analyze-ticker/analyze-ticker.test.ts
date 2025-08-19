// Unit tests for analyze-ticker Edge Function (Main Orchestrator)
// Tests complete analysis workflow, authentication, and error handling

import { assertEquals, assertExists, assert } from 'https://deno.land/std@0.168.0/testing/asserts.ts';

// Mock environment variables for testing
Deno.env.set('SUPABASE_URL', 'https://test.supabase.co');
Deno.env.set('SUPABASE_ANON_KEY', 'test-anon-key');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');
Deno.env.set('ENCRYPTION_KEY', 'test-encryption-key-with-sufficient-length-for-security');
Deno.env.set('EXTERNAL_API_TIMEOUT', '30000');

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

// Mock Supabase functions for testing
const mockSupabaseFunctions = {
  invoke: async (functionName: string, options: any) => {
    const { body } = options;
    
    switch (functionName) {
      case 'decrypt-api-key':
        if (body.encrypted_key === 'valid-encrypted-key') {
          return {
            data: { api_key: 'AIzaSyDxVlAabc123def456ghi789jkl012mno345' },
            error: null
          };
        }
        return { data: null, error: { message: 'Decryption failed' } };
        
      case 'fundamental-analysis':
        if (body.ticker_symbol === 'ERROR') {
          return { data: null, error: { message: 'Fundamental analysis failed' } };
        }
        return {
          data: {
            score: 75,
            factors: [
              {
                category: 'fundamental',
                type: 'positive',
                description: 'Strong revenue growth',
                weight: 0.8,
                confidence: 0.9
              }
            ],
            details: {
              financial_ratios: { roe: 25.3 },
              growth_metrics: { revenue_growth: 8.5 },
              valuation_metrics: { pe_ratio: 25.5 },
              quality_indicators: { debt_service_coverage: 15.2 }
            },
            confidence: 0.85
          },
          error: null
        };
        
      case 'technical-analysis':
        if (body.ticker_symbol === 'ERROR') {
          return { data: null, error: { message: 'Technical analysis failed' } };
        }
        return {
          data: {
            score: 68,
            factors: [
              {
                category: 'technical',
                type: 'positive',
                description: 'Price above moving averages',
                weight: 0.9,
                confidence: 0.8
              }
            ],
            details: {
              trend_indicators: { sma_20: 152.45 },
              momentum_indicators: { rsi: 65.2 },
              volume_indicators: { volume_ratio: 1.35 },
              support_resistance: { support_levels: [148.50], resistance_levels: [156.80] }
            },
            confidence: 0.82
          },
          error: null
        };
        
      case 'esg-analysis':
        if (body.ticker_symbol === 'ERROR') {
          return { data: null, error: { message: 'ESG analysis failed' } };
        }
        return {
          data: {
            score: 78,
            factors: [
              {
                category: 'esg',
                type: 'positive',
                description: 'Strong ESG rating',
                weight: 0.7,
                confidence: 0.8
              }
            ],
            details: {
              environmental_score: 78,
              social_score: 72,
              governance_score: 75,
              sustainability_metrics: {
                sustainability_reporting: 100,
                climate_commitments: 100,
                stakeholder_engagement: 68,
                sustainability_innovation: 72,
                regulatory_compliance: 85,
                environmental_controversies: 1,
                social_controversies: 0,
                governance_controversies: 0
              }
            },
            confidence: 0.85
          },
          error: null
        };
        
      case 'synthesis-engine':
        if (body.ticker_symbol === 'ERROR') {
          return { data: null, error: { message: 'Synthesis failed' } };
        }
        return {
          data: {
            synthesis_score: 73,
            convergence_factors: [
              {
                category: 'convergence',
                description: 'Strong positive signals across all analyses',
                weight: 0.9,
                supporting_analyses: ['fundamental', 'technical', 'esg']
              }
            ],
            divergence_factors: [],
            full_report: {
              summary: 'AAPL receives a synthesis score of 73/100 for investment',
              recommendation: 'buy',
              fundamental: body.fundamental_result,
              technical: body.technical_result,
              esg: body.esg_result,
              synthesis_methodology: 'Weighted synthesis approach',
              limitations: ['Analysis reflects point-in-time data'],
              metadata: {
                analysis_timestamp: new Date().toISOString(),
                data_sources: ['fundamental-analysis', 'technical-analysis', 'esg-analysis'],
                api_version: '1.0.0'
              }
            },
            confidence: 0.84
          },
          error: null
        };
        
      default:
        return { data: null, error: { message: 'Unknown function' } };
    }
  }
};

// Mock database operations
const mockDatabase = {
  getEncryptedApiKey: async (userId: string) => {
    if (userId === 'test-user-id') {
      return 'valid-encrypted-key';
    } else if (userId === 'no-api-key-user') {
      return null;
    }
    return 'valid-encrypted-key';
  },
  createAnalysis: async (userId: string, data: any) => {
    return {
      id: 123,
      user_id: userId,
      created_at: new Date().toISOString(),
      ...data
    };
  },
  hasReachedAnalysisLimit: async (userId: string) => {
    return userId === 'rate-limited-user';
  }
};

// Mock the Supabase client
const mockCreateClient = () => ({
  auth: mockSupabaseAuth,
  functions: mockSupabaseFunctions
});

// Mock the DatabaseService
class MockDatabaseService {
  async getEncryptedApiKey(userId: string) {
    return mockDatabase.getEncryptedApiKey(userId);
  }
  
  async createAnalysis(userId: string, data: any) {
    return mockDatabase.createAnalysis(userId, data);
  }
  
  async hasReachedAnalysisLimit(userId: string) {
    return mockDatabase.hasReachedAnalysisLimit(userId);
  }
}

// Replace imports with mocks
globalThis.require = (module: string) => {
  if (module.includes('@supabase/supabase-js')) {
    return { createClient: mockCreateClient };
  }
  return {};
};

// Import the handler after setting up mocks
const { default: handler } = await import('./index.ts');

/**
 * Helper function to create test requests
 */
function createTestRequest(body: any, token: string = 'valid-token', method: string = 'POST'): Request {
  return new Request('http://localhost:8000/analyze-ticker', {
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

Deno.test('analyze-ticker - successful complete analysis for investment', async () => {
  const request = createTestRequest({
    ticker_symbol: 'AAPL',
    analysis_context: 'investment'
  });

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 200);
  assertEquals(data.success, true);
  assertExists(data.data);
  
  const result = data.data;
  assert(typeof result.analysis_id === 'number');
  assertEquals(result.ticker_symbol, 'AAPL');
  assert(typeof result.synthesis_score === 'number');
  assert(result.synthesis_score >= 0 && result.synthesis_score <= 100);
  assert(Array.isArray(result.convergence_factors));
  assert(Array.isArray(result.divergence_factors));
  assertExists(result.full_report);
  
  // Check full report structure
  assertExists(result.full_report.summary);
  assertExists(result.full_report.recommendation);
  assertExists(result.full_report.fundamental);
  assertExists(result.full_report.technical);
  assertExists(result.full_report.esg);
});

Deno.test('analyze-ticker - successful complete analysis for trading', async () => {
  const request = createTestRequest({
    ticker_symbol: 'AAPL',
    analysis_context: 'trading',
    trading_timeframe: '1D'
  });

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 200);
  assertEquals(data.success, true);
  
  const result = data.data;
  assertEquals(result.ticker_symbol, 'AAPL');
  assert(typeof result.synthesis_score === 'number');
  assertExists(result.full_report);
});

Deno.test('analyze-ticker - missing authorization header', async () => {
  const request = new Request('http://localhost:8000/analyze-ticker', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      ticker_symbol: 'AAPL',
      analysis_context: 'investment'
    })
  });

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 401);
  assertEquals(data.success, false);
  assertEquals(data.error.code, 'MISSING_TOKEN');
});

Deno.test('analyze-ticker - invalid authorization token', async () => {
  const request = createTestRequest({
    ticker_symbol: 'AAPL',
    analysis_context: 'investment'
  }, 'invalid-token');

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 403);
  assertEquals(data.success, false);
  assertEquals(data.error.code, 'INVALID_TOKEN');
});

Deno.test('analyze-ticker - missing ticker symbol', async () => {
  const request = createTestRequest({
    analysis_context: 'investment'
  });

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 400);
  assertEquals(data.success, false);
  assertEquals(data.error.code, 'INVALID_REQUEST');
  assert(data.error.message.includes('ticker_symbol'));
});

Deno.test('analyze-ticker - missing analysis context', async () => {
  const request = createTestRequest({
    ticker_symbol: 'AAPL'
  });

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 400);
  assertEquals(data.success, false);
  assertEquals(data.error.code, 'INVALID_REQUEST');
  assert(data.error.message.includes('analysis_context'));
});

Deno.test('analyze-ticker - invalid ticker format', async () => {
  const request = createTestRequest({
    ticker_symbol: 'invalid-ticker',
    analysis_context: 'investment'
  });

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 400);
  assertEquals(data.success, false);
  assertEquals(data.error.code, 'INVALID_REQUEST');
});

Deno.test('analyze-ticker - invalid analysis context', async () => {
  const request = createTestRequest({
    ticker_symbol: 'AAPL',
    analysis_context: 'invalid'
  });

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 400);
  assertEquals(data.success, false);
  assertEquals(data.error.code, 'INVALID_REQUEST');
});

Deno.test('analyze-ticker - user without API key', async () => {
  // Mock user without API key
  mockDatabase.getEncryptedApiKey = async (userId: string) => {
    return null;
  };

  const request = createTestRequest({
    ticker_symbol: 'AAPL',
    analysis_context: 'investment'
  });

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 403);
  assertEquals(data.success, false);
  assertEquals(data.error.code, 'MISSING_API_KEY');
  assert(data.error.message.includes('Google API key'));

  // Restore mock
  mockDatabase.getEncryptedApiKey = async (userId: string) => {
    return userId === 'test-user-id' ? 'valid-encrypted-key' : null;
  };
});

Deno.test('analyze-ticker - rate limited user', async () => {
  // Create request with rate-limited user
  const mockAuth = {
    getUser: (token: string) => {
      if (token === 'rate-limited-token') {
        return Promise.resolve({
          data: { user: { id: 'rate-limited-user', email: 'test@example.com' } },
          error: null
        });
      }
      return mockSupabaseAuth.getUser(token);
    }
  };

  // Temporarily replace auth mock
  const originalAuth = mockSupabaseAuth.getUser;
  (mockSupabaseAuth as any).getUser = mockAuth.getUser;

  const request = createTestRequest({
    ticker_symbol: 'AAPL',
    analysis_context: 'investment'
  }, 'rate-limited-token');

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 429);
  assertEquals(data.success, false);
  assertEquals(data.error.code, 'RATE_LIMIT_EXCEEDED');

  // Restore original auth mock
  (mockSupabaseAuth as any).getUser = originalAuth;
});

Deno.test('analyze-ticker - analysis module failure', async () => {
  const request = createTestRequest({
    ticker_symbol: 'ERROR', // This will trigger errors in mock functions
    analysis_context: 'investment'
  });

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 500);
  assertEquals(data.success, false);
  assertEquals(data.error.code, 'PROCESSING_ERROR');
});

Deno.test('analyze-ticker - method not allowed', async () => {
  const request = createTestRequest({
    ticker_symbol: 'AAPL',
    analysis_context: 'investment'
  }, 'valid-token', 'GET');

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 405);
  assertEquals(data.success, false);
  assertEquals(data.error.code, 'METHOD_NOT_ALLOWED');
});

Deno.test('analyze-ticker - CORS preflight', async () => {
  const request = new Request('http://localhost:8000/analyze-ticker', {
    method: 'OPTIONS'
  });

  const response = await handler(request);

  assertEquals(response.status, 200);
  assertEquals(response.headers.get('Access-Control-Allow-Origin'), '*');
  assertEquals(response.headers.get('Access-Control-Allow-Methods'), 'POST, GET, OPTIONS');
});

Deno.test('analyze-ticker - invalid JSON', async () => {
  const request = new Request('http://localhost:8000/analyze-ticker', {
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

Deno.test('analyze-ticker - various valid tickers', async () => {
  const validTickers = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'AMZN'];

  for (const ticker of validTickers) {
    const request = createTestRequest({
      ticker_symbol: ticker,
      analysis_context: 'investment'
    });

    const response = await handler(request);
    const data = await parseResponse(response);

    assertEquals(response.status, 200, `Failed for ticker: ${ticker}`);
    assertEquals(data.success, true);
    assertEquals(data.data.ticker_symbol, ticker);
  }
});

Deno.test('analyze-ticker - various trading timeframes', async () => {
  const timeframes = ['1D', '1W', '1M', '3M', '6M', '1Y'];

  for (const timeframe of timeframes) {
    const request = createTestRequest({
      ticker_symbol: 'AAPL',
      analysis_context: 'trading',
      trading_timeframe: timeframe
    });

    const response = await handler(request);
    const data = await parseResponse(response);

    assertEquals(response.status, 200, `Failed for timeframe: ${timeframe}`);
    assertEquals(data.success, true);
    assertExists(data.data);
  }
});

Deno.test('analyze-ticker - response structure validation', async () => {
  const request = createTestRequest({
    ticker_symbol: 'AAPL',
    analysis_context: 'investment'
  });

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 200);
  assertEquals(data.success, true);
  assertExists(data.data);
  assertExists(data.request_id);
  assertExists(data.timestamp);
  
  // Validate response headers
  assertEquals(response.headers.get('Content-Type'), 'application/json');
  assertEquals(response.headers.get('Access-Control-Allow-Origin'), '*');
  
  // Validate data structure matches AnalysisResponse
  const result = data.data;
  assert(typeof result.analysis_id === 'number');
  assert(typeof result.ticker_symbol === 'string');
  assert(typeof result.synthesis_score === 'number');
  assert(Array.isArray(result.convergence_factors));
  assert(Array.isArray(result.divergence_factors));
  assertExists(result.full_report);
});

Deno.test('analyze-ticker - concurrent analysis execution', async () => {
  // This test verifies that the orchestrator can handle the workflow
  // The actual concurrency is mocked, but we verify the structure
  const request = createTestRequest({
    ticker_symbol: 'AAPL',
    analysis_context: 'investment'
  });

  const startTime = Date.now();
  const response = await handler(request);
  const endTime = Date.now();
  const data = await parseResponse(response);

  assertEquals(response.status, 200);
  assertEquals(data.success, true);
  
  // Verify that all analysis components are present in the response
  const fullReport = data.data.full_report;
  assertExists(fullReport.fundamental);
  assertExists(fullReport.technical);
  assertExists(fullReport.esg);
  
  // Verify the response was reasonably fast (mocked functions should be quick)
  const executionTime = endTime - startTime;
  assert(executionTime < 5000, `Execution took too long: ${executionTime}ms`);
});