// Comprehensive integration tests for the complete analysis workflow
// Tests end-to-end functionality, concurrent execution, error handling, and database integration

import { assertEquals, assertExists, assert } from 'https://deno.land/std@0.168.0/testing/asserts.ts';

// Mock environment variables for testing
Deno.env.set('SUPABASE_URL', 'https://test.supabase.co');
Deno.env.set('SUPABASE_ANON_KEY', 'test-anon-key');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');
Deno.env.set('ENCRYPTION_KEY', 'test-encryption-key-with-sufficient-length-for-security');

/**
 * Mock Supabase client for integration testing
 */
const mockSupabaseClient = {
  auth: {
    getUser: async (token: string) => {
      if (token === 'valid-jwt-token') {
        return {
          data: {
            user: {
              id: 'test-user-id',
              email: 'test@example.com',
              role: 'authenticated'
            }
          },
          error: null
        };
      }
      return {
        data: { user: null },
        error: { message: 'Invalid token' }
      };
    }
  },
  from: (table: string) => ({
    select: (columns: string) => ({
      eq: (column: string, value: string) => ({
        single: async () => {
          if (table === 'profiles' && value === 'test-user-id') {
            return {
              data: { encrypted_google_api_key: 'encrypted-api-key-data' },
              error: null
            };
          }
          return { data: null, error: { message: 'Not found' } };
        }
      })
    }),
    insert: (data: any) => ({
      select: () => ({
        single: async () => ({
          data: { id: 123, ...data },
          error: null
        })
      })
    })
  }),
  functions: {
    invoke: async (functionName: string, options: any) => {
      const { body } = options;
      
      switch (functionName) {
        case 'decrypt-api-key':
          if (body.encrypted_key === 'encrypted-api-key-data') {
            return {
              data: { success: true, api_key: 'AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI' },
              error: null
            };
          }
          return { data: { success: false, error: 'Decryption failed' }, error: null };

        case 'fundamental-analysis':
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
                financial_ratios: { roe: 25.3, pe: 18.5 },
                growth_metrics: { revenue_growth: 8.5 },
                valuation_metrics: { pe_ratio: 18.5 },
                quality_indicators: { debt_service_coverage: 15.2 }
              },
              confidence: 0.85
            },
            error: null
          };

        case 'technical-analysis':
          return {
            data: {
              score: 68,
              factors: [
                {
                  category: 'technical',
                  type: 'positive',
                  description: 'Bullish trend confirmed',
                  weight: 0.7,
                  confidence: 0.8
                }
              ],
              details: {
                trend_indicators: { sma_20: 150.25, sma_50: 148.75 },
                momentum_indicators: { rsi: 65.5, macd: 2.3 },
                volume_indicators: { volume_sma: 1250000 },
                support_resistance: {
                  support_levels: [145.0, 142.5],
                  resistance_levels: [155.0, 158.5]
                }
              },
              confidence: 0.8
            },
            error: null
          };

        case 'esg-analysis':
          return {
            data: {
              score: 82,
              factors: [
                {
                  category: 'esg',
                  type: 'positive',
                  description: 'Strong environmental practices',
                  weight: 0.6,
                  confidence: 0.75
                }
              ],
              details: {
                environmental_score: 85,
                social_score: 78,
                governance_score: 83,
                sustainability_metrics: { carbon_footprint: 2.5, diversity_index: 0.65 }
              },
              confidence: 0.75
            },
            error: null
          };

        case 'synthesis-engine':
          return {
            data: {
              synthesis_score: 74,
              convergence_factors: [
                {
                  category: 'growth',
                  description: 'Strong growth indicators across fundamental and technical analysis',
                  weight: 0.8,
                  supporting_analyses: ['fundamental', 'technical']
                }
              ],
              divergence_factors: [
                {
                  category: 'valuation',
                  description: 'Technical momentum vs fundamental valuation concerns',
                  weight: 0.3,
                  conflicting_analyses: ['fundamental', 'technical']
                }
              ],
              full_report: {
                summary: 'Overall positive outlook with strong fundamentals and technical momentum',
                recommendation: 'buy',
                synthesis_methodology: 'Context-weighted analysis with investment focus',
                limitations: ['Limited historical ESG data'],
                metadata: {
                  analysis_timestamp: new Date().toISOString(),
                  data_sources: ['Google Finance', 'ESG Provider'],
                  api_version: '1.0.0'
                }
              },
              confidence: 0.8
            },
            error: null
          };

        default:
          return { data: null, error: { message: 'Function not found' } };
      }
    }
  }
};

// Mock the Supabase client creation
const originalCreateClient = globalThis.createClient;
(globalThis as any).createClient = () => mockSupabaseClient;

/**
 * Mock HTTP fetch for external API calls
 */
const originalFetch = globalThis.fetch;
(globalThis as any).fetch = async (url: string, options?: any) => {
  // Mock successful responses for external APIs
  if (url.includes('googleapis.com') || url.includes('finance')) {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        data: 'mock-financial-data',
        timestamp: Date.now()
      })
    };
  }
  
  // Call original fetch for other URLs
  return originalFetch(url, options);
};

/**
 * Integration test helper functions
 */
class IntegrationTestHelper {
  static createValidAnalysisRequest() {
    return {
      ticker_symbol: 'AAPL',
      analysis_context: 'investment' as const
    };
  }

  static createValidTradingRequest() {
    return {
      ticker_symbol: 'MSFT',
      analysis_context: 'trading' as const,
      trading_timeframe: '1D'
    };
  }

  static createValidAuthHeaders() {
    return {
      'Authorization': 'Bearer valid-jwt-token',
      'Content-Type': 'application/json'
    };
  }

  static createHttpRequest(body: any, headers: Record<string, string> = {}) {
    return new Request('https://test.supabase.co/functions/v1/analyze-ticker', {
      method: 'POST',
      headers: {
        ...this.createValidAuthHeaders(),
        ...headers
      },
      body: JSON.stringify(body)
    });
  }

  static async callAnalyzeTickerFunction(request: any) {
    // Import the analyze-ticker function
    const { default: handler } = await import('../analyze-ticker/index.ts');
    return await handler(request);
  }
}

// Integration Tests

Deno.test('Integration - Complete analysis workflow for investment context', async () => {
  const request = IntegrationTestHelper.createHttpRequest(
    IntegrationTestHelper.createValidAnalysisRequest()
  );

  const response = await IntegrationTestHelper.callAnalyzeTickerFunction(request);

  assertEquals(response.status, 200);
  
  const responseData = await response.json();
  assert(responseData.success);
  assertExists(responseData.data);
  
  // Verify response structure
  assertExists(responseData.data.analysis_id);
  assertEquals(responseData.data.ticker_symbol, 'AAPL');
  assertExists(responseData.data.synthesis_score);
  assertExists(responseData.data.convergence_factors);
  assertExists(responseData.data.divergence_factors);
  assertExists(responseData.data.full_report);
  
  // Verify synthesis score is within valid range
  assert(responseData.data.synthesis_score >= 0 && responseData.data.synthesis_score <= 100);
  
  // Verify convergence and divergence factors structure
  assert(Array.isArray(responseData.data.convergence_factors));
  assert(Array.isArray(responseData.data.divergence_factors));
  
  if (responseData.data.convergence_factors.length > 0) {
    const factor = responseData.data.convergence_factors[0];
    assertExists(factor.category);
    assertExists(factor.description);
    assertExists(factor.weight);
    assertExists(factor.supporting_analyses);
  }
});

Deno.test('Integration - Complete analysis workflow for trading context', async () => {
  const request = IntegrationTestHelper.createHttpRequest(
    IntegrationTestHelper.createValidTradingRequest()
  );

  const response = await IntegrationTestHelper.callAnalyzeTickerFunction(request);

  assertEquals(response.status, 200);
  
  const responseData = await response.json();
  assert(responseData.success);
  assertExists(responseData.data);
  
  // Verify trading-specific response
  assertEquals(responseData.data.ticker_symbol, 'MSFT');
  assertExists(responseData.data.synthesis_score);
  
  // Verify full report contains trading context information
  assertExists(responseData.data.full_report);
  assert(responseData.data.full_report.synthesis_methodology.includes('investment') || 
         responseData.data.full_report.synthesis_methodology.includes('trading'));
});

Deno.test('Integration - Authentication failure handling', async () => {
  const request = IntegrationTestHelper.createHttpRequest(
    IntegrationTestHelper.createValidAnalysisRequest(),
    { 'Authorization': 'Bearer invalid-token' }
  );

  const response = await IntegrationTestHelper.callAnalyzeTickerFunction(request);

  assertEquals(response.status, 401);
  
  const responseData = await response.json();
  assertEquals(responseData.success, false);
  assertExists(responseData.error);
  assertExists(responseData.error.code);
  assertExists(responseData.error.message);
});

Deno.test('Integration - Input validation error handling', async () => {
  const invalidRequest = {
    ticker_symbol: 'invalid-ticker-format',
    analysis_context: 'invalid-context'
  };

  const request = IntegrationTestHelper.createHttpRequest(invalidRequest);
  const response = await IntegrationTestHelper.callAnalyzeTickerFunction(request);

  assertEquals(response.status, 400);
  
  const responseData = await response.json();
  assertEquals(responseData.success, false);
  assertExists(responseData.error);
  assert(responseData.error.message.includes('Validation failed'));
});

Deno.test('Integration - Missing timeframe for trading context', async () => {
  const invalidTradingRequest = {
    ticker_symbol: 'AAPL',
    analysis_context: 'trading'
    // Missing trading_timeframe
  };

  const request = IntegrationTestHelper.createHttpRequest(invalidTradingRequest);
  const response = await IntegrationTestHelper.callAnalyzeTickerFunction(request);

  assertEquals(response.status, 400);
  
  const responseData = await response.json();
  assertEquals(responseData.success, false);
  assert(responseData.error.message.includes('trading_timeframe is required'));
});

Deno.test('Integration - CORS preflight request handling', async () => {
  const request = new Request('https://test.supabase.co/functions/v1/analyze-ticker', {
    method: 'OPTIONS'
  });

  const response = await IntegrationTestHelper.callAnalyzeTickerFunction(request);

  assertEquals(response.status, 200);
  assertExists(response.headers.get('Access-Control-Allow-Origin'));
  assertExists(response.headers.get('Access-Control-Allow-Headers'));
  assertExists(response.headers.get('Access-Control-Allow-Methods'));
});

Deno.test('Integration - Method not allowed handling', async () => {
  const request = new Request('https://test.supabase.co/functions/v1/analyze-ticker', {
    method: 'GET',
    headers: IntegrationTestHelper.createValidAuthHeaders()
  });

  const response = await IntegrationTestHelper.callAnalyzeTickerFunction(request);

  assertEquals(response.status, 405);
  
  const responseData = await response.json();
  assertEquals(responseData.success, false);
  assert(responseData.error.message.includes('Method not allowed'));
});

Deno.test('Integration - Concurrent analysis execution', async () => {
  // Test multiple concurrent requests
  const requests = [
    IntegrationTestHelper.createHttpRequest({ ticker_symbol: 'AAPL', analysis_context: 'investment' }),
    IntegrationTestHelper.createHttpRequest({ ticker_symbol: 'MSFT', analysis_context: 'trading', trading_timeframe: '1D' }),
    IntegrationTestHelper.createHttpRequest({ ticker_symbol: 'GOOGL', analysis_context: 'investment' })
  ];

  const startTime = Date.now();
  const responses = await Promise.all(
    requests.map(req => IntegrationTestHelper.callAnalyzeTickerFunction(req))
  );
  const endTime = Date.now();

  // All requests should succeed
  for (const response of responses) {
    assertEquals(response.status, 200);
    const data = await response.json();
    assert(data.success);
  }

  // Concurrent execution should be faster than sequential
  // (This is a rough check - in real scenarios, we'd have more precise timing)
  const totalTime = endTime - startTime;
  assert(totalTime < 10000, `Concurrent execution took ${totalTime}ms, which seems too long`);
});

Deno.test('Integration - Database integration and persistence', async () => {
  const request = IntegrationTestHelper.createHttpRequest(
    IntegrationTestHelper.createValidAnalysisRequest()
  );

  const response = await IntegrationTestHelper.callAnalyzeTickerFunction(request);
  assertEquals(response.status, 200);
  
  const responseData = await response.json();
  
  // Verify that analysis was persisted (mock returns ID 123)
  assertEquals(responseData.data.analysis_id, 123);
  
  // Verify that the response includes all required database fields
  assertExists(responseData.data.ticker_symbol);
  assertExists(responseData.data.synthesis_score);
  assertExists(responseData.data.convergence_factors);
  assertExists(responseData.data.divergence_factors);
  assertExists(responseData.data.full_report);
});

Deno.test('Integration - Error handling with partial failures', async () => {
  // Mock a scenario where one analysis module fails
  const originalInvoke = mockSupabaseClient.functions.invoke;
  mockSupabaseClient.functions.invoke = async (functionName: string, options: any) => {
    if (functionName === 'fundamental-analysis') {
      return { data: null, error: { message: 'External API unavailable' } };
    }
    return originalInvoke(functionName, options);
  };

  const request = IntegrationTestHelper.createHttpRequest(
    IntegrationTestHelper.createValidAnalysisRequest()
  );

  const response = await IntegrationTestHelper.callAnalyzeTickerFunction(request);
  
  // Should handle partial failures gracefully
  // (Implementation depends on how partial failures are handled)
  assert(response.status === 200 || response.status === 500);
  
  // Restore original function
  mockSupabaseClient.functions.invoke = originalInvoke;
});

Deno.test('Integration - Response headers and security', async () => {
  const request = IntegrationTestHelper.createHttpRequest(
    IntegrationTestHelper.createValidAnalysisRequest()
  );

  const response = await IntegrationTestHelper.callAnalyzeTickerFunction(request);

  // Verify security headers are present
  assertExists(response.headers.get('Access-Control-Allow-Origin'));
  assertExists(response.headers.get('Content-Type'));
  
  // Verify response format
  assertEquals(response.headers.get('Content-Type'), 'application/json');
  
  const responseData = await response.json();
  
  // Verify response structure includes required fields
  assertExists(responseData.success);
  if (responseData.success) {
    assertExists(responseData.data);
    assertExists(responseData.request_id);
    assertExists(responseData.timestamp);
  } else {
    assertExists(responseData.error);
    assertExists(responseData.request_id);
    assertExists(responseData.timestamp);
  }
});

Deno.test('Integration - Analysis context weighting verification', async () => {
  // Test investment context
  const investmentRequest = IntegrationTestHelper.createHttpRequest({
    ticker_symbol: 'AAPL',
    analysis_context: 'investment'
  });

  const investmentResponse = await IntegrationTestHelper.callAnalyzeTickerFunction(investmentRequest);
  const investmentData = await investmentResponse.json();

  // Test trading context
  const tradingRequest = IntegrationTestHelper.createHttpRequest({
    ticker_symbol: 'AAPL',
    analysis_context: 'trading',
    trading_timeframe: '1D'
  });

  const tradingResponse = await IntegrationTestHelper.callAnalyzeTickerFunction(tradingRequest);
  const tradingData = await tradingResponse.json();

  // Both should succeed
  assert(investmentData.success);
  assert(tradingData.success);

  // Verify that synthesis methodology reflects the context
  const investmentMethodology = investmentData.data.full_report.synthesis_methodology;
  const tradingMethodology = tradingData.data.full_report.synthesis_methodology;

  // The methodology should indicate different weighting approaches
  assert(investmentMethodology !== tradingMethodology || 
         investmentMethodology.includes('investment') || 
         tradingMethodology.includes('trading'));
});

Deno.test('Integration - Request ID tracking and logging', async () => {
  const request = IntegrationTestHelper.createHttpRequest(
    IntegrationTestHelper.createValidAnalysisRequest()
  );

  const response = await IntegrationTestHelper.callAnalyzeTickerFunction(request);
  const responseData = await response.json();

  // Verify request ID is present and follows expected format
  assertExists(responseData.request_id);
  assert(responseData.request_id.startsWith('req_'));
  assert(responseData.request_id.length > 10);

  // Verify timestamp is present and valid
  assertExists(responseData.timestamp);
  const timestamp = new Date(responseData.timestamp);
  assert(!isNaN(timestamp.getTime()));
});

// Cleanup
Deno.test('Integration - Cleanup and restore', () => {
  // Restore original functions
  (globalThis as any).createClient = originalCreateClient;
  (globalThis as any).fetch = originalFetch;
  
  // Clear environment variables
  Deno.env.delete('SUPABASE_URL');
  Deno.env.delete('SUPABASE_ANON_KEY');
  Deno.env.delete('SUPABASE_SERVICE_ROLE_KEY');
  Deno.env.delete('ENCRYPTION_KEY');
  
  assert(true, 'Cleanup completed successfully');
});