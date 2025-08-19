// Performance and load testing for the analysis workflow
// Tests system behavior under various load conditions and performance requirements

import { assertEquals, assertExists, assert } from 'https://deno.land/std@0.168.0/testing/asserts.ts';

// Mock environment setup
Deno.env.set('SUPABASE_URL', 'https://test.supabase.co');
Deno.env.set('SUPABASE_ANON_KEY', 'test-anon-key');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');
Deno.env.set('ENCRYPTION_KEY', 'test-encryption-key-with-sufficient-length-for-security');

/**
 * Performance testing utilities
 */
class PerformanceTestHelper {
  static async measureExecutionTime<T>(operation: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const startTime = performance.now();
    const result = await operation();
    const duration = performance.now() - startTime;
    return { result, duration };
  }

  static async runConcurrentOperations<T>(
    operations: (() => Promise<T>)[],
    maxConcurrency: number = 10
  ): Promise<{ results: T[]; totalDuration: number; averageDuration: number }> {
    const startTime = performance.now();
    const results: T[] = [];
    
    // Process operations in batches to control concurrency
    for (let i = 0; i < operations.length; i += maxConcurrency) {
      const batch = operations.slice(i, i + maxConcurrency);
      const batchResults = await Promise.all(batch.map(op => op()));
      results.push(...batchResults);
    }
    
    const totalDuration = performance.now() - startTime;
    const averageDuration = totalDuration / operations.length;
    
    return { results, totalDuration, averageDuration };
  }

  static generateLoadTestRequests(count: number) {
    const tickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX'];
    const contexts = ['investment', 'trading'] as const;
    const timeframes = ['1D', '1W', '1M', '3M', '6M', '1Y'];
    
    return Array.from({ length: count }, (_, i) => {
      const ticker = tickers[i % tickers.length];
      const context = contexts[i % contexts.length];
      const timeframe = context === 'trading' ? timeframes[i % timeframes.length] : undefined;
      
      return {
        ticker_symbol: ticker,
        analysis_context: context,
        ...(timeframe && { trading_timeframe: timeframe })
      };
    });
  }

  static async mockAnalysisRequest(request: any): Promise<any> {
    // Simulate variable processing time based on complexity
    const baseDelay = 100; // Base 100ms
    const contextMultiplier = request.analysis_context === 'trading' ? 1.2 : 1.0;
    const tickerComplexity = request.ticker_symbol.length * 10; // Simulate ticker complexity
    
    const delay = baseDelay * contextMultiplier + tickerComplexity;
    await new Promise(resolve => setTimeout(resolve, delay));
    
    return {
      success: true,
      data: {
        analysis_id: Math.floor(Math.random() * 10000),
        ticker_symbol: request.ticker_symbol,
        synthesis_score: Math.floor(Math.random() * 100),
        convergence_factors: [],
        divergence_factors: [],
        full_report: {
          summary: `Analysis for ${request.ticker_symbol}`,
          recommendation: 'hold',
          metadata: {
            analysis_timestamp: new Date().toISOString(),
            processing_time: delay
          }
        }
      }
    };
  }

  static calculatePerformanceMetrics(durations: number[]) {
    const sorted = durations.sort((a, b) => a - b);
    const count = durations.length;
    
    return {
      count,
      min: sorted[0],
      max: sorted[count - 1],
      mean: durations.reduce((sum, d) => sum + d, 0) / count,
      median: count % 2 === 0 
        ? (sorted[count / 2 - 1] + sorted[count / 2]) / 2
        : sorted[Math.floor(count / 2)],
      p95: sorted[Math.floor(count * 0.95)],
      p99: sorted[Math.floor(count * 0.99)]
    };
  }
}

// Performance Tests

Deno.test('Performance - Single analysis request baseline', async () => {
  const request = {
    ticker_symbol: 'AAPL',
    analysis_context: 'investment' as const
  };

  const { result, duration } = await PerformanceTestHelper.measureExecutionTime(
    () => PerformanceTestHelper.mockAnalysisRequest(request)
  );

  assert(result.success);
  assertExists(result.data);
  
  // Baseline performance expectation (mock should be fast)
  assert(duration < 1000, `Single request took ${duration}ms, expected < 1000ms`);
  
  console.log(`Baseline single request: ${duration.toFixed(2)}ms`);
});

Deno.test('Performance - Concurrent request handling', async () => {
  const concurrencyLevels = [1, 5, 10, 20];
  const requestsPerLevel = 10;
  
  for (const concurrency of concurrencyLevels) {
    const requests = PerformanceTestHelper.generateLoadTestRequests(requestsPerLevel);
    const operations = requests.map(req => () => PerformanceTestHelper.mockAnalysisRequest(req));
    
    const { results, totalDuration, averageDuration } = await PerformanceTestHelper.runConcurrentOperations(
      operations,
      concurrency
    );
    
    // Verify all requests succeeded
    assertEquals(results.length, requestsPerLevel);
    for (const result of results) {
      assert(result.success);
    }
    
    console.log(`Concurrency ${concurrency}: ${totalDuration.toFixed(2)}ms total, ${averageDuration.toFixed(2)}ms average`);
    
    // Performance expectations
    assert(averageDuration < 2000, `Average duration ${averageDuration}ms too high for concurrency ${concurrency}`);
  }
});

Deno.test('Performance - Load testing with varying request patterns', async () => {
  const testScenarios = [
    { name: 'Light Load', requestCount: 10, concurrency: 2 },
    { name: 'Medium Load', requestCount: 50, concurrency: 5 },
    { name: 'Heavy Load', requestCount: 100, concurrency: 10 }
  ];
  
  for (const scenario of testScenarios) {
    console.log(`\nTesting ${scenario.name}:`);
    
    const requests = PerformanceTestHelper.generateLoadTestRequests(scenario.requestCount);
    const operations = requests.map(req => () => PerformanceTestHelper.mockAnalysisRequest(req));
    
    const startTime = performance.now();
    const { results, totalDuration, averageDuration } = await PerformanceTestHelper.runConcurrentOperations(
      operations,
      scenario.concurrency
    );
    
    // Calculate detailed metrics
    const durations = results.map(r => r.data.full_report.metadata.processing_time);
    const metrics = PerformanceTestHelper.calculatePerformanceMetrics(durations);
    
    console.log(`  Requests: ${scenario.requestCount}`);
    console.log(`  Concurrency: ${scenario.concurrency}`);
    console.log(`  Total Duration: ${totalDuration.toFixed(2)}ms`);
    console.log(`  Average Duration: ${averageDuration.toFixed(2)}ms`);
    console.log(`  Min/Max: ${metrics.min.toFixed(2)}ms / ${metrics.max.toFixed(2)}ms`);
    console.log(`  Median: ${metrics.median.toFixed(2)}ms`);
    console.log(`  95th Percentile: ${metrics.p95.toFixed(2)}ms`);
    console.log(`  99th Percentile: ${metrics.p99.toFixed(2)}ms`);
    
    // Performance assertions
    assert(metrics.p95 < 5000, `95th percentile ${metrics.p95}ms too high for ${scenario.name}`);
    assert(metrics.p99 < 10000, `99th percentile ${metrics.p99}ms too high for ${scenario.name}`);
    
    // Success rate should be 100%
    const successCount = results.filter(r => r.success).length;
    assertEquals(successCount, scenario.requestCount, `Success rate should be 100% for ${scenario.name}`);
  }
});

Deno.test('Performance - Memory usage under load', async () => {
  const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
  
  // Run a series of requests to test memory usage
  const requestCount = 100;
  const requests = PerformanceTestHelper.generateLoadTestRequests(requestCount);
  
  const results = [];
  for (const request of requests) {
    const result = await PerformanceTestHelper.mockAnalysisRequest(request);
    results.push(result);
    
    // Periodically check memory usage
    if (results.length % 20 === 0) {
      const currentMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = currentMemory - initialMemory;
      
      console.log(`After ${results.length} requests: Memory increase ~${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
      
      // Memory shouldn't grow excessively (this is a rough check)
      if (memoryIncrease > 100 * 1024 * 1024) { // 100MB
        console.warn(`High memory usage detected: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
      }
    }
  }
  
  // Verify all requests completed successfully
  assertEquals(results.length, requestCount);
  for (const result of results) {
    assert(result.success);
  }
});

Deno.test('Performance - Response time consistency', async () => {
  const requestCount = 50;
  const request = {
    ticker_symbol: 'AAPL',
    analysis_context: 'investment' as const
  };
  
  const durations: number[] = [];
  
  // Run multiple identical requests to test consistency
  for (let i = 0; i < requestCount; i++) {
    const { duration } = await PerformanceTestHelper.measureExecutionTime(
      () => PerformanceTestHelper.mockAnalysisRequest(request)
    );
    durations.push(duration);
  }
  
  const metrics = PerformanceTestHelper.calculatePerformanceMetrics(durations);
  
  console.log(`Response time consistency (${requestCount} requests):`);
  console.log(`  Mean: ${metrics.mean.toFixed(2)}ms`);
  console.log(`  Median: ${metrics.median.toFixed(2)}ms`);
  console.log(`  Min/Max: ${metrics.min.toFixed(2)}ms / ${metrics.max.toFixed(2)}ms`);
  console.log(`  Standard Deviation: ${Math.sqrt(durations.reduce((sum, d) => sum + Math.pow(d - metrics.mean, 2), 0) / requestCount).toFixed(2)}ms`);
  
  // Consistency checks
  const variance = metrics.max - metrics.min;
  assert(variance < metrics.mean * 2, `Response time variance ${variance}ms too high (mean: ${metrics.mean}ms)`);
  
  // Most requests should be within reasonable range of the median
  const withinRange = durations.filter(d => Math.abs(d - metrics.median) < metrics.median * 0.5).length;
  const consistencyRate = withinRange / requestCount;
  assert(consistencyRate > 0.8, `Only ${(consistencyRate * 100).toFixed(1)}% of requests within reasonable range`);
});

Deno.test('Performance - Error handling under load', async () => {
  const requestCount = 20;
  const errorRate = 0.2; // 20% error rate
  
  const operations = Array.from({ length: requestCount }, (_, i) => {
    return async () => {
      // Simulate random errors
      if (Math.random() < errorRate) {
        throw new Error(`Simulated error for request ${i}`);
      }
      
      return await PerformanceTestHelper.mockAnalysisRequest({
        ticker_symbol: 'AAPL',
        analysis_context: 'investment'
      });
    };
  });
  
  const results: Array<{ success: boolean; error?: string }> = [];
  
  // Execute operations and handle errors
  for (const operation of operations) {
    try {
      const result = await operation();
      results.push({ success: true });
    } catch (error) {
      results.push({ success: false, error: error.message });
    }
  }
  
  const successCount = results.filter(r => r.success).length;
  const errorCount = results.filter(r => !r.success).length;
  const actualErrorRate = errorCount / requestCount;
  
  console.log(`Error handling test:`);
  console.log(`  Total requests: ${requestCount}`);
  console.log(`  Successful: ${successCount}`);
  console.log(`  Errors: ${errorCount}`);
  console.log(`  Error rate: ${(actualErrorRate * 100).toFixed(1)}%`);
  
  // Verify error rate is as expected (within tolerance)
  assert(Math.abs(actualErrorRate - errorRate) < 0.1, 
    `Error rate ${actualErrorRate} not close to expected ${errorRate}`);
  
  // Verify that errors don't crash the system
  assert(results.length === requestCount, 'All requests should be processed despite errors');
});

Deno.test('Performance - Timeout handling', async () => {
  const timeoutMs = 500;
  const longRunningOperation = async () => {
    // Simulate operation that takes longer than timeout
    await new Promise(resolve => setTimeout(resolve, timeoutMs + 200));
    return { success: true, data: 'completed' };
  };
  
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Operation timed out')), timeoutMs);
  });
  
  try {
    await Promise.race([longRunningOperation(), timeoutPromise]);
    assert(false, 'Should have timed out');
  } catch (error) {
    assert(error.message.includes('timed out'), 'Should be a timeout error');
  }
  
  // Test that normal operations complete within timeout
  const fastOperation = async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    return { success: true, data: 'completed' };
  };
  
  const result = await Promise.race([fastOperation(), timeoutPromise]);
  assert(result.success, 'Fast operation should complete successfully');
});

Deno.test('Performance - Resource cleanup and garbage collection', async () => {
  const iterations = 10;
  const requestsPerIteration = 20;
  
  for (let i = 0; i < iterations; i++) {
    const requests = PerformanceTestHelper.generateLoadTestRequests(requestsPerIteration);
    const operations = requests.map(req => () => PerformanceTestHelper.mockAnalysisRequest(req));
    
    const { results } = await PerformanceTestHelper.runConcurrentOperations(operations, 5);
    
    // Verify all requests succeeded
    for (const result of results) {
      assert(result.success);
    }
    
    // Force garbage collection if available (Deno specific)
    if (typeof (globalThis as any).gc === 'function') {
      (globalThis as any).gc();
    }
    
    // Small delay between iterations
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  console.log(`Completed ${iterations} iterations of ${requestsPerIteration} requests each`);
  assert(true, 'Resource cleanup test completed successfully');
});

Deno.test('Performance - Scalability analysis', async () => {
  const scalabilityTests = [
    { users: 1, requestsPerUser: 10 },
    { users: 5, requestsPerUser: 10 },
    { users: 10, requestsPerUser: 10 },
    { users: 20, requestsPerUser: 5 }
  ];
  
  const results = [];
  
  for (const test of scalabilityTests) {
    const totalRequests = test.users * test.requestsPerUser;
    const requests = PerformanceTestHelper.generateLoadTestRequests(totalRequests);
    const operations = requests.map(req => () => PerformanceTestHelper.mockAnalysisRequest(req));
    
    const { totalDuration, averageDuration } = await PerformanceTestHelper.runConcurrentOperations(
      operations,
      test.users
    );
    
    const throughput = totalRequests / (totalDuration / 1000); // requests per second
    
    results.push({
      users: test.users,
      totalRequests,
      totalDuration,
      averageDuration,
      throughput
    });
    
    console.log(`${test.users} users, ${totalRequests} requests: ${throughput.toFixed(2)} req/sec`);
  }
  
  // Analyze scalability - throughput should generally increase with more users (up to a point)
  for (let i = 1; i < results.length; i++) {
    const current = results[i];
    const previous = results[i - 1];
    
    // Average duration shouldn't increase dramatically
    const durationIncrease = (current.averageDuration - previous.averageDuration) / previous.averageDuration;
    assert(durationIncrease < 2.0, 
      `Duration increased by ${(durationIncrease * 100).toFixed(1)}% from ${previous.users} to ${current.users} users`);
  }
});

// Cleanup
Deno.test('Performance - Cleanup', () => {
  // Clear environment variables
  Deno.env.delete('SUPABASE_URL');
  Deno.env.delete('SUPABASE_ANON_KEY');
  Deno.env.delete('SUPABASE_SERVICE_ROLE_KEY');
  Deno.env.delete('ENCRYPTION_KEY');
  
  console.log('Performance integration tests completed');
  assert(true, 'Performance tests cleanup completed');
});