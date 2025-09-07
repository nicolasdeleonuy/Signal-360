// Performance monitoring system for Edge Functions
// Tracks cache performance, response times, and system metrics

import { Logger } from './logging.ts';
import { MemoryCache, CacheManager } from './cache.ts';

/**
 * Performance metric types
 */
export type MetricType = 
  | 'cache_hit' 
  | 'cache_miss' 
  | 'response_time' 
  | 'api_call' 
  | 'error' 
  | 'memory_usage'
  | 'connection_pool'
  | 'compression';

/**
 * Performance metric data
 */
export interface PerformanceMetric {
  type: MetricType;
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * Aggregated metric statistics
 */
export interface MetricStats {
  count: number;
  sum: number;
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
  lastValue: number;
  lastTimestamp: number;
}

/**
 * Cache performance metrics
 */
export interface CachePerformanceMetrics {
  hitRate: number;
  missRate: number;
  totalHits: number;
  totalMisses: number;
  avgHitTime: number;
  avgMissTime: number;
  cacheSize: number;
  memoryUsage: number;
}

/**
 * System performance metrics
 */
export interface SystemPerformanceMetrics {
  avgResponseTime: number;
  totalRequests: number;
  errorRate: number;
  memoryUsage: number;
  cachePerformance: Record<string, CachePerformanceMetrics>;
  connectionPoolStats: Record<string, any>;
  compressionStats: {
    totalCompressions: number;
    avgCompressionRatio: number;
    totalBytesSaved: number;
  };
}

/**
 * Performance monitoring service
 */
export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private aggregatedStats: Map<string, MetricStats> = new Map();
  private logger: Logger;
  private maxMetricsPerType: number = 1000;
  private aggregationInterval: number;

  constructor(maxMetricsPerType: number = 1000) {
    this.maxMetricsPerType = maxMetricsPerType;
    this.logger = new Logger('PerformanceMonitor');
    this.startAggregationTimer();
  }

  /**
   * Record a performance metric
   */
  record(type: MetricType, name: string, value: number, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      type,
      name,
      value,
      timestamp: Date.now(),
      metadata
    };

    const key = `${type}:${name}`;
    const metrics = this.metrics.get(key) || [];
    
    metrics.push(metric);
    
    // Keep only the most recent metrics
    if (metrics.length > this.maxMetricsPerType) {
      metrics.splice(0, metrics.length - this.maxMetricsPerType);
    }
    
    this.metrics.set(key, metrics);
    
    // Update aggregated stats immediately for critical metrics
    if (type === 'response_time' || type === 'cache_hit' || type === 'cache_miss') {
      this.updateAggregatedStats(key, metrics);
    }
  }

  /**
   * Get metric statistics
   */
  getStats(type: MetricType, name: string): MetricStats | null {
    const key = `${type}:${name}`;
    return this.aggregatedStats.get(key) || null;
  }

  /**
   * Get all statistics
   */
  getAllStats(): Record<string, MetricStats> {
    const stats: Record<string, MetricStats> = {};
    for (const [key, value] of this.aggregatedStats.entries()) {
      stats[key] = value;
    }
    return stats;
  }

  /**
   * Get cache performance metrics
   */
  getCachePerformanceMetrics(): Record<string, CachePerformanceMetrics> {
    const cacheMetrics: Record<string, CachePerformanceMetrics> = {};
    const caches = CacheManager.getAllCaches();
    
    for (const [cacheName, cache] of caches.entries()) {
      const cacheStats = cache.getMetrics();
      const hitKey = `cache_hit:${cacheName}`;
      const missKey = `cache_miss:${cacheName}`;
      
      const hitStats = this.aggregatedStats.get(hitKey);
      const missStats = this.aggregatedStats.get(missKey);
      
      cacheMetrics[cacheName] = {
        hitRate: cacheStats.hitRate,
        missRate: 1 - cacheStats.hitRate,
        totalHits: cacheStats.hits,
        totalMisses: cacheStats.misses,
        avgHitTime: hitStats?.avg || 0,
        avgMissTime: missStats?.avg || 0,
        cacheSize: cacheStats.entryCount,
        memoryUsage: cacheStats.memoryUsageMB
      };
    }
    
    return cacheMetrics;
  }

  /**
   * Get system performance overview
   */
  getSystemPerformanceMetrics(): SystemPerformanceMetrics {
    const responseTimeStats = this.aggregatedStats.get('response_time:total');
    const errorStats = this.aggregatedStats.get('error:total');
    const requestStats = this.aggregatedStats.get('api_call:total');
    
    return {
      avgResponseTime: responseTimeStats?.avg || 0,
      totalRequests: requestStats?.count || 0,
      errorRate: errorStats && requestStats ? errorStats.count / requestStats.count : 0,
      memoryUsage: this.getCurrentMemoryUsage(),
      cachePerformance: this.getCachePerformanceMetrics(),
      connectionPoolStats: this.getConnectionPoolStats(),
      compressionStats: this.getCompressionStats()
    };
  }

  /**
   * Get performance report
   */
  getPerformanceReport(): {
    summary: SystemPerformanceMetrics;
    topSlowOperations: Array<{ name: string; avgTime: number; count: number }>;
    cacheEfficiency: Array<{ cache: string; hitRate: number; memoryUsage: number }>;
    errorBreakdown: Array<{ type: string; count: number; rate: number }>;
  } {
    const summary = this.getSystemPerformanceMetrics();
    
    // Get top slow operations
    const topSlowOperations = Array.from(this.aggregatedStats.entries())
      .filter(([key]) => key.startsWith('response_time:'))
      .map(([key, stats]) => ({
        name: key.replace('response_time:', ''),
        avgTime: stats.avg,
        count: stats.count
      }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 10);

    // Get cache efficiency
    const cacheEfficiency = Object.entries(summary.cachePerformance)
      .map(([cache, metrics]) => ({
        cache,
        hitRate: metrics.hitRate,
        memoryUsage: metrics.memoryUsage
      }))
      .sort((a, b) => b.hitRate - a.hitRate);

    // Get error breakdown
    const errorBreakdown = Array.from(this.aggregatedStats.entries())
      .filter(([key]) => key.startsWith('error:'))
      .map(([key, stats]) => ({
        type: key.replace('error:', ''),
        count: stats.count,
        rate: stats.count / (summary.totalRequests || 1)
      }))
      .sort((a, b) => b.count - a.count);

    return {
      summary,
      topSlowOperations,
      cacheEfficiency,
      errorBreakdown
    };
  }

  /**
   * Record cache hit
   */
  recordCacheHit(cacheName: string, responseTime: number): void {
    this.record('cache_hit', cacheName, responseTime);
  }

  /**
   * Record cache miss
   */
  recordCacheMiss(cacheName: string, responseTime: number): void {
    this.record('cache_miss', cacheName, responseTime);
  }

  /**
   * Record API call
   */
  recordAPICall(apiName: string, responseTime: number, success: boolean = true): void {
    this.record('api_call', apiName, responseTime, { success });
    this.record('api_call', 'total', responseTime, { success });
    
    if (!success) {
      this.record('error', apiName, 1);
      this.record('error', 'total', 1);
    }
  }

  /**
   * Record response time
   */
  recordResponseTime(operation: string, responseTime: number): void {
    this.record('response_time', operation, responseTime);
    this.record('response_time', 'total', responseTime);
  }

  /**
   * Record memory usage
   */
  recordMemoryUsage(usage: number): void {
    this.record('memory_usage', 'system', usage);
  }

  /**
   * Record compression metrics
   */
  recordCompression(originalSize: number, compressedSize: number, method: string): void {
    const ratio = compressedSize / originalSize;
    const savings = originalSize - compressedSize;
    
    this.record('compression', 'ratio', ratio, { method });
    this.record('compression', 'savings', savings, { method });
    this.record('compression', 'total', 1, { method });
  }

  /**
   * Update aggregated statistics
   */
  private updateAggregatedStats(key: string, metrics: PerformanceMetric[]): void {
    if (metrics.length === 0) return;

    const values = metrics.map(m => m.value).sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    const count = values.length;
    
    const stats: MetricStats = {
      count,
      sum,
      min: values[0],
      max: values[values.length - 1],
      avg: sum / count,
      p50: this.percentile(values, 0.5),
      p95: this.percentile(values, 0.95),
      p99: this.percentile(values, 0.99),
      lastValue: metrics[metrics.length - 1].value,
      lastTimestamp: metrics[metrics.length - 1].timestamp
    };
    
    this.aggregatedStats.set(key, stats);
  }

  /**
   * Calculate percentile
   */
  private percentile(values: number[], p: number): number {
    const index = Math.ceil(values.length * p) - 1;
    return values[Math.max(0, index)];
  }

  /**
   * Get current memory usage
   */
  private getCurrentMemoryUsage(): number {
    try {
      const memInfo = (performance as any).memory;
      if (memInfo) {
        return memInfo.usedJSHeapSize / (1024 * 1024); // MB
      }
    } catch {
      // Memory info not available
    }
    return 0;
  }

  /**
   * Get connection pool statistics
   */
  private getConnectionPoolStats(): Record<string, any> {
    // This would integrate with the actual connection pool
    return {};
  }

  /**
   * Get compression statistics
   */
  private getCompressionStats(): {
    totalCompressions: number;
    avgCompressionRatio: number;
    totalBytesSaved: number;
  } {
    const compressionStats = this.aggregatedStats.get('compression:total');
    const ratioStats = this.aggregatedStats.get('compression:ratio');
    const savingsStats = this.aggregatedStats.get('compression:savings');
    
    return {
      totalCompressions: compressionStats?.count || 0,
      avgCompressionRatio: ratioStats?.avg || 1.0,
      totalBytesSaved: savingsStats?.sum || 0
    };
  }

  /**
   * Start aggregation timer
   */
  private startAggregationTimer(): void {
    this.aggregationInterval = setInterval(() => {
      this.aggregateAllMetrics();
      this.recordMemoryUsage(this.getCurrentMemoryUsage());
    }, 30000); // Aggregate every 30 seconds
  }

  /**
   * Aggregate all metrics
   */
  private aggregateAllMetrics(): void {
    for (const [key, metrics] of this.metrics.entries()) {
      this.updateAggregatedStats(key, metrics);
    }
  }

  /**
   * Clear old metrics
   */
  clearOldMetrics(olderThanMs: number = 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - olderThanMs;
    let totalCleared = 0;
    
    for (const [key, metrics] of this.metrics.entries()) {
      const filtered = metrics.filter(m => m.timestamp > cutoff);
      if (filtered.length !== metrics.length) {
        totalCleared += metrics.length - filtered.length;
        this.metrics.set(key, filtered);
      }
    }
    
    if (totalCleared > 0) {
      this.logger.info(`Cleared ${totalCleared} old performance metrics`);
    }
  }

  /**
   * Export metrics for external monitoring
   */
  exportMetrics(): {
    timestamp: number;
    metrics: Record<string, MetricStats>;
    systemMetrics: SystemPerformanceMetrics;
  } {
    return {
      timestamp: Date.now(),
      metrics: this.getAllStats(),
      systemMetrics: this.getSystemPerformanceMetrics()
    };
  }

  /**
   * Destroy monitor and cleanup resources
   */
  destroy(): void {
    if (this.aggregationInterval) {
      clearInterval(this.aggregationInterval);
    }
    this.metrics.clear();
    this.aggregatedStats.clear();
    this.logger.info('Performance monitor destroyed');
  }
}

/**
 * Global performance monitor instance
 */
export const globalPerformanceMonitor = new PerformanceMonitor();

/**
 * Performance monitoring decorator
 */
export function monitored(operationName: string) {
  return function(target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function(...args: any[]) {
      const startTime = performance.now();
      const fullOperationName = `${operationName || propertyName}`;
      
      try {
        const result = await method.apply(this, args);
        const duration = performance.now() - startTime;
        
        globalPerformanceMonitor.recordResponseTime(fullOperationName, duration);
        globalPerformanceMonitor.recordAPICall(fullOperationName, duration, true);
        
        return result;
      } catch (error) {
        const duration = performance.now() - startTime;
        
        globalPerformanceMonitor.recordResponseTime(fullOperationName, duration);
        globalPerformanceMonitor.recordAPICall(fullOperationName, duration, false);
        
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Helper functions for common performance tracking
 */
export const PerformanceTracker = {
  /**
   * Track cache operation
   */
  trackCacheOperation: (cacheName: string, hit: boolean, responseTime: number) => {
    if (hit) {
      globalPerformanceMonitor.recordCacheHit(cacheName, responseTime);
    } else {
      globalPerformanceMonitor.recordCacheMiss(cacheName, responseTime);
    }
  },

  /**
   * Track API call
   */
  trackAPICall: (apiName: string, responseTime: number, success: boolean = true) => {
    globalPerformanceMonitor.recordAPICall(apiName, responseTime, success);
  },

  /**
   * Track response time
   */
  trackResponseTime: (operation: string, responseTime: number) => {
    globalPerformanceMonitor.recordResponseTime(operation, responseTime);
  },

  /**
   * Track compression
   */
  trackCompression: (originalSize: number, compressedSize: number, method: string) => {
    globalPerformanceMonitor.recordCompression(originalSize, compressedSize, method);
  },

  /**
   * Get performance report
   */
  getReport: () => globalPerformanceMonitor.getPerformanceReport()
};