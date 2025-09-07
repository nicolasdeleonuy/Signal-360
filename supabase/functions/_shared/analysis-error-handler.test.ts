// Comprehensive test suite for analysis error handling and monitoring
// Tests all error handling scenarios, rate limiting, circuit breakers, and monitoring

import { assertEquals, assertThrows, assert } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import {
  AnalysisError,
  AnalysisStage,
  AnalysisPipelineMonitor,
  TickerValidator,
  globalRateLimiter,
  globalCircuitBreakers,
  GracefulDegradationHandler,
  AnalysisPerformanceMonitor,
  ANALYSIS_ERROR_CODES,
  callExternalAnalysisAPI
} from './analysis-error-handler.ts';

import { createLogger } from './logging.ts';

Deno.test('AnalysisError - should create error with all properties', () => {
  const error = new AnalysisError(
    ANALYSIS_ERROR_CODES.TICKER_VALIDATION_FAILED,
    'Invalid ticker format',
    AnalysisStage.VALIDATION,
    'Ticker must be 1-5 letters',
    undefined,
    'INVALID',
    'trading'
  );

  assertEquals(error.code, ANALYSIS_ERROR_CODES.TICKER_VALIDATION_FAILED);
  assertEquals(error.message, 'Invalid ticker format');
  assertEquals(error.stage, AnalysisStage.VALIDATION);
  assertEquals(error.details, 'Ticker must be 1-5 letters');
  assertEquals(error.ticker, 'INVALID');
  assertEquals(error.analysisContext, 'trading');
});

Deno.test('TickerValidator - should validate valid tickers', () => {
  const validTickers = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'BRK.A'];
  
  for (const ticker of validTickers) {
    const result = TickerValidator.validate(ticker);
    assert(result.valid, `${ticker} should be valid`);
    assertEquals(result.normalized, ticker.toUpperCase());
    assertEquals(result.errors.length, 0);
  }
});

Deno.test('TickerValidator - should reject invalid tickers', () => {
  const invalidTickers = [
    { ticker: '', expectedError: 'empty' },
    { ticker: 'TOOLONG', expectedError: 'too long' },
    { ticker: '123', expectedError: 'invalid format' },
    { ticker: 'TEST', expectedError: 'reserved' },
    { ticker: 'A.TOOLONG', expectedError: 'invalid format' }
  ];
  
  for (const { ticker } of invalidTickers) {
    const result = TickerValidator.validate(ticker);
    assert(!result.valid, `${ticker} should be invalid`);
    assert(result.errors.length > 0, `${ticker} should have errors`);
  }
});

Deno.test('AnalysisPipelineMonitor - should track stage timings', async () => {
  const monitor = new AnalysisPipelineMonitor('test-123', 'AAPL', 'trading');
  
  monitor.startStage(AnalysisStage.VALIDATION);
  await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
  monitor.endStage(AnalysisStage.VALIDATION, { valid: true });
  
  monitor.startStage(AnalysisStage.FUNDAMENTAL_ANALYSIS);
  await new Promise(resolve => setTimeout(resolve, 20)); // Small delay
  monitor.endStage(AnalysisStage.FUNDAMENTAL_ANALYSIS, { score: 75 });
  
  const summary = monitor.getSummary();
  
  assertEquals(summary.ticker, 'AAPL');
  assertEquals(summary.analysisContext, 'trading');
  assertEquals(summary.success, true);
  assertEquals(summary.errors.length, 0);
  assert(summary.stageTimings[AnalysisStage.VALIDATION] > 0);
  assert(summary.stageTimings[AnalysisStage.FUNDAMENTAL_ANALYSIS] > 0);
  assertEquals(Object.keys(summary.partialResults).length, 2);
});

Deno.test('AnalysisPipelineMonitor - should handle stage errors', () => {
  const monitor = new AnalysisPipelineMonitor('test-456', 'MSFT', 'investment');
  
  monitor.startStage(AnalysisStage.TECHNICAL_ANALYSIS);
  
  const error = new AnalysisError(
    ANALYSIS_ERROR_CODES.EXTERNAL_API_ERROR,
    'API timeout',
    AnalysisStage.TECHNICAL_ANALYSIS
  );
  
  monitor.endStage(AnalysisStage.TECHNICAL_ANALYSIS, undefined, error);
  
  const summary = monitor.getSummary();
  
  assertEquals(summary.success, false);
  assertEquals(summary.errors.length, 1);
  assertEquals(summary.errors[0].code, ANALYSIS_ERROR_CODES.EXTERNAL_API_ERROR);
});

Deno.test('AnalysisPipelineMonitor - should detect partial results capability', () => {
  const monitor = new AnalysisPipelineMonitor('test-789', 'GOOGL', 'trading');
  
  // Add two successful analyses
  monitor.startStage(AnalysisStage.FUNDAMENTAL_ANALYSIS);
  monitor.endStage(AnalysisStage.FUNDAMENTAL_ANALYSIS, { score: 80 });
  
  monitor.startStage(AnalysisStage.TECHNICAL_ANALYSIS);
  monitor.endStage(AnalysisStage.TECHNICAL_ANALYSIS, { score: 70 });
  
  // Should be able to continue with 2 out of 3 analyses
  assert(monitor.canContinueWithPartialResults());
  
  const partialResults = monitor.getPartialResultsForSynthesis();
  assertEquals(partialResults.fundamental_result.score, 80);
  assertEquals(partialResults.technical_result.score, 70);
  assertEquals(partialResults.esg_result, undefined);
});

Deno.test('Rate Limiter - should enforce rate limits', () => {
  const rateLimiter = globalRateLimiter;
  
  // Test with custom low limit
  const customLimit = { limit: 2, windowMs: 1000 };
  
  // First two requests should be allowed
  let result = rateLimiter.checkRateLimit('test-api', customLimit);
  assert(result.allowed);
  assertEquals(result.remaining, 1);
  
  result = rateLimiter.checkRateLimit('test-api', customLimit);
  assert(result.allowed);
  assertEquals(result.remaining, 0);
  
  // Third request should be denied
  result = rateLimiter.checkRateLimit('test-api', customLimit);
  assert(!result.allowed);
  assertEquals(result.remaining, 0);
  assert(result.retryAfter! > 0);
});

Deno.test('Rate Limiter - should reset after window expires', async () => {
  const rateLimiter = globalRateLimiter;
  const customLimit = { limit: 1, windowMs: 50 }; // Very short window
  
  // Use up the limit
  let result = rateLimiter.checkRateLimit('test-reset-api', customLimit);
  assert(result.allowed);
  
  // Should be denied
  result = rateLimiter.checkRateLimit('test-reset-api', customLimit);
  assert(!result.allowed);
  
  // Wait for window to reset
  await new Promise(resolve => setTimeout(resolve, 60));
  
  // Should be allowed again
  result = rateLimiter.checkRateLimit('test-reset-api', customLimit);
  assert(result.allowed);
});

Deno.test('Circuit Breaker - should open after failures', async () => {
  const breaker = globalCircuitBreakers.getBreaker('database');
  
  // Reset breaker state
  breaker.reset();
  assertEquals(breaker.getState(), 'closed');
  
  // Simulate failures
  const failingOperation = () => Promise.reject(new Error('Database error'));
  
  // Should fail and eventually open the breaker
  for (let i = 0; i < 5; i++) {
    try {
      await breaker.execute(failingOperation);
    } catch (error) {
      // Expected to fail
    }
  }
  
  // Breaker should now be open
  assertEquals(breaker.getState(), 'open');
  
  // Next call should fail fast
  try {
    await breaker.execute(() => Promise.resolve('success'));
    assert(false, 'Should have failed fast');
  } catch (error) {
    assert(error.message.includes('Circuit breaker is open'));
  }
});

Deno.test('GracefulDegradationHandler - should handle partial failures', () => {
  const monitor = new AnalysisPipelineMonitor('test-graceful', 'TSLA', 'investment');
  
  // Add successful analyses
  monitor.startStage(AnalysisStage.FUNDAMENTAL_ANALYSIS);
  monitor.endStage(AnalysisStage.FUNDAMENTAL_ANALYSIS, { score: 85 });
  
  monitor.startStage(AnalysisStage.TECHNICAL_ANALYSIS);
  monitor.endStage(AnalysisStage.TECHNICAL_ANALYSIS, { score: 75 });
  
  // Simulate failure in ESG analysis
  const error = new AnalysisError(
    ANALYSIS_ERROR_CODES.EXTERNAL_API_ERROR,
    'ESG API unavailable',
    AnalysisStage.SENTIMENT_ECO_ANALYSIS
  );
  
  const result = GracefulDegradationHandler.handlePartialFailure(
    monitor,
    AnalysisStage.SENTIMENT_ECO_ANALYSIS,
    error
  );
  
  assert(result.canContinue);
  assert(result.fallbackData);
  assertEquals(result.fallbackData.score, 50); // Neutral fallback score
  assert(result.adjustedConfidence < 0.8); // Reduced confidence
});

Deno.test('GracefulDegradationHandler - should reject if too few analyses', () => {
  const monitor = new AnalysisPipelineMonitor('test-reject', 'BRK.A', 'trading');
  
  // Add only one successful analysis
  monitor.startStage(AnalysisStage.FUNDAMENTAL_ANALYSIS);
  monitor.endStage(AnalysisStage.FUNDAMENTAL_ANALYSIS, { score: 90 });
  
  // Simulate failures in other analyses
  const error = new AnalysisError(
    ANALYSIS_ERROR_CODES.EXTERNAL_API_ERROR,
    'Multiple API failures',
    AnalysisStage.TECHNICAL_ANALYSIS
  );
  
  const result = GracefulDegradationHandler.handlePartialFailure(
    monitor,
    AnalysisStage.TECHNICAL_ANALYSIS,
    error
  );
  
  assert(!result.canContinue);
  assertEquals(result.adjustedConfidence, 0);
});

Deno.test('AnalysisPerformanceMonitor - should record performance metrics', () => {
  // Record some test analyses
  AnalysisPerformanceMonitor.recordAnalysis('AAPL', 'trading', 2500, true, {
    validation: 100,
    fundamental: 800,
    technical: 600,
    synthesis: 1000
  });
  
  AnalysisPerformanceMonitor.recordAnalysis('AAPL', 'trading', 3000, true, {
    validation: 150,
    fundamental: 900,
    technical: 700,
    synthesis: 1250
  });
  
  AnalysisPerformanceMonitor.recordAnalysis('AAPL', 'trading', 5000, false, {
    validation: 200,
    fundamental: 2000,
    technical: 1500,
    synthesis: 1300
  });
  
  const stats = AnalysisPerformanceMonitor.getStats();
  const appleStats = stats['AAPL-trading'];
  
  assert(appleStats);
  assertEquals(appleStats.totalAnalyses, 3);
  assertEquals(Math.round(appleStats.averageDuration), 3500); // (2500 + 3000 + 5000) / 3
  assertEquals(Math.round(appleStats.errorRate * 100) / 100, 0.33); // 1 error out of 3
});

Deno.test('callExternalAnalysisAPI - should handle successful API calls', async () => {
  const mockSuccessfulAPI = () => Promise.resolve({ data: 'success' });
  
  const result = await callExternalAnalysisAPI(
    'test-api',
    mockSuccessfulAPI,
    {
      stage: AnalysisStage.FUNDAMENTAL_ANALYSIS,
      ticker: 'AAPL',
      timeout: 1000
    }
  );
  
  assertEquals(result.data, 'success');
});

Deno.test('callExternalAnalysisAPI - should handle API failures with retry', async () => {
  let attempts = 0;
  const mockFailingAPI = () => {
    attempts++;
    if (attempts < 3) {
      return Promise.reject(new Error('Temporary failure'));
    }
    return Promise.resolve({ data: 'success after retry' });
  };
  
  const result = await callExternalAnalysisAPI(
    'test-retry-api',
    mockFailingAPI,
    {
      stage: AnalysisStage.TECHNICAL_ANALYSIS,
      ticker: 'MSFT',
      timeout: 1000,
      retryConfig: {
        maxAttempts: 3,
        baseDelay: 10,
        maxDelay: 100,
        backoffMultiplier: 2,
        jitter: false
      }
    }
  );
  
  assertEquals(result.data, 'success after retry');
  assertEquals(attempts, 3);
});

Deno.test('callExternalAnalysisAPI - should throw AnalysisError on failure', async () => {
  const mockFailingAPI = () => Promise.reject(new Error('Permanent failure'));
  
  try {
    await callExternalAnalysisAPI(
      'test-fail-api',
      mockFailingAPI,
      {
        stage: AnalysisStage.SENTIMENT_ECO_ANALYSIS,
        ticker: 'GOOGL',
        timeout: 1000,
        retryConfig: {
          maxAttempts: 1,
          baseDelay: 10,
          maxDelay: 100,
          backoffMultiplier: 2,
          jitter: false
        }
      }
    );
    assert(false, 'Should have thrown an error');
  } catch (error) {
    assert(error instanceof AnalysisError);
    assertEquals(error.stage, AnalysisStage.SENTIMENT_ECO_ANALYSIS);
    assertEquals(error.ticker, 'GOOGL');
  }
});

// Integration test for complete error handling flow
Deno.test('Integration - complete error handling flow', async () => {
  const logger = createLogger('test', 'integration-test');
  const monitor = new AnalysisPipelineMonitor('integration-test', 'NVDA', 'investment', logger);
  
  // Simulate successful validation
  monitor.startStage(AnalysisStage.VALIDATION);
  const tickerValidation = TickerValidator.validate('NVDA');
  assert(tickerValidation.valid);
  monitor.endStage(AnalysisStage.VALIDATION, tickerValidation);
  
  // Simulate successful fundamental analysis
  monitor.startStage(AnalysisStage.FUNDAMENTAL_ANALYSIS);
  const fundamentalResult = { score: 82, factors: [], confidence: 0.85 };
  monitor.endStage(AnalysisStage.FUNDAMENTAL_ANALYSIS, fundamentalResult);
  
  // Simulate failed technical analysis
  monitor.startStage(AnalysisStage.TECHNICAL_ANALYSIS);
  const technicalError = new AnalysisError(
    ANALYSIS_ERROR_CODES.EXTERNAL_API_ERROR,
    'Technical data API timeout',
    AnalysisStage.TECHNICAL_ANALYSIS,
    'Connection timeout after 30s',
    undefined,
    'NVDA',
    'investment'
  );
  monitor.endStage(AnalysisStage.TECHNICAL_ANALYSIS, undefined, technicalError);
  
  // Simulate successful ESG analysis
  monitor.startStage(AnalysisStage.SENTIMENT_ECO_ANALYSIS);
  const esgResult = { score: 78, factors: [], key_ecos: [], confidence: 0.80 };
  monitor.endStage(AnalysisStage.SENTIMENT_ECO_ANALYSIS, esgResult);
  
  // Check if we can continue with partial results
  assert(monitor.canContinueWithPartialResults());
  
  // Handle graceful degradation
  const degradationResult = GracefulDegradationHandler.handlePartialFailure(
    monitor,
    AnalysisStage.TECHNICAL_ANALYSIS,
    technicalError
  );
  
  assert(degradationResult.canContinue);
  assert(degradationResult.fallbackData);
  assert(degradationResult.adjustedConfidence < 0.8);
  
  // Get final summary
  const summary = monitor.getSummary();
  assertEquals(summary.errors.length, 1);
  assertEquals(summary.warnings.length, 0);
  assert(summary.totalDuration > 0);
  assertEquals(Object.keys(summary.partialResults).length, 3); // Including validation
  
  // Verify partial results can be used for synthesis
  const partialResults = monitor.getPartialResultsForSynthesis();
  assertEquals(partialResults.fundamental_result.score, 82);
  assertEquals(partialResults.esg_result.score, 78);
  assert(partialResults.technical_result === undefined);
});

console.log('All analysis error handling tests completed successfully!');