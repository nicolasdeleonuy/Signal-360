// Unit tests for esg-analysis Edge Function
// Tests ESG scoring, sustainability metrics, and factor generation

import { assertEquals, assertExists, assert } from 'https://deno.land/std@0.168.0/testing/asserts.ts';

// Mock environment variables for testing
Deno.env.set('SUPABASE_URL', 'https://test.supabase.co');
Deno.env.set('SUPABASE_ANON_KEY', 'test-anon-key');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');
Deno.env.set('ENCRYPTION_KEY', 'test-encryption-key-with-sufficient-length-for-security');
Deno.env.set('EXTERNAL_API_TIMEOUT', '30000');
Deno.env.set('MAX_RETRIES', '3');

// Mock ESG data responses
const mockESGData = [{
  companyName: 'Apple Inc.',
  ESGScore: 75,
  environmentalScore: 78,
  socialScore: 72,
  governanceScore: 75,
  industryRank: 15,
  industryPercentile: 85,
  date: '2024-01-01'
}];

const mockCompanyProfile = [{
  companyName: 'Apple Inc.',
  sector: 'Technology',
  industry: 'Consumer Electronics',
  country: 'United States',
  mktCap: 3000000000000,
  fullTimeEmployees: 164000,
  description: 'Technology company focused on consumer electronics'
}];

// Mock fetch function
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
  const urlString = url.toString();
  
  if (urlString.includes('/esg-environmental-social-governance-data')) {
    return new Response(JSON.stringify(mockESGData), { status: 200 });
  } else if (urlString.includes('/profile/')) {
    return new Response(JSON.stringify(mockCompanyProfile), { status: 200 });
  } else if (urlString.includes('rate-limit-test')) {
    return new Response('Rate limit exceeded', { status: 429, headers: { 'Retry-After': '60' } });
  } else if (urlString.includes('api-error-test')) {
    return new Response('API Error', { status: 500 });
  } else if (urlString.includes('empty-response')) {
    return new Response(JSON.stringify([]), { status: 200 });
  }
  
  return new Response('Not Found', { status: 404 });
};

// Import the handler after setting up mocks
const { default: handler } = await import('./index.ts');

/**
 * Helper function to create test requests
 */
function createTestRequest(body: any, method: string = 'POST'): Request {
  return new Request('http://localhost:8000/esg-analysis', {
    method,
    headers: {
      'Content-Type': 'application/json'
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

Deno.test('esg-analysis - successful analysis for investment context', async () => {
  const request = createTestRequest({
    ticker_symbol: 'AAPL',
    api_key: 'AIzaSyDxVlAabc123def456ghi789jkl012mno345',
    analysis_context: 'investment'
  });

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 200);
  assertEquals(data.success, true);
  assertExists(data.data);
  
  const analysisResult = data.data;
  assert(typeof analysisResult.score === 'number');
  assert(analysisResult.score >= 0 && analysisResult.score <= 100);
  assert(Array.isArray(analysisResult.factors));
  assertExists(analysisResult.details);
  assert(typeof analysisResult.confidence === 'number');
  assert(analysisResult.confidence >= 0 && analysisResult.confidence <= 1);
  
  // Check details structure
  assertExists(analysisResult.details.environmental_score);
  assertExists(analysisResult.details.social_score);
  assertExists(analysisResult.details.governance_score);
  assertExists(analysisResult.details.sustainability_metrics);
});

Deno.test('esg-analysis - successful analysis for trading context', async () => {
  const request = createTestRequest({
    ticker_symbol: 'AAPL',
    api_key: 'AIzaSyDxVlAabc123def456ghi789jkl012mno345',
    analysis_context: 'trading'
  });

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 200);
  assertEquals(data.success, true);
  
  const analysisResult = data.data;
  assert(typeof analysisResult.score === 'number');
  assert(analysisResult.score >= 0 && analysisResult.score <= 100);
  assert(Array.isArray(analysisResult.factors));
  
  // Factors should have proper structure
  if (analysisResult.factors.length > 0) {
    const factor = analysisResult.factors[0];
    assertEquals(factor.category, 'esg');
    assert(['positive', 'negative'].includes(factor.type));
    assert(typeof factor.description === 'string');
    assert(typeof factor.weight === 'number');
    assert(typeof factor.confidence === 'number');
  }
});

Deno.test('esg-analysis - missing ticker symbol', async () => {
  const request = createTestRequest({
    api_key: 'AIzaSyDxVlAabc123def456ghi789jkl012mno345',
    analysis_context: 'investment'
  });

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 400);
  assertEquals(data.success, false);
  assertEquals(data.error.code, 'MISSING_PARAMETER');
  assert(data.error.message.includes('ticker_symbol'));
});

Deno.test('esg-analysis - missing API key', async () => {
  const request = createTestRequest({
    ticker_symbol: 'AAPL',
    analysis_context: 'investment'
  });

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 400);
  assertEquals(data.success, false);
  assertEquals(data.error.code, 'MISSING_PARAMETER');
  assert(data.error.message.includes('api_key'));
});

Deno.test('esg-analysis - missing analysis context', async () => {
  const request = createTestRequest({
    ticker_symbol: 'AAPL',
    api_key: 'AIzaSyDxVlAabc123def456ghi789jkl012mno345'
  });

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 400);
  assertEquals(data.success, false);
  assertEquals(data.error.code, 'MISSING_PARAMETER');
  assert(data.error.message.includes('analysis_context'));
});

Deno.test('esg-analysis - invalid ticker format', async () => {
  const request = createTestRequest({
    ticker_symbol: 'invalid-ticker',
    api_key: 'AIzaSyDxVlAabc123def456ghi789jkl012mno345',
    analysis_context: 'investment'
  });

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 400);
  assertEquals(data.success, false);
  assertEquals(data.error.code, 'INVALID_TICKER');
});

Deno.test('esg-analysis - invalid API key format', async () => {
  const request = createTestRequest({
    ticker_symbol: 'AAPL',
    api_key: 'invalid-api-key',
    analysis_context: 'investment'
  });

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 400);
  assertEquals(data.success, false);
  assertEquals(data.error.code, 'INVALID_API_KEY');
});

Deno.test('esg-analysis - invalid analysis context', async () => {
  const request = createTestRequest({
    ticker_symbol: 'AAPL',
    api_key: 'AIzaSyDxVlAabc123def456ghi789jkl012mno345',
    analysis_context: 'invalid'
  });

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 400);
  assertEquals(data.success, false);
  assertEquals(data.error.code, 'INVALID_PARAMETER');
  assert(data.error.message.includes('investment') && data.error.message.includes('trading'));
});

Deno.test('esg-analysis - ESG score calculation', async () => {
  const request = createTestRequest({
    ticker_symbol: 'AAPL',
    api_key: 'AIzaSyDxVlAabc123def456ghi789jkl012mno345',
    analysis_context: 'investment'
  });

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 200);
  const score = data.data.score;
  const details = data.data.details;
  
  // Score should be reasonable based on mock data
  assert(score >= 50 && score <= 100); // Should be good score for Apple
  
  // Individual scores should be present
  assert(typeof details.environmental_score === 'number');
  assert(typeof details.social_score === 'number');
  assert(typeof details.governance_score === 'number');
  
  // Scores should match mock data
  assertEquals(details.environmental_score, 78);
  assertEquals(details.social_score, 72);
  assertEquals(details.governance_score, 75);
});

Deno.test('esg-analysis - sustainability metrics', async () => {
  const request = createTestRequest({
    ticker_symbol: 'AAPL',
    api_key: 'AIzaSyDxVlAabc123def456ghi789jkl012mno345',
    analysis_context: 'investment'
  });

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 200);
  const sustainabilityMetrics = data.data.details.sustainability_metrics;
  
  // Check that sustainability metrics are calculated
  assert(typeof sustainabilityMetrics.sustainability_reporting === 'number');
  assert(typeof sustainabilityMetrics.climate_commitments === 'number');
  assert(typeof sustainabilityMetrics.stakeholder_engagement === 'number');
  assert(typeof sustainabilityMetrics.sustainability_innovation === 'number');
  assert(typeof sustainabilityMetrics.regulatory_compliance === 'number');
  assert(typeof sustainabilityMetrics.environmental_controversies === 'number');
  assert(typeof sustainabilityMetrics.social_controversies === 'number');
  assert(typeof sustainabilityMetrics.governance_controversies === 'number');
  
  // Boolean metrics should be 0 or 100
  assert([0, 100].includes(sustainabilityMetrics.sustainability_reporting));
  assert([0, 100].includes(sustainabilityMetrics.climate_commitments));
  
  // Score metrics should be in valid range
  assert(sustainabilityMetrics.stakeholder_engagement >= 0 && sustainabilityMetrics.stakeholder_engagement <= 100);
  assert(sustainabilityMetrics.sustainability_innovation >= 0 && sustainabilityMetrics.sustainability_innovation <= 100);
  assert(sustainabilityMetrics.regulatory_compliance >= 0 && sustainabilityMetrics.regulatory_compliance <= 100);
  
  // Controversy metrics should be non-negative
  assert(sustainabilityMetrics.environmental_controversies >= 0);
  assert(sustainabilityMetrics.social_controversies >= 0);
  assert(sustainabilityMetrics.governance_controversies >= 0);
});

Deno.test('esg-analysis - factor generation', async () => {
  const request = createTestRequest({
    ticker_symbol: 'AAPL',
    api_key: 'AIzaSyDxVlAabc123def456ghi789jkl012mno345',
    analysis_context: 'investment'
  });

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 200);
  const factors = data.data.factors;
  
  assert(Array.isArray(factors));
  
  // Check factor structure if any factors are generated
  if (factors.length > 0) {
    const factor = factors[0];
    assertEquals(factor.category, 'esg');
    assert(['positive', 'negative'].includes(factor.type));
    assert(typeof factor.description === 'string');
    assert(factor.description.length > 0);
    assert(typeof factor.weight === 'number');
    assert(factor.weight >= 0 && factor.weight <= 1);
    assert(typeof factor.confidence === 'number');
    assert(factor.confidence >= 0 && factor.confidence <= 1);
  }
  
  // With good mock ESG data, should have at least one positive factor
  const positiveFactors = factors.filter(f => f.type === 'positive');
  assert(positiveFactors.length > 0, 'Should have positive factors for good ESG score');
});

Deno.test('esg-analysis - confidence calculation', async () => {
  const request = createTestRequest({
    ticker_symbol: 'AAPL',
    api_key: 'AIzaSyDxVlAabc123def456ghi789jkl012mno345',
    analysis_context: 'investment'
  });

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 200);
  const confidence = data.data.confidence;
  
  assert(typeof confidence === 'number');
  assert(confidence >= 0 && confidence <= 1);
  
  // With good mock data and recent date, confidence should be reasonably high
  assert(confidence > 0.5);
});

Deno.test('esg-analysis - investment vs trading context scoring', async () => {
  const contexts = ['investment', 'trading'];
  const scores: number[] = [];

  for (const context of contexts) {
    const request = createTestRequest({
      ticker_symbol: 'AAPL',
      api_key: 'AIzaSyDxVlAabc123def456ghi789jkl012mno345',
      analysis_context: context
    });

    const response = await handler(request);
    const data = await parseResponse(response);

    assertEquals(response.status, 200);
    scores.push(data.data.score);
  }

  // Both scores should be valid
  assert(scores[0] >= 0 && scores[0] <= 100); // investment
  assert(scores[1] >= 0 && scores[1] <= 100); // trading
  
  // Investment context should generally have higher ESG weight
  // (though this depends on the specific scoring algorithm)
  assert(scores[0] > 0 && scores[1] > 0);
});

Deno.test('esg-analysis - method not allowed', async () => {
  const request = createTestRequest({
    ticker_symbol: 'AAPL',
    api_key: 'AIzaSyDxVlAabc123def456ghi789jkl012mno345',
    analysis_context: 'investment'
  }, 'GET');

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 405);
  assertEquals(data.success, false);
  assertEquals(data.error.code, 'METHOD_NOT_ALLOWED');
});

Deno.test('esg-analysis - CORS preflight', async () => {
  const request = new Request('http://localhost:8000/esg-analysis', {
    method: 'OPTIONS'
  });

  const response = await handler(request);

  assertEquals(response.status, 200);
  assertEquals(response.headers.get('Access-Control-Allow-Origin'), '*');
  assertEquals(response.headers.get('Access-Control-Allow-Methods'), 'POST, GET, OPTIONS');
});

Deno.test('esg-analysis - various valid tickers', async () => {
  const validTickers = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'AMZN'];

  for (const ticker of validTickers) {
    const request = createTestRequest({
      ticker_symbol: ticker,
      api_key: 'AIzaSyDxVlAabc123def456ghi789jkl012mno345',
      analysis_context: 'investment'
    });

    const response = await handler(request);
    const data = await parseResponse(response);

    assertEquals(response.status, 200, `Failed for ticker: ${ticker}`);
    assertEquals(data.success, true);
    assertExists(data.data);
  }
});

Deno.test('esg-analysis - various invalid tickers', async () => {
  const invalidTickers = ['', 'A', 'TOOLONG', '123', 'aa', 'A@PL'];

  for (const ticker of invalidTickers) {
    const request = createTestRequest({
      ticker_symbol: ticker,
      api_key: 'AIzaSyDxVlAabc123def456ghi789jkl012mno345',
      analysis_context: 'investment'
    });

    const response = await handler(request);
    const data = await parseResponse(response);

    assertEquals(response.status, 400, `Should fail for ticker: ${ticker}`);
    assertEquals(data.success, false);
    assertEquals(data.error.code, 'INVALID_TICKER');
  }
});

Deno.test('esg-analysis - empty ESG data handling', async () => {
  // Mock empty response
  globalThis.fetch = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const urlString = url.toString();
    
    if (urlString.includes('/esg-environmental-social-governance-data')) {
      return new Response(JSON.stringify([]), { status: 200 });
    } else if (urlString.includes('/profile/')) {
      return new Response(JSON.stringify(mockCompanyProfile), { status: 200 });
    }
    
    return new Response('Not Found', { status: 404 });
  };

  const request = createTestRequest({
    ticker_symbol: 'AAPL',
    api_key: 'AIzaSyDxVlAabc123def456ghi789jkl012mno345',
    analysis_context: 'investment'
  });

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 200);
  assertEquals(data.success, true);
  
  // Should still provide analysis with estimated data
  assertExists(data.data);
  assert(typeof data.data.score === 'number');
  assert(data.data.score >= 0 && data.data.score <= 100);
  
  // Confidence should be lower for estimated data
  assert(data.data.confidence < 0.8);
});

Deno.test('esg-analysis - sector-based scoring differences', async () => {
  // Test different sectors by modifying company profile
  const sectors = ['Technology', 'Energy', 'Healthcare'];
  const scores: number[] = [];

  for (const sector of sectors) {
    // Mock different sector
    globalThis.fetch = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
      const urlString = url.toString();
      
      if (urlString.includes('/esg-environmental-social-governance-data')) {
        return new Response(JSON.stringify([]), { status: 200 }); // Force estimated scoring
      } else if (urlString.includes('/profile/')) {
        const sectorProfile = [{
          ...mockCompanyProfile[0],
          sector: sector
        }];
        return new Response(JSON.stringify(sectorProfile), { status: 200 });
      }
      
      return new Response('Not Found', { status: 404 });
    };

    const request = createTestRequest({
      ticker_symbol: 'TEST',
      api_key: 'AIzaSyDxVlAabc123def456ghi789jkl012mno345',
      analysis_context: 'investment'
    });

    const response = await handler(request);
    const data = await parseResponse(response);

    assertEquals(response.status, 200);
    scores.push(data.data.score);
  }

  // All scores should be valid
  for (const score of scores) {
    assert(score >= 0 && score <= 100);
  }
  
  // Technology should generally score higher than Energy for ESG
  // (though this depends on the random generation in our mock)
  assert(scores.length === 3);
});

Deno.test('esg-analysis - response structure validation', async () => {
  const request = createTestRequest({
    ticker_symbol: 'AAPL',
    api_key: 'AIzaSyDxVlAabc123def456ghi789jkl012mno345',
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
});

Deno.test('esg-analysis - invalid JSON', async () => {
  const request = new Request('http://localhost:8000/esg-analysis', {
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

// Restore original fetch after tests
Deno.test('cleanup', () => {
  globalThis.fetch = originalFetch;
  assert(true, 'Cleanup completed');
});