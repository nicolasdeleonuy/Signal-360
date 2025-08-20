// Load testing for database operations
// Tests system behavior under high load and concurrent access

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DatabaseService } from '../../database-service';
import { ProfileRepository } from '../../repositories/profile-repository';
import { AnalysisRepository } from '../../repositories/analysis-repository';
import { QueryOptimizer, QueryMetrics } from '../../query-optimizer';
import { ConnectionManager } from '../../connection-manager';
import { supabase } from '../../../supabase';

// Mock Supabase for load testing
vi.mock('../../../supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe('Database Load Testing', () => {
  const testUserId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    vi.clearAllMocks();
    QueryOptimizer.clearCache();
    
    // Mock authenticated user
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: testUserId } },
      error: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Concurrent User Operations', () => {
    it('should handle 100 concurrent user initializations', async () => {
      const mockProfile = {
        id: testUserId,
        encrypted_google_api_key: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const mockSupabaseChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
      };

      (supabase.from as any).mockReturnValue(mockSupabaseChain);

      const concurrentUsers = 100;
      const userIds = Array.from({ length: concurrentUsers }, (_, i) => 
        `user-${i.toString().padStart(3, '0')}-0000-0000-0000-000000000000`
      );

      const startTime = Date.now();
      
      const operations = userIds.map(userId => 
        DatabaseService.initializeUser(userId)
      );

      const results = await Promise.all(operations);
      const executionTime = Date.now() - startTime;

      expect(results).toHaveLength(concurrentUsers);
      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(mockSupabaseChain.insert).toHaveBeenCalledTimes(concurrentUsers);

      // Calculate average time per operation
      const avgTimePerOperation = executionTime / concurrentUsers;
      expect(avgTimePerOperation).toBeLessThan(100); // Less than 100ms per operation
    });

    it('should handle 500 concurrent analysis creations', async () => {
      const mockAnalysis = {
        id: 1,
        user_id: testUserId,
        ticker_symbol: 'AAPL',
        analysis_context: 'investment' as const,
        synthesis_score: 85,
        convergence_factors: [],
        divergence_factors: [],
        full_report: { summary: 'Test analysis summary with sufficient detail' },
      };

      const mockProfile = {
        id: testUserId,
        encrypted_google_api_key: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const mockSupabaseChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValue({ data: mockProfile, error: null }) // Profile check
          .mockResolvedValue({ data: mockAnalysis, error: null }), // Analysis creation
      };

      (supabase.from as any).mockReturnValue(mockSupabaseChain);

      const concurrentAnalyses = 500;
      const analysisInput = {
        ticker_symbol: 'AAPL',
        analysis_context: 'investment' as const,
        synthesis_score: 85,
        convergence_factors: [],
        divergence_factors: [],
        full_report: { summary: 'Test analysis summary with sufficient detail' },
      };

      const startTime = Date.now();
      
      const operations = Array.from({ length: concurrentAnalyses }, () =>
        DatabaseService.createAnalysisWithValidation(testUserId, analysisInput)
      );

      const results = await Promise.all(operations);
      const executionTime = Date.now() - startTime;

      expect(results).toHaveLength(concurrentAnalyses);
      expect(executionTime).toBeLessThan(10000); // Should complete within 10 seconds

      const avgTimePerOperation = executionTime / concurrentAnalyses;
      expect(avgTimePerOperation).toBeLessThan(50); // Less than 50ms per operation
    });
  });

  describe('High-Volume Data Operations', () => {
    it('should handle bulk profile operations efficiently', async () => {
      const batchSize = 1000;
      const profiles = Array.from({ length: batchSize }, (_, i) => ({
        id: `bulk-${i.toString().padStart(4, '0')}-0000-0000-0000-000000000000`,
        google_api_key: i % 2 === 0 ? 'test_key' : undefined,
      }));

      const mockSupabaseChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: profiles, error: null }),
      };

      (supabase.from as any).mockReturnValue(mockSupabaseChain);

      const repository = new ProfileRepository();
      
      const startTime = Date.now();
      const result = await repository.batchCreate(profiles);
      const executionTime = Date.now() - startTime;

      expect(result).toHaveLength(batchSize);
      expect(executionTime).toBeLessThan(3000); // Should complete within 3 seconds

      const throughput = batchSize / (executionTime / 1000);
      expect(throughput).toBeGreaterThan(300); // At least 300 operations per second
    });

    it('should handle large dataset queries with pagination', async () => {
      const pageSize = 100;

      const mockAnalyses = Array.from({ length: pageSize }, (_, i) => ({
        id: i + 1,
        user_id: testUserId,
        ticker_symbol: `STOCK${i}`,
        analysis_context: 'investment' as const,
        synthesis_score: Math.floor(Math.random() * 100),
      }));

      const mockSupabaseChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: mockAnalyses, error: null }),
      };

      (supabase.from as any).mockReturnValue(mockSupabaseChain);

      const repository = new AnalysisRepository();
      
      const startTime = Date.now();
      
      // Simulate paginated queries
      const pagePromises = Array.from({ length: 10 }, (_, page) =>
        repository.findByUser(testUserId, {}, {
          limit: pageSize,
          offset: page * pageSize,
        })
      );

      const results = await Promise.all(pagePromises);
      const executionTime = Date.now() - startTime;

      expect(results).toHaveLength(10);
      results.forEach(page => {
        expect(page).toHaveLength(pageSize);
      });

      expect(executionTime).toBeLessThan(2000); // Should complete within 2 seconds
      
      const avgTimePerPage = executionTime / 10;
      expect(avgTimePerPage).toBeLessThan(200); // Less than 200ms per page
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should handle memory-intensive operations without leaks', async () => {
      const largeDataset = Array.from({ length: 5000 }, (_, i) => ({
        id: i + 1,
        user_id: testUserId,
        ticker_symbol: `STOCK${i}`,
        analysis_context: 'investment' as const,
        synthesis_score: Math.floor(Math.random() * 100),
        convergence_factors: Array.from({ length: 10 }, (_, j) => ({
          category: 'fundamental',
          description: `Factor ${j}`,
          weight: Math.random() * 10,
          metadata: { data: 'x'.repeat(100) }, // Add some bulk
        })),
        divergence_factors: Array.from({ length: 10 }, (_, j) => ({
          category: 'technical',
          description: `Factor ${j}`,
          weight: Math.random() * 10,
          metadata: { data: 'y'.repeat(100) }, // Add some bulk
        })),
        full_report: {
          summary: 'Large report summary with lots of data'.repeat(10),
          fundamental: {
            score: 80,
            factors: Array.from({ length: 20 }, (_, k) => `Factor ${k}`),
            details: { data: 'z'.repeat(500) },
          },
        },
      }));

      const mockSupabaseChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: largeDataset, error: null }),
      };

      (supabase.from as any).mockReturnValue(mockSupabaseChain);

      const initialMemory = process.memoryUsage().heapUsed;
      
      const dashboard = await DatabaseService.getAnalysisDashboard(testUserId);
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      expect(dashboard.analyses).toHaveLength(5000);
      
      // Memory increase should be reasonable (less than 100MB for this test)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });

    it('should handle cache pressure efficiently', async () => {
      const cacheKeys = Array.from({ length: 200 }, (_, i) => `cache-key-${i}`);
      const mockData = { test: 'data' };

      // Fill cache beyond normal capacity
      const cachePromises = cacheKeys.map(key =>
        QueryOptimizer.executeOptimized(key, async () => mockData)
      );

      const startTime = Date.now();
      await Promise.all(cachePromises);
      const executionTime = Date.now() - startTime;

      expect(executionTime).toBeLessThan(1000); // Should handle cache pressure quickly

      const cacheStats = QueryOptimizer.getCacheStats();
      expect(cacheStats.totalEntries).toBeLessThanOrEqual(100); // Should respect max cache size
      expect(cacheStats.memoryUsage).toBeLessThan(10 * 1024 * 1024); // Less than 10MB
    });
  });

  describe('Connection Pool Stress Testing', () => {
    it('should handle connection pool exhaustion gracefully', async () => {
      // Mock connection manager
      vi.spyOn(ConnectionManager, 'executeWithConnectionCheck').mockImplementation(
        async (operation) => {
          // Simulate connection pool pressure with random delays
          await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
          return operation();
        }
      );

      const mockProfile = {
        id: testUserId,
        encrypted_google_api_key: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const mockSupabaseChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
      };

      (supabase.from as any).mockReturnValue(mockSupabaseChain);

      const concurrentConnections = 50;
      const operations = Array.from({ length: concurrentConnections }, (_, i) =>
        DatabaseService.getUserData(`user-${i}`)
      );

      const startTime = Date.now();
      const results = await Promise.allSettled(operations);
      const executionTime = Date.now() - startTime;

      const successful = results.filter(r => r.status === 'fulfilled').length;

      // Most operations should succeed even under connection pressure
      expect(successful).toBeGreaterThan(concurrentConnections * 0.8); // At least 80% success
      expect(executionTime).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it('should recover from connection failures', async () => {
      let failureCount = 0;
      const maxFailures = 5;

      vi.spyOn(ConnectionManager, 'performHealthCheck').mockImplementation(async () => {
        failureCount++;
        if (failureCount <= maxFailures) {
          throw new Error('Connection failed');
        }
        return true;
      });

      // Should eventually succeed after failures
      const isHealthy = await ConnectionManager.performHealthCheck();
      expect(isHealthy).toBe(true);
      expect(failureCount).toBe(maxFailures + 1);
    });
  });

  describe('Query Performance Under Load', () => {
    it('should maintain query performance with complex filters', async () => {
      const complexDataset = Array.from({ length: 2000 }, (_, i) => ({
        id: i + 1,
        user_id: testUserId,
        ticker_symbol: `STOCK${i % 100}`, // 100 unique tickers
        analysis_context: i % 3 === 0 ? 'investment' as const : 'trading' as const,
        trading_timeframe: i % 3 === 0 ? null : ['1D', '1W', '1M'][i % 3],
        synthesis_score: Math.floor(Math.random() * 100),
        created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      }));

      const mockSupabaseChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: complexDataset.slice(0, 50), error: null }),
      };

      (supabase.from as any).mockReturnValue(mockSupabaseChain);

      const repository = new AnalysisRepository();
      
      // Test multiple complex queries concurrently
      const complexQueries = [
        () => repository.findByUserAndScoreRange(testUserId, 70, 100, { limit: 50 }),
        () => repository.findByUserAndContext(testUserId, 'investment', { limit: 50 }),
        () => repository.findByUserAndTicker(testUserId, 'STOCK1', { limit: 50 }),
        () => repository.getTopPerformingByUser(testUserId, 20),
        () => repository.getTrendingTickersByUser(testUserId, 10, 30),
      ];

      const startTime = Date.now();
      const results = await Promise.all(complexQueries.map(query => query()));
      const executionTime = Date.now() - startTime;

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(Array.isArray(result)).toBe(true);
      });

      expect(executionTime).toBeLessThan(2000); // Should complete within 2 seconds
      
      const avgQueryTime = executionTime / 5;
      expect(avgQueryTime).toBeLessThan(400); // Less than 400ms per complex query
    });

    it('should handle query optimization under load', async () => {
      const queryKey = 'load-test-query';
      const mockData = { result: 'cached data' };
      
      // First execution should cache the result
      await QueryOptimizer.executeOptimized(queryKey, async () => {
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate slow query
        return mockData;
      });

      // Subsequent executions should be much faster (cached)
      const cachedExecutions = Array.from({ length: 100 }, () =>
        QueryOptimizer.executeOptimized(queryKey, async () => mockData)
      );

      const startTime = Date.now();
      const results = await Promise.all(cachedExecutions);
      const executionTime = Date.now() - startTime;

      expect(results).toHaveLength(100);
      results.forEach(result => {
        expect(result).toEqual(mockData);
      });

      // Cached executions should be very fast
      expect(executionTime).toBeLessThan(100); // Should complete within 100ms
      
      const metrics = QueryOptimizer.getMetrics(queryKey) as QueryMetrics;
      expect(metrics.cacheHits).toBe(100); // All should be cache hits
    });
  });

  describe('Stress Testing Edge Cases', () => {
    it('should handle rapid successive operations', async () => {
      const mockProfile = {
        id: testUserId,
        encrypted_google_api_key: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const mockSupabaseChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
      };

      (supabase.from as any).mockReturnValue(mockSupabaseChain);

      // Rapid successive profile updates
      const rapidUpdates = Array.from({ length: 20 }, (_, i) =>
        DatabaseService.updateUserProfile(testUserId, {
          google_api_key: `key-${i}`,
        })
      );

      const results = await Promise.allSettled(rapidUpdates);
      const successful = results.filter(r => r.status === 'fulfilled').length;

      // Most updates should succeed despite rapid succession
      expect(successful).toBeGreaterThan(15); // At least 75% success rate
    });

    it('should handle mixed operation types under load', async () => {
      const mockProfile = {
        id: testUserId,
        encrypted_google_api_key: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const mockAnalysis = {
        id: 1,
        user_id: testUserId,
        ticker_symbol: 'AAPL',
        analysis_context: 'investment' as const,
        synthesis_score: 85,
      };

      const mockSupabaseChain = {
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
        order: vi.fn().mockResolvedValue({ data: [mockAnalysis], error: null }),
      };

      (supabase.from as any).mockReturnValue(mockSupabaseChain);

      // Mix of different operation types
      const mixedOperations = [
        ...Array.from({ length: 10 }, () => DatabaseService.initializeUser(`user-${Math.random()}`)),
        ...Array.from({ length: 10 }, () => DatabaseService.getUserData(testUserId)),
        ...Array.from({ length: 10 }, () => DatabaseService.getAnalysisDashboard(testUserId)),
        ...Array.from({ length: 10 }, () => DatabaseService.updateUserProfile(testUserId, {})),
      ];

      const startTime = Date.now();
      const results = await Promise.allSettled(mixedOperations);
      const executionTime = Date.now() - startTime;

      const successful = results.filter(r => r.status === 'fulfilled').length;
      
      expect(successful).toBeGreaterThan(35); // At least 87.5% success rate
      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});