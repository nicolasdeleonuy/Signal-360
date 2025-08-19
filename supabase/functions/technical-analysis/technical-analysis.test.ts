// Unit tests for technical-analysis Edge Function
// Tests technical indicators, price analysis, and timeframe handling

import { assertEquals, assertExists, assert } from 'https://deno.land/std@0.168.0/testing/asserts.ts';

// Mock environment variables for testing
Deno.env.set('SUPABASE_URL', 'https://test.supabase.co');
Deno.env.set('SUPABASE_ANON_KEY', 'test-anon-key');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');
Deno.env.set('ENCRYPTION_KEY', 'test-encryption-key-with-sufficient-length-for-security');
Deno.env.set('EXTERNAL_API_TIMEOUT', '30000');
Deno.env.set('MAX_RETRIES', '3');

// Mock historical price data
const mockHistoricalData = {
  historical: Array.from({ length: 100 }, (_, i) => ({
    date: new Date(Date.now() - (99 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    open: 150 + Math.sin(i * 0.1) * 10 + Math.random() * 5,
    high: 155 + Math.sin(i * 0.1) * 10 + Math.random() * 5,
    low: 145 + Math.sin(i * 0.1) * 10 + Math.random() * 5,
    close: 150 + Math.sin(i * 0.1) * 10 + Math.random() * 5,
    volume: 1000000 + Math.random() * 500000
  }))
};

// Mock intraday data
const mockIntradayData = Array.from({ length: 78 }, (_, i) => ({
  date: new Date(Date.now() - (77 - i) * 5 * 60 * 1000).toISOString(),
  open: 150 + Math.sin(i * 0.2) * 2 + Math.random() * 1,
  high: 151 + Math.sin(i * 0.2) * 2 + Math.random() * 1,
  low: 149 + Math.sin(i * 0.2) * 2 + Math.random() * 1,
  close: 150 + Math.sin(i * 0.2) * 2 + Math.random() * 1,
  volume: 50000 + Math.random() * 25000
}));

// Mock fetch function
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
  const urlString = url.toString();
  
  if (urlString.includes('/historical-price-full/')) {
    return new Response(JSON.stringify(mockHistoricalData), { status: 200 });
  } else if (urlString.includes('/historical-chart/')) {
    return new Response(JSON.stringify(mockIntradayData), { status: 200 });
  } else if (urlString.includes('rate-limit-test')) {
    return new Response('Rate limit exceeded', { status: 429, headers: { 'Retry-After': '60' } });
  } else if (urlString.includes('api-error-test')) {
    return new Response('API Error', { status: 500 });
  } else if (urlString.includes('empty-response')) {
    return new Response(JSON.stringify({ historical: [] }), { status: 200 });
  }
  
  return new Response('Not Found', { status: 404 });
};

// Import the handler after setting up mocks
const { default: handler } = await import('./index.ts');

/**
 * Helper function to create test requests
 */
function createTestRequest(body: any, method: string = 'POST'): Request {
  return new Request('http://localhost:8000/technical-analysis', {
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

Deno.test('technical-analysis - successful analysis for trading context', async () => {
  const request = createTestRequest({
    ticker_symbol: 'AAPL',
    api_key: 'AIzaSyDxVlAabc123def456ghi789jkl012mno345',
    analysis_context: 'trading',
    trading_timeframe: '1D'
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
  assertExists(analysisResult.details.trend_indicators);
  assertExists(analysisResult.details.momentum_indicators);
  assertExists(analysisResult.details.volume_indicators);
  assertExists(analysisResult.details.support_resistance);
});

Deno.test('technical-analysis - successful analysis for investment context', async () => {
  const request = createTestRequest({
    ticker_symbol: 'AAPL',
    api_key: 'AIzaSyDxVlAabc123def456ghi789jkl012mno345',
    analysis_context: 'investment'
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
    assertEquals(factor.category, 'technical');
    assert(['positive', 'negative'].includes(factor.type));
    assert(typeof factor.description === 'string');
    assert(typeof factor.weight === 'number');
    assert(typeof factor.confidence === 'number');
  }
});

Deno.test('technical-analysis - various timeframes', async () => {
  const timeframes = ['1D', '1W', '1M', '3M', '6M', '1Y'];

  for (const timeframe of timeframes) {
    const request = createTestRequest({
      ticker_symbol: 'AAPL',
      api_key: 'AIzaSyDxVlAabc123def456ghi789jkl012mno345',
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

Deno.test('technical-analysis - missing ticker symbol', async () => {
  const request = createTestRequest({
    api_key: 'AIzaSyDxVlAabc123def456ghi789jkl012mno345',
    analysis_context: 'trading'
  });

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 400);
  assertEquals(data.success, false);
  assertEquals(data.error.code, 'MISSING_PARAMETER');
  assert(data.error.message.includes('ticker_symbol'));
});

Deno.test('technical-analysis - missing API key', async () => {
  const request = createTestRequest({
    ticker_symbol: 'AAPL',
    analysis_context: 'trading'
  });

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 400);
  assertEquals(data.success, false);
  assertEquals(data.error.code, 'MISSING_PARAMETER');
  assert(data.error.message.includes('api_key'));
});

Deno.test('technical-analysis - missing analysis context', async () => {
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

Deno.test('technical-analysis - invalid ticker format', async () => {
  const request = createTestRequest({
    ticker_symbol: 'invalid-ticker',
    api_key: 'AIzaSyDxVlAabc123def456ghi789jkl012mno345',
    analysis_context: 'trading'
  });

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 400);
  assertEquals(data.success, false);
  assertEquals(data.error.code, 'INVALID_TICKER');
});

Deno.test('technical-analysis - invalid API key format', async () => {
  const request = createTestRequest({
    ticker_symbol: 'AAPL',
    api_key: 'invalid-api-key',
    analysis_context: 'trading'
  });

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 400);
  assertEquals(data.success, false);
  assertEquals(data.error.code, 'INVALID_API_KEY');
});

Deno.test('technical-analysis - invalid analysis context', async () => {
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

Deno.test('technical-analysis - invalid trading timeframe', async () => {
  const request = createTestRequest({
    ticker_symbol: 'AAPL',
    api_key: 'AIzaSyDxVlAabc123def456ghi789jkl012mno345',
    analysis_context: 'trading',
    trading_timeframe: 'invalid'
  });

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 400);
  assertEquals(data.success, false);
  assertEquals(data.error.code, 'INVALID_PARAMETER');
  assert(data.error.message.includes('1D') && data.error.message.includes('1Y'));
});

Deno.test('technical-analysis - trend indicators calculation', async () => {
  const request = createTestRequest({
    ticker_symbol: 'AAPL',
    api_key: 'AIzaSyDxVlAabc123def456ghi789jkl012mno345',
    analysis_context: 'trading',
    trading_timeframe: '1W'
  });

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 200);
  const trendIndicators = data.data.details.trend_indicators;
  
  // Check that key trend indicators are calculated
  assert(typeof trendIndicators.sma_20 === 'number');
  assert(typeof trendIndicators.sma_50 === 'number');
  assert(typeof trendIndicators.ema_12 === 'number');
  assert(typeof trendIndicators.ema_26 === 'number');
  assert(typeof trendIndicators.macd === 'number');
  assert(typeof trendIndicators.macd_signal === 'number');
  assert(typeof trendIndicators.bollinger_upper === 'number');
  assert(typeof trendIndicators.bollinger_lower === 'number');
  
  // Bollinger bands should be properly ordered
  assert(trendIndicators.bollinger_upper > trendIndicators.bollinger_middle);
  assert(trendIndicators.bollinger_middle > trendIndicators.bollinger_lower);
});

Deno.test('technical-analysis - momentum indicators calculation', async () => {
  const request = createTestRequest({
    ticker_symbol: 'AAPL',
    api_key: 'AIzaSyDxVlAabc123def456ghi789jkl012mno345',
    analysis_context: 'trading',
    trading_timeframe: '1W'
  });

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 200);
  const momentumIndicators = data.data.details.momentum_indicators;
  
  // Check that momentum indicators are calculated
  assert(typeof momentumIndicators.rsi === 'number');
  assert(typeof momentumIndicators.stochastic_k === 'number');
  assert(typeof momentumIndicators.stochastic_d === 'number');
  assert(typeof momentumIndicators.williams_r === 'number');
  assert(typeof momentumIndicators.atr === 'number');
  
  // RSI should be between 0 and 100
  assert(momentumIndicators.rsi >= 0 && momentumIndicators.rsi <= 100);
  
  // Stochastic should be between 0 and 100
  assert(momentumIndicators.stochastic_k >= 0 && momentumIndicators.stochastic_k <= 100);
  
  // Williams %R should be between -100 and 0
  assert(momentumIndicators.williams_r >= -100 && momentumIndicators.williams_r <= 0);
  
  // ATR should be positive
  assert(momentumIndicators.atr >= 0);
});

Deno.test('technical-analysis - volume indicators calculation', async () => {
  const request = createTestRequest({
    ticker_symbol: 'AAPL',
    api_key: 'AIzaSyDxVlAabc123def456ghi789jkl012mno345',
    analysis_context: 'trading',
    trading_timeframe: '1W'
  });

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 200);
  const volumeIndicators = data.data.details.volume_indicators;
  
  // Check that volume indicators are calculated
  assert(typeof volumeIndicators.volume_sma_20 === 'number');
  assert(typeof volumeIndicators.volume_ratio === 'number');
  assert(typeof volumeIndicators.on_balance_volume === 'number');
  assert(typeof volumeIndicators.volume_price_trend === 'number');
  assert(typeof volumeIndicators.accumulation_distribution === 'number');
  
  // Volume SMA should be positive
  assert(volumeIndicators.volume_sma_20 > 0);
  
  // Volume ratio should be positive
  assert(volumeIndicators.volume_ratio > 0);
});

Deno.test('technical-analysis - support and resistance calculation', async () => {
  const request = createTestRequest({
    ticker_symbol: 'AAPL',
    api_key: 'AIzaSyDxVlAabc123def456ghi789jkl012mno345',
    analysis_context: 'trading',
    trading_timeframe: '1W'
  });

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 200);
  const supportResistance = data.data.details.support_resistance;
  
  // Check that support/resistance levels are calculated
  assert(Array.isArray(supportResistance.support_levels));
  assert(Array.isArray(supportResistance.resistance_levels));
  assert(typeof supportResistance.pivot_point === 'number');
  assert(typeof supportResistance.support_1 === 'number');
  assert(typeof supportResistance.support_2 === 'number');
  assert(typeof supportResistance.resistance_1 === 'number');
  assert(typeof supportResistance.resistance_2 === 'number');
  
  // Resistance levels should be above support levels
  assert(supportResistance.resistance_1 > supportResistance.support_1);
  assert(supportResistance.resistance_2 > supportResistance.support_2);
});

Deno.test('technical-analysis - factor generation', async () => {
  const request = createTestRequest({
    ticker_symbol: 'AAPL',
    api_key: 'AIzaSyDxVlAabc123def456ghi789jkl012mno345',
    analysis_context: 'trading',
    trading_timeframe: '1W'
  });

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 200);
  const factors = data.data.factors;
  
  assert(Array.isArray(factors));
  
  // Check factor structure if any factors are generated
  if (factors.length > 0) {
    const factor = factors[0];
    assertEquals(factor.category, 'technical');
    assert(['positive', 'negative'].includes(factor.type));
    assert(typeof factor.description === 'string');
    assert(factor.description.length > 0);
    assert(typeof factor.weight === 'number');
    assert(factor.weight >= 0 && factor.weight <= 1);
    assert(typeof factor.confidence === 'number');
    assert(factor.confidence >= 0 && factor.confidence <= 1);
  }
});

Deno.test('technical-analysis - confidence calculation', async () => {
  const request = createTestRequest({
    ticker_symbol: 'AAPL',
    api_key: 'AIzaSyDxVlAabc123def456ghi789jkl012mno345',
    analysis_context: 'trading',
    trading_timeframe: '1W'
  });

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 200);
  const confidence = data.data.confidence;
  
  assert(typeof confidence === 'number');
  assert(confidence >= 0 && confidence <= 1);
  
  // With good mock data, confidence should be reasonably high
  assert(confidence > 0.3);
});

Deno.test('technical-analysis - timeframe-specific confidence', async () => {
  const timeframes = ['1D', '1W', '1M'];
  const confidences: number[] = [];

  for (const timeframe of timeframes) {
    const request = createTestRequest({
      ticker_symbol: 'AAPL',
      api_key: 'AIzaSyDxVlAabc123def456ghi789jkl012mno345',
      analysis_context: 'trading',
      trading_timeframe: timeframe
    });

    const response = await handler(request);
    const data = await parseResponse(response);

    assertEquals(response.status, 200);
    confidences.push(data.data.confidence);
  }

  // 1D should have lower confidence than longer timeframes
  assert(confidences[0] <= confidences[1]); // 1D <= 1W
  assert(confidences[1] <= confidences[2]); // 1W <= 1M
});

Deno.test('technical-analysis - method not allowed', async () => {
  const request = createTestRequest({
    ticker_symbol: 'AAPL',
    api_key: 'AIzaSyDxVlAabc123def456ghi789jkl012mno345',
    analysis_context: 'trading'
  }, 'GET');

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 405);
  assertEquals(data.success, false);
  assertEquals(data.error.code, 'METHOD_NOT_ALLOWED');
});

Deno.test('technical-analysis - CORS preflight', async () => {
  const request = new Request('http://localhost:8000/technical-analysis', {
    method: 'OPTIONS'
  });

  const response = await handler(request);

  assertEquals(response.status, 200);
  assertEquals(response.headers.get('Access-Control-Allow-Origin'), '*');
  assertEquals(response.headers.get('Access-Control-Allow-Methods'), 'POST, GET, OPTIONS');
});

Deno.test('technical-analysis - various valid tickers', async () => {
  const validTickers = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'AMZN'];

  for (const ticker of validTickers) {
    const request = createTestRequest({
      ticker_symbol: ticker,
      api_key: 'AIzaSyDxVlAabc123def456ghi789jkl012mno345',
      analysis_context: 'trading',
      trading_timeframe: '1W'
    });

    const response = await handler(request);
    const data = await parseResponse(response);

    assertEquals(response.status, 200, `Failed for ticker: ${ticker}`);
    assertEquals(data.success, true);
    assertExists(data.data);
  }
});

Deno.test('technical-analysis - various invalid tickers', async () => {
  const invalidTickers = ['', 'A', 'TOOLONG', '123', 'aa', 'A@PL'];

  for (const ticker of invalidTickers) {
    const request = createTestRequest({
      ticker_symbol: ticker,
      api_key: 'AIzaSyDxVlAabc123def456ghi789jkl012mno345',
      analysis_context: 'trading'
    });

    const response = await handler(request);
    const data = await parseResponse(response);

    assertEquals(response.status, 400, `Should fail for ticker: ${ticker}`);
    assertEquals(data.success, false);
    assertEquals(data.error.code, 'INVALID_TICKER');
  }
});

Deno.test('technical-analysis - response structure validation', async () => {
  const request = createTestRequest({
    ticker_symbol: 'AAPL',
    api_key: 'AIzaSyDxVlAabc123def456ghi789jkl012mno345',
    analysis_context: 'trading',
    trading_timeframe: '1W'
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

Deno.test('technical-analysis - trading vs investment context scoring', async () => {
  const contexts = ['trading', 'investment'];
  const scores: number[] = [];

  for (const context of contexts) {
    const request = createTestRequest({
      ticker_symbol: 'AAPL',
      api_key: 'AIzaSyDxVlAabc123def456ghi789jkl012mno345',
      analysis_context: context,
      trading_timeframe: '1W'
    });

    const response = await handler(request);
    const data = await parseResponse(response);

    assertEquals(response.status, 200);
    scores.push(data.data.score);
  }

  // Both scores should be valid
  assert(scores[0] >= 0 && scores[0] <= 100); // trading
  assert(scores[1] >= 0 && scores[1] <= 100); // investment
});

// Restore original fetch after tests
Deno.test('cleanup', () => {
  globalThis.fetch = originalFetch;
  assert(true, 'Cleanup completed');
});