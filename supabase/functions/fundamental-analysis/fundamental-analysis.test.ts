// Unit tests for fundamental-analysis Edge Function
// Tests analysis logic, external API integration, and error handling

import { assertEquals, assertExists, assert } from 'https://deno.land/std@0.168.0/testing/asserts.ts';

// Mock environment variables for testing
Deno.env.set('SUPABASE_URL', 'https://test.supabase.co');
Deno.env.set('SUPABASE_ANON_KEY', 'test-anon-key');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');
Deno.env.set('ENCRYPTION_KEY', 'test-encryption-key-with-sufficient-length-for-security');
Deno.env.set('EXTERNAL_API_TIMEOUT', '30000');
Deno.env.set('MAX_RETRIES', '3');

// Mock external API responses
const mockCompanyProfile = [{
  companyName: 'Apple Inc.',
  sector: 'Technology',
  industry: 'Consumer Electronics',
  mktCap: 3000000000000,
  price: 150.00,
  pe: 25.5,
  pb: 8.2,
  lastDiv: 0.92,
  beta: 1.2
}];

const mockIncomeStatement = [{
  date: '2023-12-31',
  revenue: 383285000000,
  netIncome: 97000000000
}, {
  date: '2022-12-31',
  revenue: 365817000000,
  netIncome: 94321000000
}];

const mockBalanceSheet = [{
  date: '2023-12-31',
  totalAssets: 352755000000,
  totalLiabilities: 290437000000,
  totalStockholdersEquity: 62318000000,
  totalDebt: 104590000000,
  totalCurrentAssets: 143566000000,
  totalCurrentLiabilities: 145308000000
}];

const mockCashFlow = [{
  date: '2023-12-31',
  operatingCashFlow: 110543000000,
  freeCashFlow: 84726000000
}];

const mockQuote = [{
  price: 150.00,
  volume: 50000000,
  marketCap: 3000000000000,
  pe: 25.5,
  priceToBook: 8.2,
  priceToSales: 7.8,
  peg: 1.5,
  dividendYield: 0.61,
  beta: 1.2,
  eps: 6.13,
  bookValue: 18.3
}];

// Mock fetch function
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
  const urlString = url.toString();
  
  if (urlString.includes('/profile/')) {
    return new Response(JSON.stringify(mockCompanyProfile), { status: 200 });
  } else if (urlString.includes('/income-statement/')) {
    return new Response(JSON.stringify(mockIncomeStatement), { status: 200 });
  } else if (urlString.includes('/balance-sheet-statement/')) {
    return new Response(JSON.stringify(mockBalanceSheet), { status: 200 });
  } else if (urlString.includes('/cash-flow-statement/')) {
    return new Response(JSON.stringify(mockCashFlow), { status: 200 });
  } else if (urlString.includes('/quote/')) {
    return new Response(JSON.stringify(mockQuote), { status: 200 });
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
  return new Request('http://localhost:8000/fundamental-analysis', {
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

Deno.test('fundamental-analysis - successful analysis for investment context', async () => {
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
  assertExists(analysisResult.details.financial_ratios);
  assertExists(analysisResult.details.growth_metrics);
  assertExists(analysisResult.details.valuation_metrics);
  assertExists(analysisResult.details.quality_indicators);
});

Deno.test('fundamental-analysis - successful analysis for trading context', async () => {
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
    assertEquals(factor.category, 'fundamental');
    assert(['positive', 'negative'].includes(factor.type));
    assert(typeof factor.description === 'string');
    assert(typeof factor.weight === 'number');
    assert(typeof factor.confidence === 'number');
  }
});

Deno.test('fundamental-analysis - missing ticker symbol', async () => {
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

Deno.test('fundamental-analysis - missing API key', async () => {
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

Deno.test('fundamental-analysis - missing analysis context', async () => {
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

Deno.test('fundamental-analysis - invalid ticker format', async () => {
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

Deno.test('fundamental-analysis - invalid API key format', async () => {
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

Deno.test('fundamental-analysis - invalid analysis context', async () => {
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

Deno.test('fundamental-analysis - method not allowed', async () => {
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

Deno.test('fundamental-analysis - CORS preflight', async () => {
  const request = new Request('http://localhost:8000/fundamental-analysis', {
    method: 'OPTIONS'
  });

  const response = await handler(request);

  assertEquals(response.status, 200);
  assertEquals(response.headers.get('Access-Control-Allow-Origin'), '*');
  assertEquals(response.headers.get('Access-Control-Allow-Methods'), 'POST, GET, OPTIONS');
});

Deno.test('fundamental-analysis - invalid JSON', async () => {
  const request = new Request('http://localhost:8000/fundamental-analysis', {
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

Deno.test('fundamental-analysis - various valid tickers', async () => {
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

Deno.test('fundamental-analysis - various invalid tickers', async () => {
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

Deno.test('fundamental-analysis - financial ratios calculation', async () => {
  const request = createTestRequest({
    ticker_symbol: 'AAPL',
    api_key: 'AIzaSyDxVlAabc123def456ghi789jkl012mno345',
    analysis_context: 'investment'
  });

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 200);
  const ratios = data.data.details.financial_ratios;
  
  // Check that key ratios are calculated
  assert(typeof ratios.roe === 'number');
  assert(typeof ratios.roa === 'number');
  assert(typeof ratios.net_margin === 'number');
  assert(typeof ratios.current_ratio === 'number');
  assert(typeof ratios.debt_to_equity === 'number');
  assert(typeof ratios.pe_ratio === 'number');
  
  // ROE should be calculated correctly: netIncome / shareholderEquity * 100
  const expectedROE = (97000000000 / 62318000000) * 100;
  assert(Math.abs(ratios.roe - expectedROE) < 0.1);
});

Deno.test('fundamental-analysis - growth metrics calculation', async () => {
  const request = createTestRequest({
    ticker_symbol: 'AAPL',
    api_key: 'AIzaSyDxVlAabc123def456ghi789jkl012mno345',
    analysis_context: 'investment'
  });

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 200);
  const growth = data.data.details.growth_metrics;
  
  // Check that growth metrics are calculated
  assert(typeof growth.revenue_growth === 'number');
  assert(typeof growth.earnings_growth === 'number');
  
  // Revenue growth should be calculated correctly
  const expectedRevenueGrowth = ((383285000000 - 365817000000) / 365817000000) * 100;
  assert(Math.abs(growth.revenue_growth - expectedRevenueGrowth) < 0.1);
});

Deno.test('fundamental-analysis - analysis factors generation', async () => {
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
    assertEquals(factor.category, 'fundamental');
    assert(['positive', 'negative'].includes(factor.type));
    assert(typeof factor.description === 'string');
    assert(factor.description.length > 0);
    assert(typeof factor.weight === 'number');
    assert(factor.weight >= 0 && factor.weight <= 1);
    assert(typeof factor.confidence === 'number');
    assert(factor.confidence >= 0 && factor.confidence <= 1);
  }
});

Deno.test('fundamental-analysis - confidence calculation', async () => {
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
  
  // With good mock data, confidence should be reasonably high
  assert(confidence > 0.5);
});

Deno.test('fundamental-analysis - response structure validation', async () => {
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

// Restore original fetch after tests
Deno.test('cleanup', () => {
  globalThis.fetch = originalFetch;
  assert(true, 'Cleanup completed');
});