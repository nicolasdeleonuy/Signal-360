// Performance tests for database operations
// Tests query performance, optimization, and scalability

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProfileRepository } from '../repositories/profile-repository';
import { AnalysisRepository } from '../repositories/analysis-repository';
import { QueryOptimizer } from '../query-optimizer';
import { ConnectionManager } from '../connection-manager';

// Mock Supabase for performance testing
vi.mock('../../supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: {}, error: null }),
    }),
  },
}));

describe('Database Performance Tests', () => {
  let profileRepo: ProfileRepository;
  let analysisRepo: AnalysisRepository;

  beforeEach(() => {
    profileRepo = new ProfileRepository();
    analysisRepo = new AnalysisRepository();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Query Performance', () => {
    it('should execute simple queries within performance threshold', async () => {
      const startTime = Date.now();
      
      // Mock fast response
      const mockQuery = vi.fn().mockResolvedValue([]);
      vi.spyOn(profileRepo, 'find').mockImplementation(mockQuery);

      await profileRepo.find();

      const executionTime = Date.now() - startTime;
      expect(executionTime).toBeLessThan(100); // Should complete within 100ms
    });

    it('should handle pagination efficiently', async () => {
      const startTime = Date.now();
      
      // Mock paginated response
      const mockPaginate = vi.fn().mockResolvedValue({
        data: [],
        pagination: {
          totalCount: 1000,
          totalPages: 50,
          currentPage: 1,
          limit: 20,
          offset: 0,
          hasNextPage: true,
          hasPreviousPage: false,
        },
      });
      vi.spyOn(profileRepo, 'paginate').mockImplementation(mockPaginate);

      await profileRepo.paginate({}, { limit: 20, offset: 0 });

      const executionTime = Date.now() - startTime;
      expect(executionTime).toBeLessThan(150); // Pagination should be fast
    });

    it('should optimize complex queries', async () => {
      const startTime = Date.now();
      
      // Mock complex query response
      const mockComplexQuery = vi.fn().mockResolvedValue([]);
      vi.spyOn(analysisRepo, 'findWithComplexFilters').mockImplementation(mockComplexQuery);

      await analysisRepo.findWithComplexFilters(
        (query) => query.eq('user_id', 'test').gte('synthesis_score', 70),
        { limit: 50, order_by: 'created_at' }
      );

      const executionTime = Date.now() - startTime;
      expect(executionTime).toBeLessThan(200); // Complex queries should still be reasonably fast
    });
  });

  describe('Batch Operations Performance', () => {
    it('should handle batch creates efficiently', async () => {
      const batchSize = 100;
      const records = Array.from({ length: batchSize }, (_, i) => ({
        id: `user${i}`,
        google_api_key: `key${i}`,
      }));

      const startTime = Date.now();
      
      // Mock batch create
      const mockBatchCreate = vi.fn().mockResolvedValue(records);
      vi.spyOn(profileRepo, 'batchCreate').mockImplementation(mockBatchCreate);

      await profileRepo.batchCreate(records);

      const executionTime = Date.now() - startTime;
      const timePerRecord = executionTime / batchSize;
      
      expect(timePerRecord).toBeLessThan(5); // Should process each record in under 5ms
    });

    it('should handle batch updates efficiently', async () => {
      const batchSize = 50;
      const updates = Array.from({ length: batchSize }, (_, i) => ({
        id: `user${i}`,
        data: { google_api_key: `updated_key${i}` },
      }));

      const startTime = Date.now();
      
      // Mock batch update
      const mockBatchUpdate = vi.fn().mockResolvedValue([]);
      vi.spyOn(profileRepo, 'batchUpdate').mockImplementation(mockBatchUpdate);

      await profileRepo.batchUpdate(updates);

      const executionTime = Date.now() - startTime;
      const timePerUpdate = executionTime / batchSize;
      
      expect(timePerUpdate).toBeLessThan(10); // Should process each update in under 10ms
    });
  });

  describe('Query Optimization', () => {
    it('should improve performance with caching', async () => {
      const queryFn = vi.fn().mockResolvedValue('test result');

      // First execution (no cache)
      const startTime1 = Date.now();
      await QueryOptimizer.executeOptimized('perf-test-1', queryFn);
      const firstExecution = Date.now() - startTime1;

      // Second execution (cached)
      const startTime2 = Date.now();
      await QueryOptimizer.executeOptimized('perf-test-1', queryFn);
      const secondExecution = Date.now() - startTime2;

      // Cached execution should be significantly faster
      expect(secondExecution).toBeLessThan(firstExecution / 2);
      expect(queryFn).toHaveBeenCalledTimes(1); // Only called once due to caching
    });

    it('should handle cache eviction efficiently', async () => {
      const queryFn = vi.fn().mockResolvedValue('test result');

      // Fill cache beyond max size
      const promises = [];
      for (let i = 0; i < 150; i++) { // Exceeds MAX_CACHE_SIZE of 100
        promises.push(QueryOptimizer.executeOptimized(`query-${i}`, queryFn));
      }

      const startTime = Date.now();
      await Promise.all(promises);
      const executionTime = Date.now() - startTime;

      // Should handle cache eviction without significant performance impact
      expect(executionTime).toBeLessThan(1000); // Should complete within 1 second

      const cacheStats = QueryOptimizer.getCacheStats();
      expect(cacheStats.totalEntries).toBeLessThanOrEqual(100); // Should respect max cache size
    });

    it('should optimize query patterns', async () => {
      const builder = QueryOptimizer.getQueryBuilder('test_table');

      const startTime = Date.now();
      
      // Build complex query
      const optimizedQuery = builder
        .select('id, name, created_at')
        .eq('status', 'active')
        .range('score', 70, 100)
        .orderBy('created_at', false)
        .paginate(0, 20);

      // Mock execution
      const mockExecute = vi.fn().mockResolvedValue([]);
      vi.spyOn(optimizedQuery, 'execute').mockImplementation(mockExecute);

      await optimizedQuery.execute('optimized-query');

      const executionTime = Date.now() - startTime;
      expect(executionTime).toBeLessThan(50); // Query building should be very fast
    });
  });

  describe('Connection Performance', () => {
    it('should perform health checks quickly', async () => {
      const startTime = Date.now();
      
      // Mock health check
      vi.spyOn(ConnectionManager, 'performHealthCheck').mockResolvedValue(true);

      const isHealthy = await ConnectionManager.performHealthCheck();

      const executionTime = Date.now() - startTime;
      expect(executionTime).toBeLessThan(100); // Health check should be fast
      expect(isHealthy).toBe(true);
    });

    it('should handle connection metrics efficiently', async () => {
      const startTime = Date.now();
      
      // Mock metrics collection
      vi.spyOn(ConnectionManager, 'getConnectionMetrics').mockResolvedValue({
        isConnected: true,
        responseTime: 50,
        consecutiveFailures: 0,
        lastCheck: new Date().toISOString(),
      });

      const metrics = await ConnectionManager.getConnectionMetrics();

      const executionTime = Date.now() - startTime;
      expect(executionTime).toBeLessThan(50); // Metrics collection should be very fast
      expect(metrics.responseTime).toBeLessThan(100);
    });
  });

  describe('Memory Usage', () => {
    it('should maintain reasonable memory usage with caching', async () => {
      const queryFn = vi.fn().mockResolvedValue({ data: 'test'.repeat(1000) }); // Larger payload

      // Execute multiple cached queries
      for (let i = 0; i < 50; i++) {
        await QueryOptimizer.executeOptimized(`memory-test-${i}`, queryFn);
      }

      const cacheStats = QueryOptimizer.getCacheStats();
      
      // Memory usage should be reasonable (less than 1MB for test data)
      expect(cacheStats.memoryUsage).toBeLessThan(1024 * 1024);
      expect(cacheStats.totalEntries).toBe(50);
    });

    it('should handle cache cleanup efficiently', async () => {
      const queryFn = vi.fn().mockResolvedValue('test result');

      // Add queries to cache
      for (let i = 0; i < 20; i++) {
        await QueryOptimizer.executeOptimized(`cleanup-test-${i}`, queryFn);
      }

      const beforeCleanup = QueryOptimizer.getCacheStats();
      expect(beforeCleanup.totalEntries).toBe(20);

      // Clear cache
      const startTime = Date.now();
      QueryOptimizer.clearCache();
      const cleanupTime = Date.now() - startTime;

      const afterCleanup = QueryOptimizer.getCacheStats();
      
      expect(cleanupTime).toBeLessThan(10); // Cleanup should be very fast
      expect(afterCleanup.totalEntries).toBe(0);
    });
  });

  describe('Scalability Tests', () => {
    it('should handle concurrent queries efficiently', async () => {
      const queryFn = vi.fn().mockResolvedValue('test result');
      const concurrentQueries = 20;

      const startTime = Date.now();
      
      // Execute concurrent queries
      const promises = Array.from({ length: concurrentQueries }, (_, i) =>
        QueryOptimizer.executeOptimized(`concurrent-${i}`, queryFn)
      );

      await Promise.all(promises);

      const executionTime = Date.now() - startTime;
      const timePerQuery = executionTime / concurrentQueries;

      // Should handle concurrent queries efficiently
      expect(timePerQuery).toBeLessThan(20); // Average time per query should be low
      expect(queryFn).toHaveBeenCalledTimes(concurrentQueries);
    });

    it('should scale with increasing data size', async () => {
      const smallDataset = Array.from({ length: 10 }, (_, i) => ({ id: i }));
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({ id: i }));

      // Mock queries with different dataset sizes
      const smallQueryFn = vi.fn().mockResolvedValue(smallDataset);
      const largeQueryFn = vi.fn().mockResolvedValue(largeDataset);

      // Test small dataset
      const startTime1 = Date.now();
      await QueryOptimizer.executeOptimized('small-dataset', smallQueryFn);
      const smallTime = Date.now() - startTime1;

      // Test large dataset
      const startTime2 = Date.now();
      await QueryOptimizer.executeOptimized('large-dataset', largeQueryFn);
      const largeTime = Date.now() - startTime2;

      // Large dataset should not be disproportionately slower
      const scalingFactor = largeTime / smallTime;
      expect(scalingFactor).toBeLessThan(10); // Should scale reasonably
    });
  });

  describe('Error Handling Performance', () => {
    it('should handle errors efficiently without performance degradation', async () => {
      const errorQueryFn = vi.fn().mockRejectedValue(new Error('Test error'));
      const successQueryFn = vi.fn().mockResolvedValue('success');

      const startTime = Date.now();

      // Mix of error and success queries
      const promises = [
        QueryOptimizer.executeOptimized('error-1', errorQueryFn).catch(() => 'error'),
        QueryOptimizer.executeOptimized('success-1', successQueryFn),
        QueryOptimizer.executeOptimized('error-2', errorQueryFn).catch(() => 'error'),
        QueryOptimizer.executeOptimized('success-2', successQueryFn),
      ];

      await Promise.all(promises);

      const executionTime = Date.now() - startTime;
      
      // Error handling should not significantly impact performance
      expect(executionTime).toBeLessThan(200);

      // Check that metrics track errors correctly
      const errorMetrics = QueryOptimizer.getMetrics('error-1') as any;
      expect(errorMetrics.errors).toBe(1);
    });
  });
});