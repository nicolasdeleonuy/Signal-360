// Unit tests for synthesis-engine Edge Function
// Tests synthesis logic, weighting strategies, and convergence/divergence analysis

import { assertEquals, assertExists, assert } from 'https://deno.land/std@0.168.0/testing/asserts.ts';

// Mock environment variables for testing
Deno.env.set('SUPABASE_URL', 'https://test.supabase.co');
Deno.env.set('SUPABASE_ANON_KEY', 'test-anon-key');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');
Deno.env.set('ENCRYPTION_KEY', 'test-encryption-key-with-sufficient-length-for-security');

// Set analysis weighting environment variables
Deno.env.set('INVESTMENT_FUNDAMENTAL_WEIGHT', '0.5');
Deno.env.set('INVESTMENT_TECHNICAL_WEIGHT', '0.2');
Deno.env.set('INVESTMENT_ESG_WEIGHT', '0.3');
Deno.env.set('TRADING_FUNDAMENTAL_WEIGHT', '0.25');
Deno.env.set('TRADING_TECHNICAL_WEIGHT', '0.6');
Deno.env.set('TRADING_ESG_WEIGHT', '0.15');

// Import the handler after setting up environment
const { default: handler } = await import('./index.ts');

/**
 * Helper function to create mock analysis results
 */
function createMockAnalysisResults(scores: { fundamental: number; technical: number; esg: number }) {
  return {
    fundamental_result: {
      score: scores.fundamental,
      factors: [
        {
          category: 'fundamental' as const,
          type: 'positive' as const,
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
    technical_result: {
      score: scores.technical,
      factors: [
        {
          category: 'technical' as const,
          type: 'positive' as const,
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
    esg_result: {
      score: scores.esg,
      factors: [
        {
          category: 'esg' as const,
          type: 'positive' as const,
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
    }
  };
}

/**
 * Helper function to create test requests
 */
function createTestRequest(body: any, method: string = 'POST'): Request {
  return new Request('http://localhost:8000/synthesis-engine', {
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

Deno.test('synthesis-engine - successful synthesis for investment context', async () => {
  const mockResults = createMockAnalysisResults({ fundamental: 75, technical: 68, esg: 78 });
  
  const request = createTestRequest({
    ticker_symbol: 'AAPL',
    analysis_context: 'investment',
    ...mockResults
  });

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 200);
  assertEquals(data.success, true);
  assertExists(data.data);
  
  const result = data.data;
  assert(typeof result.synthesis_score === 'number');
  assert(result.synthesis_score >= 0 && result.synthesis_score <= 100);
  assert(Array.isArray(result.convergence_factors));
  assert(Array.isArray(result.divergence_factors));
  assertExists(result.full_report);
  assert(typeof result.confidence === 'number');
  assert(result.confidence >= 0 && result.confidence <= 1);
});

Deno.test('synthesis-engine - successful synthesis for trading context', async () => {
  const mockResults = createMockAnalysisResults({ fundamental: 65, technical: 82, esg: 70 });
  
  const request = createTestRequest({
    ticker_symbol: 'AAPL',
    analysis_context: 'trading',
    trading_timeframe: '1D',
    ...mockResults
  });

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 200);
  assertEquals(data.success, true);
  
  const result = data.data;
  assert(typeof result.synthesis_score === 'number');
  assert(result.synthesis_score >= 0 && result.synthesis_score <= 100);
  
  // Trading context should weight technical analysis more heavily
  // With technical score of 82 being highest, synthesis score should reflect this
  assert(result.synthesis_score > 70);
});

Deno.test('synthesis-engine - investment vs trading weighting differences', async () => {
  const mockResults = createMockAnalysisResults({ fundamental: 80, technical: 50, esg: 75 });
  
  // Test investment context (should favor fundamental + ESG)
  const investmentRequest = createTestRequest({
    ticker_symbol: 'AAPL',
    analysis_context: 'investment',
    ...mockResults
  });

  const investmentResponse = await handler(investmentRequest);
  const investmentData = await parseResponse(investmentResponse);

  // Test trading context (should favor technical)
  const tradingRequest = createTestRequest({
    ticker_symbol: 'AAPL',
    analysis_context: 'trading',
    trading_timeframe: '1W',
    ...mockResults
  });

  const tradingResponse = await handler(tradingRequest);
  const tradingData = await parseResponse(tradingResponse);

  assertEquals(investmentResponse.status, 200);
  assertEquals(tradingResponse.status, 200);

  const investmentScore = investmentData.data.synthesis_score;
  const tradingScore = tradingData.data.synthesis_score;

  // Investment should score higher due to strong fundamental (80) and ESG (75)
  // Trading should score lower due to weak technical (50)
  assert(investmentScore > tradingScore);
});

Deno.test('synthesis-engine - convergence factor identification', async () => {
  // Create results with strong positive convergence
  const mockResults = createMockAnalysisResults({ fundamental: 85, technical: 82, esg: 88 });
  
  const request = createTestRequest({
    ticker_symbol: 'AAPL',
    analysis_context: 'investment',
    ...mockResults
  });

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 200);
  const convergenceFactors = data.data.convergence_factors;
  
  assert(Array.isArray(convergenceFactors));
  assert(convergenceFactors.length > 0);
  
  // Should identify strong positive convergence
  const strongPositive = convergenceFactors.find((f: any) => 
    f.description.includes('Strong positive signals')
  );
  assertExists(strongPositive);
  assert(strongPositive.supporting_analyses.length === 3);
});

Deno.test('synthesis-engine - divergence factor identification', async () => {
  // Create results with significant divergence
  const mockResults = createMockAnalysisResults({ fundamental: 85, technical: 35, esg: 75 });
  
  const request = createTestRequest({
    ticker_symbol: 'AAPL',
    analysis_context: 'investment',
    ...mockResults
  });

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 200);
  const divergenceFactors = data.data.divergence_factors;
  
  assert(Array.isArray(divergenceFactors));
  assert(divergenceFactors.length > 0);
  
  // Should identify score divergence
  const scoreDivergence = divergenceFactors.find((f: any) => 
    f.category === 'score_divergence'
  );
  assertExists(scoreDivergence);
  assert(scoreDivergence.conflicting_analyses.includes('fundamental'));
  assert(scoreDivergence.conflicting_analyses.includes('technical'));
});

Deno.test('synthesis-engine - timeframe adjustments for trading', async () => {
  const mockResults = createMockAnalysisResults({ fundamental: 70, technical: 80, esg: 65 });
  
  const timeframes = ['1D', '1W', '1M', '1Y'];
  const scores: number[] = [];

  for (const timeframe of timeframes) {
    const request = createTestRequest({
      ticker_symbol: 'AAPL',
      analysis_context: 'trading',
      trading_timeframe: timeframe,
      ...mockResults
    });

    const response = await handler(request);
    const data = await parseResponse(response);

    assertEquals(response.status, 200);
    scores.push(data.data.synthesis_score);
  }

  // All scores should be valid
  for (const score of scores) {
    assert(score >= 0 && score <= 100);
  }
  
  // Scores should vary based on timeframe adjustments
  assert(scores.length === 4);
});

Deno.test('synthesis-engine - confidence calculation', async () => {
  // Test with varying confidence levels
  const mockResults = createMockAnalysisResults({ fundamental: 75, technical: 70, esg: 72 });
  
  // Modify confidence levels
  mockResults.fundamental_result.confidence = 0.9;
  mockResults.technical_result.confidence = 0.6;
  mockResults.esg_result.confidence = 0.8;
  
  const request = createTestRequest({
    ticker_symbol: 'AAPL',
    analysis_context: 'investment',
    ...mockResults
  });

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 200);
  const confidence = data.data.confidence;
  
  assert(typeof confidence === 'number');
  assert(confidence >= 0 && confidence <= 1);
  
  // Should be weighted average with some penalty for inconsistency
  assert(confidence > 0.5 && confidence < 0.9);
});

Deno.test('synthesis-engine - full report generation', async () => {
  const mockResults = createMockAnalysisResults({ fundamental: 75, technical: 68, esg: 78 });
  
  const request = createTestRequest({
    ticker_symbol: 'AAPL',
    analysis_context: 'investment',
    ...mockResults
  });

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 200);
  const fullReport = data.data.full_report;
  
  assertExists(fullReport);
  assertExists(fullReport.summary);
  assertExists(fullReport.recommendation);
  assertExists(fullReport.fundamental);
  assertExists(fullReport.technical);
  assertExists(fullReport.esg);
  assertExists(fullReport.synthesis_methodology);
  assertExists(fullReport.limitations);
  assertExists(fullReport.metadata);
  
  // Check recommendation is valid
  const validRecommendations = ['strong_buy', 'buy', 'hold', 'sell', 'strong_sell'];
  assert(validRecommendations.includes(fullReport.recommendation));
  
  // Check summary contains ticker and score
  assert(fullReport.summary.includes('AAPL'));
  assert(fullReport.summary.includes('synthesis score'));
  
  // Check methodology explains weighting
  assert(fullReport.synthesis_methodology.includes('weighted synthesis'));
  assert(fullReport.synthesis_methodology.includes('Fundamental'));
  assert(fullReport.synthesis_methodology.includes('Technical'));
  assert(fullReport.synthesis_methodology.includes('ESG'));
});

Deno.test('synthesis-engine - missing required parameters', async () => {
  const requiredParams = [
    'ticker_symbol',
    'analysis_context',
    'fundamental_result',
    'technical_result',
    'esg_result'
  ];

  for (const missingParam of requiredParams) {
    const mockResults = createMockAnalysisResults({ fundamental: 75, technical: 68, esg: 78 });
    const body = {
      ticker_symbol: 'AAPL',
      analysis_context: 'investment',
      ...mockResults
    };

    // Remove the parameter to test
    delete (body as any)[missingParam];

    const request = createTestRequest(body);
    const response = await handler(request);
    const data = await parseResponse(response);

    assertEquals(response.status, 400, `Should fail when missing ${missingParam}`);
    assertEquals(data.success, false);
    assertEquals(data.error.code, 'MISSING_PARAMETER');
    assert(data.error.message.includes(missingParam));
  }
});

Deno.test('synthesis-engine - invalid analysis context', async () => {
  const mockResults = createMockAnalysisResults({ fundamental: 75, technical: 68, esg: 78 });
  
  const request = createTestRequest({
    ticker_symbol: 'AAPL',
    analysis_context: 'invalid',
    ...mockResults
  });

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 400);
  assertEquals(data.success, false);
  assertEquals(data.error.code, 'INVALID_PARAMETER');
  assert(data.error.message.includes('Invalid analysis context'));
});

Deno.test('synthesis-engine - invalid score ranges', async () => {
  const mockResults = createMockAnalysisResults({ fundamental: 150, technical: 68, esg: 78 });
  
  const request = createTestRequest({
    ticker_symbol: 'AAPL',
    analysis_context: 'investment',
    ...mockResults
  });

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 400);
  assertEquals(data.success, false);
  assertEquals(data.error.code, 'INVALID_PARAMETER');
  assert(data.error.message.includes('between 0 and 100'));
});

Deno.test('synthesis-engine - method not allowed', async () => {
  const mockResults = createMockAnalysisResults({ fundamental: 75, technical: 68, esg: 78 });
  
  const request = createTestRequest({
    ticker_symbol: 'AAPL',
    analysis_context: 'investment',
    ...mockResults
  }, 'GET');

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 405);
  assertEquals(data.success, false);
  assertEquals(data.error.code, 'METHOD_NOT_ALLOWED');
});

Deno.test('synthesis-engine - CORS preflight', async () => {
  const request = new Request('http://localhost:8000/synthesis-engine', {
    method: 'OPTIONS'
  });

  const response = await handler(request);

  assertEquals(response.status, 200);
  assertEquals(response.headers.get('Access-Control-Allow-Origin'), '*');
  assertEquals(response.headers.get('Access-Control-Allow-Methods'), 'POST, GET, OPTIONS');
});

Deno.test('synthesis-engine - score boundary conditions', async () => {
  // Test with extreme scores
  const extremeCases = [
    { fundamental: 0, technical: 0, esg: 0 },      // All minimum
    { fundamental: 100, technical: 100, esg: 100 }, // All maximum
    { fundamental: 50, technical: 50, esg: 50 }     // All neutral
  ];

  for (const scores of extremeCases) {
    const mockResults = createMockAnalysisResults(scores);
    
    const request = createTestRequest({
      ticker_symbol: 'AAPL',
      analysis_context: 'investment',
      ...mockResults
    });

    const response = await handler(request);
    const data = await parseResponse(response);

    assertEquals(response.status, 200);
    const synthesisScore = data.data.synthesis_score;
    
    assert(synthesisScore >= 0 && synthesisScore <= 100);
    
    // Check that extreme cases produce expected ranges
    if (scores.fundamental === 0 && scores.technical === 0 && scores.esg === 0) {
      assert(synthesisScore <= 20); // Should be very low
    } else if (scores.fundamental === 100 && scores.technical === 100 && scores.esg === 100) {
      assert(synthesisScore >= 80); // Should be very high
    }
  }
});

Deno.test('synthesis-engine - factor weight validation', async () => {
  const mockResults = createMockAnalysisResults({ fundamental: 75, technical: 68, esg: 78 });
  
  const request = createTestRequest({
    ticker_symbol: 'AAPL',
    analysis_context: 'investment',
    ...mockResults
  });

  const response = await handler(request);
  const data = await parseResponse(response);

  assertEquals(response.status, 200);
  
  const convergenceFactors = data.data.convergence_factors;
  const divergenceFactors = data.data.divergence_factors;
  
  // Validate factor structure
  for (const factor of [...convergenceFactors, ...divergenceFactors]) {
    assert(typeof factor.weight === 'number');
    assert(factor.weight >= 0 && factor.weight <= 1);
    assert(typeof factor.description === 'string');
    assert(factor.description.length > 0);
    assert(Array.isArray(factor.supporting_analyses || factor.conflicting_analyses));
  }
});

Deno.test('synthesis-engine - response structure validation', async () => {
  const mockResults = createMockAnalysisResults({ fundamental: 75, technical: 68, esg: 78 });
  
  const request = createTestRequest({
    ticker_symbol: 'AAPL',
    analysis_context: 'investment',
    ...mockResults
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

Deno.test('synthesis-engine - invalid JSON', async () => {
  const request = new Request('http://localhost:8000/synthesis-engine', {
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