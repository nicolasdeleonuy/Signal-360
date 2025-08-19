// Comprehensive tests for caching and performance optimization
// Tests cache functionality, performance optimizations, and resource management

import { assertEquals, assertExists, assert } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import { MemoryCache, CacheManager, CacheKeyGenerators, CacheTTL } from './cache.ts';
import { 
  HTTPConnectionPool, 
  RequestBatcher, 
  ResourceManager, 
  PerformanceMetrics,
  LazyLoader
} from './performance.ts';
import { AnalysisCacheManager, CachedAnalysisService } from './analysis-cache.ts';

// Cache Tests

Deno.test('MemoryCache - Basic operations', () => {
  const cache = new MemoryCache({ maxSize: 10, defaultTtl: 1000 });
  
  // Test set and get
  cache.set('key1', 'value1');
  assertEquals(cache.get('key1'), 'value1');
  
  // Test non-existent key
  assertEquals(cache.get('nonexistent'), null);
  
  // Test has
  assert(cache.has('key1'));
  assert(!cache.has('nonexistent'));
  
  // Test size
  assertEquals(cache.size(), 1);
  
  // Test delete
  assert(cache.delete('key1'));
  assertEquals(cache.size(), 0);
  assert(!cache.has('key1'));
});

Deno.test('MemoryCache - TTL expiration', async () => {
  const cache = new MemoryCache({ maxSize: 10, defaultTtl: 100 });
  
  cache.set('key1', 'value1', 50); // 50ms TTL
  assertEquals(cache.get('key1'), 'value1');
  
  // Wait for expiration
  await new Promise(resolve => setTimeout(resolve, 60));
  assertEquals(cache.get('key1'), null);
});

Deno.test('MemoryCache - LRU eviction', () => {
  const cache = new MemoryCache({ maxSize: 3, defaultTtl: 10000 });
  
  // Fill cache
  cache.set('key1', 'value1');
  cache.set('key2', 'value2');
  cache.set('key3', 'value3');
  assertEquals(cache.size(), 3);
  
  // Access key1 to make it recently used
  cache.get('key1');
  
  // Add another item, should evict key2 (least recently used)
  cache.set('key4', 'value4');
  assertEquals(cache.size(), 3);
  assert(cache.has('key1'));
  assert(!cache.has('key2')); // Should be evicted
  assert(cache.has('key3'));
  assert(cache.has('key4'));
});

Deno.test('MemoryCache - Metrics tracking', () => {
  const cache = new MemoryCache({ maxSize: 10, defaultTtl: 1000, enableMetrics: true });
  
  // Generate some cache activity
  cache.set('key1', 'value1');
  cache.set('key2', 'value2');
  cache.get('key1'); // Hit
  cache.get('key3'); // Miss
  cache.delete('key2');
  
  const metrics = cache.getMetrics();
  assertEquals(metrics.hits, 1);
  assertEquals(metrics.misses, 1);
  assertEquals(metrics.sets, 2);
  assertEquals(metrics.deletes, 1);
  assertEquals(metrics.hitRate, 0.5);
});

Deno.test('MemoryCache - Cleanup expired entries', async () => {
  const cache = new MemoryCache({ 
    maxSize: 10, 
    defaultTtl: 50,
    cleanupInterval: 1000 // Disable automatic cleanup
  });
  
  cache.set('key1', 'value1', 30);
  cache.set('key2', 'value2', 100);
  assertEquals(cache.size(), 2);
  
  // Wait for first key to expire
  await new Promise(resolve => setTimeout(resolve, 40));
  
  // Manual cleanup
  const removedCount = cache.cleanup();
  assertEquals(removedCount, 1);
  assertEquals(cache.size(), 1);
  assert(!cache.has('key1'));
  assert(cache.has('key2'));
});

Deno.test('CacheKeyGenerators - Generate correct keys', () => {
  assertEquals(
    CacheKeyGenerators.analysis('AAPL', 'investment'),
    'analysis:AAPL:investment'
  );
  
  assertEquals(
    CacheKeyGenerators.analysis('MSFT', 'trading', '1D'),
    'analysis:MSFT:trading:1D'
  );
  
  assertEquals(
    CacheKeyGenerators.marketData('GOOGL', 'price', '1W'),
    'market:GOOGL:price:1W'
  );
  
  assertEquals(
    CacheKeyGenerators.fundamentals('AMZN'),
    'fundamentals:AMZN'
  );
  
  assertEquals(
    CacheKeyGenerators.esg('TSLA'),
    'esg:TSLA'
  );
});

Deno.test('CacheManager - Manage multiple cache instances', () => {
  const cache1 = CacheManager.getCache('test-cache-1');
  const cache2 = CacheManager.getCache('test-cache-2');
  const cache1Again = CacheManager.getCache('test-cache-1');
  
  // Should return same instance for same name
  assertEquals(cache1, cache1Again);
  
  // Should return different instances for different names
  assert(cache1 !== cache2);
  
  // Test operations
  cache1.set('key1', 'value1');
  cache2.set('key1', 'value2');
  
  assertEquals(cache1.get('key1'), 'value1');
  assertEquals(cache2.get('key1'), 'value2');
  
  // Test clear all
  CacheManager.clearAll();
  assertEquals(cache1.get('key1'), null);
  assertEquals(cache2.get('key1'), null);
});

// Performance Tests

Deno.test('HTTPConnectionPool - Basic connection management', async () => {
  const pool = new HTTPConnectionPool({ maxConnections: 3, minConnections: 1 });
  
  const conn1 = await pool.getConnection('example.com');
  assertExists(conn1);
  assert(conn1.inUse);
  
  const conn2 = await pool.getConnection('example.com');
  assertExists(conn2);
  assert(conn1.id !== conn2.id);
  
  // Release connection
  pool.releaseConnection('example.com', conn1);
  assert(!conn1.inUse);
});

Deno.test('RequestBatcher - Batch requests correctly', async () => {
  let batchCount = 0;
  const processor = async (requests: string[]) => {
    batchCount++;
    return requests.map(req => `processed-${req}`);
  };
  
  const batcher = new RequestBatcher(
    processor,
    (req: string) => 'batch-key',
    { batchSize: 3, batchTimeout: 100 }
  );
  
  // Send requests
  const promises = [
    batcher.batch('req1'),
    batcher.batch('req2'),
    batcher.batch('req3')
  ];
  
  const results = await Promise.all(promises);
  
  assertEquals(results, ['processed-req1', 'processed-req2', 'processed-req3']);
  assertEquals(batchCount, 1); // Should have batched into single call
});

Deno.test('RequestBatcher - Timeout-based batching', async () => {
  let batchCount = 0;
  const processor = async (requests: string[]) => {
    batchCount++;
    return requests.map(req => `processed-${req}`);
  };
  
  const batcher = new RequestBatcher(
    processor,
    (req: string) => 'batch-key',
    { batchSize: 10, batchTimeout: 50 }
  );
  
  // Send fewer requests than batch size
  const promise1 = batcher.batch('req1');
  const promise2 = batcher.batch('req2');
  
  const results = await Promise.all([promise1, promise2]);
  
  assertEquals(results, ['processed-req1', 'processed-req2']);
  assertEquals(batchCount, 1); // Should have processed due to timeout
});

Deno.test('ResourceManager - Resource monitoring', () => {
  const resourceManager = ResourceManager.getInstance();
  
  const resources = resourceManager.checkResources();
  assertExists(resources.memory);
  assertExists(resources.cpu);
  assertExists(resources.overall);
  
  const usage = resourceManager.getResourceUsage();
  assert(usage.memoryMB >= 0);
  assert(usage.cpuPercent >= 0);
});

Deno.test('PerformanceMetrics - Record and retrieve metrics', () => {
  PerformanceMetrics.clear();
  
  // Record some metrics
  PerformanceMetrics.record('test-operation', 100);
  PerformanceMetrics.record('test-operation', 200);
  PerformanceMetrics.record('test-operation', 150);
  
  const metrics = PerformanceMetrics.getMetrics('test-operation');
  assertExists(metrics);
  assertEquals(metrics.count, 3);
  assertEquals(metrics.totalTime, 450);
  assertEquals(metrics.minTime, 100);
  assertEquals(metrics.maxTime, 200);
  assertEquals(metrics.avgTime, 150);
});

Deno.test('LazyLoader - Load value lazily', async () => {
  let loadCount = 0;
  const loader = new LazyLoader(async () => {
    loadCount++;
    await new Promise(resolve => setTimeout(resolve, 10));
    return `loaded-value-${loadCount}`;
  });
  
  assert(!loader.isLoaded());
  
  // First access should load
  const value1 = await loader.get();
  assertEquals(value1, 'loaded-value-1');
  assertEquals(loadCount, 1);
  assert(loader.isLoaded());
  
  // Second access should return cached value
  const value2 = await loader.get();
  assertEquals(value2, 'loaded-value-1');
  assertEquals(loadCount, 1); // Should not load again
  
  // Clear and load again
  loader.clear();
  assert(!loader.isLoaded());
  
  const value3 = await loader.get();
  assertEquals(value3, 'loaded-value-2');
  assertEquals(loadCount, 2);
});

// Analysis Cache Tests

Deno.test('AnalysisCacheManager - Market data caching', () => {
  const cacheManager = new AnalysisCacheManager();
  
  const marketData = { price: 150.25, volume: 1000000 };
  
  // Cache market data
  cacheManager.cacheMarketData('AAPL', 'price', marketData, '1D');
  
  // Retrieve cached data
  const cached = cacheManager.getMarketData('AAPL', 'price', '1D');
  assertEquals(cached, marketData);
  
  // Test cache miss
  const notCached = cacheManager.getMarketData('MSFT', 'price', '1D');
  assertEquals(notCached, null);
});

Deno.test('AnalysisCacheManager - Fundamentals caching', () => {
  const cacheManager = new AnalysisCacheManager();
  
  const fundamentals = {
    pe_ratio: 25.5,
    roe: 0.23,
    debt_to_equity: 0.65
  };
  
  cacheManager.cacheFundamentals('AAPL', fundamentals);
  
  const cached = cacheManager.getFundamentals('AAPL');
  assertEquals(cached, fundamentals);
});

Deno.test('AnalysisCacheManager - Technical analysis caching', () => {
  const cacheManager = new AnalysisCacheManager();
  
  const technicalData = {
    sma_20: 148.75,
    rsi: 65.5,
    macd: 2.3
  };
  
  cacheManager.cacheTechnical('AAPL', 'sma', '1D', technicalData);
  
  const cached = cacheManager.getTechnical('AAPL', 'sma', '1D');
  assertEquals(cached, technicalData);
});

Deno.test('AnalysisCacheManager - ESG data caching', () => {
  const cacheManager = new AnalysisCacheManager();
  
  const esgData = {
    environmental_score: 85,
    social_score: 78,
    governance_score: 83
  };
  
  cacheManager.cacheESG('AAPL', esgData);
  
  const cached = cacheManager.getESG('AAPL');
  assertEquals(cached, esgData);
});

Deno.test('AnalysisCacheManager - Synthesis caching', () => {
  const cacheManager = new AnalysisCacheManager();
  
  const synthesisData = {
    synthesis_score: 76,
    convergence_factors: [],
    divergence_factors: []
  };
  
  cacheManager.cacheSynthesis('AAPL', 'investment', undefined, synthesisData);
  
  const cached = cacheManager.getSynthesis('AAPL', 'investment');
  assertEquals(cached, synthesisData);
});

Deno.test('AnalysisCacheManager - Ideas caching', () => {
  const cacheManager = new AnalysisCacheManager();
  
  const ideasData = {
    ticker_symbol: 'MSFT',
    justification: 'Strong fundamentals'
  };
  
  cacheManager.cacheIdeas('investment_idea', undefined, ideasData);
  
  const cached = cacheManager.getIdeas('investment_idea');
  assertEquals(cached, ideasData);
});

Deno.test('AnalysisCacheManager - User API key caching', () => {
  const cacheManager = new AnalysisCacheManager();
  
  const apiKey = 'AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI';
  
  cacheManager.cacheUserApiKey('user-123', apiKey);
  
  const cached = cacheManager.getUserApiKey('user-123');
  assertEquals(cached, apiKey);
});

Deno.test('AnalysisCacheManager - Cache invalidation', () => {
  const cacheManager = new AnalysisCacheManager();
  
  // Cache some data for AAPL
  cacheManager.cacheMarketData('AAPL', 'price', { price: 150 });
  cacheManager.cacheFundamentals('AAPL', { pe: 25 });
  cacheManager.cacheESG('AAPL', { score: 85 });
  
  // Verify data is cached
  assertExists(cacheManager.getMarketData('AAPL', 'price'));
  assertExists(cacheManager.getFundamentals('AAPL'));
  assertExists(cacheManager.getESG('AAPL'));
  
  // Invalidate ticker
  cacheManager.invalidateTicker('AAPL');
  
  // Verify data is cleared
  assertEquals(cacheManager.getMarketData('AAPL', 'price'), null);
  assertEquals(cacheManager.getFundamentals('AAPL'), null);
  assertEquals(cacheManager.getESG('AAPL'), null);
});

Deno.test('AnalysisCacheManager - Cache statistics', () => {
  const cacheManager = new AnalysisCacheManager();
  
  // Add some data
  cacheManager.cacheMarketData('AAPL', 'price', { price: 150 });
  cacheManager.cacheFundamentals('MSFT', { pe: 20 });
  
  const stats = cacheManager.getCacheStats();
  
  assertExists(stats.marketData);
  assertExists(stats.fundamentals);
  assertExists(stats.technical);
  assertExists(stats.esg);
  assertExists(stats.synthesis);
  assertExists(stats.ideas);
  assertExists(stats.userApiKeys);
  
  assert(stats.marketData.size > 0);
  assert(stats.fundamentals.size > 0);
});

Deno.test('CachedAnalysisService - Cached fundamental analysis', async () => {
  const cacheManager = new AnalysisCacheManager();
  const service = new CachedAnalysisService(cacheManager);
  
  let fetchCount = 0;
  const fetcher = async () => {
    fetchCount++;
    return { pe_ratio: 25.5, roe: 0.23 };
  };
  
  // First call should fetch
  const result1 = await service.getFundamentalAnalysis('AAPL', fetcher);
  assertEquals(fetchCount, 1);
  assertEquals(result1.pe_ratio, 25.5);
  
  // Second call should use cache
  const result2 = await service.getFundamentalAnalysis('AAPL', fetcher);
  assertEquals(fetchCount, 1); // Should not fetch again
  assertEquals(result2.pe_ratio, 25.5);
});

Deno.test('CachedAnalysisService - Cached technical analysis', async () => {
  const cacheManager = new AnalysisCacheManager();
  const service = new CachedAnalysisService(cacheManager);
  
  let fetchCount = 0;
  const fetcher = async () => {
    fetchCount++;
    return { sma_20: 148.75, rsi: 65.5 };
  };
  
  // First call should fetch
  const result1 = await service.getTechnicalAnalysis('AAPL', 'sma', '1D', fetcher);
  assertEquals(fetchCount, 1);
  assertEquals(result1.sma_20, 148.75);
  
  // Second call should use cache
  const result2 = await service.getTechnicalAnalysis('AAPL', 'sma', '1D', fetcher);
  assertEquals(fetchCount, 1); // Should not fetch again
  assertEquals(result2.sma_20, 148.75);
});

Deno.test('CachedAnalysisService - Cached ESG analysis', async () => {
  const cacheManager = new AnalysisCacheManager();
  const service = new CachedAnalysisService(cacheManager);
  
  let fetchCount = 0;
  const fetcher = async () => {
    fetchCount++;
    return { environmental_score: 85, social_score: 78 };
  };
  
  // First call should fetch
  const result1 = await service.getESGAnalysis('AAPL', fetcher);
  assertEquals(fetchCount, 1);
  assertEquals(result1.environmental_score, 85);
  
  // Second call should use cache
  const result2 = await service.getESGAnalysis('AAPL', fetcher);
  assertEquals(fetchCount, 1); // Should not fetch again
  assertEquals(result2.environmental_score, 85);
});

Deno.test('CachedAnalysisService - Cached synthesis', async () => {
  const cacheManager = new AnalysisCacheManager();
  const service = new CachedAnalysisService(cacheManager);
  
  let synthesisCount = 0;
  const synthesizer = async () => {
    synthesisCount++;
    return { synthesis_score: 76, convergence_factors: [] };
  };
  
  // First call should synthesize
  const result1 = await service.getSynthesis('AAPL', 'investment', undefined, synthesizer);
  assertEquals(synthesisCount, 1);
  assertEquals(result1.synthesis_score, 76);
  
  // Second call should use cache
  const result2 = await service.getSynthesis('AAPL', 'investment', undefined, synthesizer);
  assertEquals(synthesisCount, 1); // Should not synthesize again
  assertEquals(result2.synthesis_score, 76);
});

Deno.test('CachedAnalysisService - Cached ideas', async () => {
  const cacheManager = new AnalysisCacheManager();
  const service = new CachedAnalysisService(cacheManager);
  
  let generationCount = 0;
  const generator = async () => {
    generationCount++;
    return { ticker_symbol: 'MSFT', justification: 'Strong growth' };
  };
  
  // First call should generate
  const result1 = await service.getIdeas('investment_idea', undefined, generator);
  assertEquals(generationCount, 1);
  assertEquals(result1.ticker_symbol, 'MSFT');
  
  // Second call should use cache
  const result2 = await service.getIdeas('investment_idea', undefined, generator);
  assertEquals(generationCount, 1); // Should not generate again
  assertEquals(result2.ticker_symbol, 'MSFT');
});

// Performance Integration Tests

Deno.test('Performance - Cache hit rate optimization', async () => {
  const cache = new MemoryCache({ maxSize: 100, defaultTtl: 10000, enableMetrics: true });
  
  // Simulate realistic access patterns
  const tickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'];
  const operations = 1000;
  
  for (let i = 0; i < operations; i++) {
    const ticker = tickers[Math.floor(Math.random() * tickers.length)];
    const key = `analysis:${ticker}:investment`;
    
    let value = cache.get(key);
    if (!value) {
      value = { score: Math.random() * 100, timestamp: Date.now() };
      cache.set(key, value);
    }
  }
  
  const metrics = cache.getMetrics();
  
  // Should have reasonable hit rate due to repeated access
  assert(metrics.hitRate > 0.5, `Hit rate ${metrics.hitRate} should be > 0.5`);
  assert(metrics.hits + metrics.misses === operations);
  
  console.log(`Cache performance: ${metrics.hitRate.toFixed(2)} hit rate, ${metrics.hits} hits, ${metrics.misses} misses`);
});

Deno.test('Performance - Memory usage optimization', () => {
  const cache = new MemoryCache({ 
    maxSize: 1000, 
    defaultTtl: 10000, 
    maxMemoryMB: 10,
    enableMetrics: true 
  });
  
  // Fill cache with large objects
  for (let i = 0; i < 100; i++) {
    const largeObject = {
      id: i,
      data: 'x'.repeat(1000), // 1KB of data
      timestamp: Date.now(),
      metadata: { index: i, processed: true }
    };
    cache.set(`large-object-${i}`, largeObject);
  }
  
  const metrics = cache.getMetrics();
  
  // Should manage memory usage
  assert(metrics.memoryUsageMB < 15, `Memory usage ${metrics.memoryUsageMB}MB should be reasonable`);
  assert(cache.size() <= 1000, 'Cache size should not exceed limit');
  
  console.log(`Memory usage: ${metrics.memoryUsageMB.toFixed(2)}MB, ${cache.size()} entries`);
});

// Cleanup
Deno.test('Performance - Cleanup and resource management', () => {
  // Clear all caches
  CacheManager.clearAll();
  
  // Clear performance metrics
  PerformanceMetrics.clear();
  
  // Verify cleanup
  const allMetrics = PerformanceMetrics.getAllMetrics();
  assertEquals(allMetrics.size, 0);
  
  console.log('Cache and performance tests cleanup completed');
  assert(true, 'Cleanup completed successfully');
});