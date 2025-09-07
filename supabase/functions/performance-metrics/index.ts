// Performance metrics endpoint for monitoring system performance
// Provides cache hit/miss ratios, response times, and system health metrics

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  createRequestHandler,
  createSuccessHttpResponse,
  createErrorHttpResponse,
  authenticateUser,
  createAuthErrorResponse,
  AppError,
  ERROR_CODES,
  globalPerformanceMonitor,
  globalConnectionPool,
  CacheManager,
  createOptimizedResponse
} from '../_shared/index.ts';

/**
 * Performance metrics request handler
 */
const handleMetricsRequest = async (request: Request, requestId: string): Promise<Response> => {
  try {
    // Authenticate user (optional - could be admin only)
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthErrorResponse(authResult, requestId);
    }

    const url = new URL(request.url);
    const endpoint = url.pathname.split('/').pop();

    switch (endpoint) {
      case 'summary':
        return handleSummaryRequest(requestId);
      case 'cache':
        return handleCacheMetricsRequest(requestId);
      case 'connections':
        return handleConnectionPoolRequest(requestId);
      case 'report':
        return handlePerformanceReportRequest(requestId);
      case 'health':
        return handleHealthCheckRequest(requestId);
      default:
        return handleFullMetricsRequest(requestId);
    }

  } catch (error) {
    console.error(`Performance metrics request failed (${requestId}):`, error);
    return createErrorHttpResponse(error, requestId);
  }
};

/**
 * Handle summary metrics request
 */
async function handleSummaryRequest(requestId: string): Promise<Response> {
  const systemMetrics = globalPerformanceMonitor.getSystemPerformanceMetrics();
  
  const summary = {
    timestamp: new Date().toISOString(),
    system: {
      avgResponseTime: systemMetrics.avgResponseTime,
      totalRequests: systemMetrics.totalRequests,
      errorRate: systemMetrics.errorRate,
      memoryUsage: systemMetrics.memoryUsage
    },
    cache: {
      totalCaches: Object.keys(systemMetrics.cachePerformance).length,
      avgHitRate: Object.values(systemMetrics.cachePerformance)
        .reduce((sum, cache) => sum + cache.hitRate, 0) / 
        Math.max(Object.keys(systemMetrics.cachePerformance).length, 1),
      totalMemoryUsage: Object.values(systemMetrics.cachePerformance)
        .reduce((sum, cache) => sum + cache.memoryUsage, 0)
    },
    compression: systemMetrics.compressionStats
  };

  return createOptimizedResponse(
    { success: true, data: summary, request_id: requestId },
    200,
    { 'X-Request-ID': requestId },
    { compress: true, optimize: true }
  );
}

/**
 * Handle cache metrics request
 */
async function handleCacheMetricsRequest(requestId: string): Promise<Response> {
  const cacheMetrics = globalPerformanceMonitor.getCachePerformanceMetrics();
  const cacheStats = CacheManager.getCombinedMetrics();
  
  const detailedCacheMetrics = Object.entries(cacheMetrics).map(([cacheName, metrics]) => ({
    name: cacheName,
    hitRate: metrics.hitRate,
    missRate: metrics.missRate,
    totalHits: metrics.totalHits,
    totalMisses: metrics.totalMisses,
    avgHitTime: metrics.avgHitTime,
    avgMissTime: metrics.avgMissTime,
    cacheSize: metrics.cacheSize,
    memoryUsage: metrics.memoryUsage,
    detailed: cacheStats[cacheName] || null
  }));

  return createOptimizedResponse(
    { 
      success: true, 
      data: {
        timestamp: new Date().toISOString(),
        caches: detailedCacheMetrics,
        summary: {
          totalCaches: detailedCacheMetrics.length,
          avgHitRate: detailedCacheMetrics.reduce((sum, cache) => sum + cache.hitRate, 0) / Math.max(detailedCacheMetrics.length, 1),
          totalMemoryUsage: detailedCacheMetrics.reduce((sum, cache) => sum + cache.memoryUsage, 0),
          totalEntries: detailedCacheMetrics.reduce((sum, cache) => sum + cache.cacheSize, 0)
        }
      }, 
      request_id: requestId 
    },
    200,
    { 'X-Request-ID': requestId },
    { compress: true, optimize: true }
  );
}

/**
 * Handle connection pool metrics request
 */
async function handleConnectionPoolRequest(requestId: string): Promise<Response> {
  const connectionStats = globalConnectionPool.getStats();
  
  return createOptimizedResponse(
    { 
      success: true, 
      data: {
        timestamp: new Date().toISOString(),
        connectionPools: connectionStats,
        summary: {
          totalAPIs: Object.keys(connectionStats).length,
          totalConnections: Object.values(connectionStats).reduce((sum, stats) => sum + stats.totalConnections, 0),
          activeConnections: Object.values(connectionStats).reduce((sum, stats) => sum + stats.activeConnections, 0),
          totalRequests: Object.values(connectionStats).reduce((sum, stats) => sum + stats.totalRequests, 0),
          avgErrorRate: Object.values(connectionStats).reduce((sum, stats) => sum + stats.errorRate, 0) / Math.max(Object.keys(connectionStats).length, 1)
        }
      }, 
      request_id: requestId 
    },
    200,
    { 'X-Request-ID': requestId },
    { compress: true, optimize: true }
  );
}

/**
 * Handle performance report request
 */
async function handlePerformanceReportRequest(requestId: string): Promise<Response> {
  const report = globalPerformanceMonitor.getPerformanceReport();
  
  return createOptimizedResponse(
    { 
      success: true, 
      data: {
        timestamp: new Date().toISOString(),
        ...report
      }, 
      request_id: requestId 
    },
    200,
    { 'X-Request-ID': requestId },
    { compress: true, optimize: true }
  );
}

/**
 * Handle health check request
 */
async function handleHealthCheckRequest(requestId: string): Promise<Response> {
  const systemMetrics = globalPerformanceMonitor.getSystemPerformanceMetrics();
  const connectionStats = globalConnectionPool.getStats();
  
  // Determine health status
  const isHealthy = 
    systemMetrics.errorRate < 0.05 && // Less than 5% error rate
    systemMetrics.avgResponseTime < 5000 && // Less than 5 second average response time
    systemMetrics.memoryUsage < 500; // Less than 500MB memory usage
  
  const health = {
    status: isHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    checks: {
      errorRate: {
        status: systemMetrics.errorRate < 0.05 ? 'pass' : 'fail',
        value: systemMetrics.errorRate,
        threshold: 0.05
      },
      responseTime: {
        status: systemMetrics.avgResponseTime < 5000 ? 'pass' : 'fail',
        value: systemMetrics.avgResponseTime,
        threshold: 5000
      },
      memoryUsage: {
        status: systemMetrics.memoryUsage < 500 ? 'pass' : 'fail',
        value: systemMetrics.memoryUsage,
        threshold: 500
      },
      cacheHealth: {
        status: Object.values(systemMetrics.cachePerformance).every(cache => cache.hitRate > 0.3) ? 'pass' : 'warn',
        avgHitRate: Object.values(systemMetrics.cachePerformance).reduce((sum, cache) => sum + cache.hitRate, 0) / Math.max(Object.keys(systemMetrics.cachePerformance).length, 1)
      },
      connectionPools: {
        status: Object.values(connectionStats).every(pool => pool.errorRate < 0.1) ? 'pass' : 'warn',
        totalPools: Object.keys(connectionStats).length,
        avgErrorRate: Object.values(connectionStats).reduce((sum, stats) => sum + stats.errorRate, 0) / Math.max(Object.keys(connectionStats).length, 1)
      }
    }
  };

  return createOptimizedResponse(
    { success: true, data: health, request_id: requestId },
    isHealthy ? 200 : 503,
    { 'X-Request-ID': requestId },
    { compress: true, optimize: true }
  );
}

/**
 * Handle full metrics request
 */
async function handleFullMetricsRequest(requestId: string): Promise<Response> {
  const allStats = globalPerformanceMonitor.getAllStats();
  const systemMetrics = globalPerformanceMonitor.getSystemPerformanceMetrics();
  const connectionStats = globalConnectionPool.getStats();
  const cacheStats = CacheManager.getCombinedMetrics();
  
  const fullMetrics = {
    timestamp: new Date().toISOString(),
    system: systemMetrics,
    performance: allStats,
    connections: connectionStats,
    caches: cacheStats,
    export: globalPerformanceMonitor.exportMetrics()
  };

  return createOptimizedResponse(
    { success: true, data: fullMetrics, request_id: requestId },
    200,
    { 'X-Request-ID': requestId },
    { compress: true, optimize: true }
  );
}

// Create and serve the request handler
const handler = createRequestHandler(handleMetricsRequest, ['GET']);

serve(handler);