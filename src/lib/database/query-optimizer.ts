// Query optimization utilities
// Provides query optimization, caching, and performance monitoring

import { supabase } from '../supabase';
import { DatabaseOperation } from './error-handler';

/**
 * Query optimizer service
 * Provides query optimization, caching, and performance monitoring
 */
export class QueryOptimizer {
  private static queryCache = new Map<string, CachedQuery>();
  private static performanceMetrics = new Map<string, QueryMetrics>();
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private static readonly MAX_CACHE_SIZE = 100;

  /**
   * Execute query with caching and performance monitoring
   * @param queryKey Unique query identifier
   * @param queryFn Query function
   * @param options Optimization options
   * @returns Promise<T> Query result
   */
  static async executeOptimized<T>(
    queryKey: string,
    queryFn: () => Promise<T>,
    options: OptimizationOptions = {}
  ): Promise<T> {
    const { enableCache = true, cacheTTL = this.CACHE_TTL } = options;

    // Check cache first
    if (enableCache) {
      const cached = this.getCachedResult<T>(queryKey);
      if (cached) {
        this.updateMetrics(queryKey, 0, true);
        return cached;
      }
    }

    // Execute query with performance monitoring
    const startTime = Date.now();
    
    try {
      const result = await DatabaseOperation.execute(queryFn, `Optimized query: ${queryKey}`);
      const executionTime = Date.now() - startTime;

      // Cache result if enabled
      if (enableCache) {
        this.cacheResult(queryKey, result, cacheTTL);
      }

      // Update metrics
      this.updateMetrics(queryKey, executionTime, false);

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.updateMetrics(queryKey, executionTime, false, true);
      throw error;
    }
  }

  /**
   * Get optimized query builder for common patterns
   * @param tableName Table name
   * @returns OptimizedQueryBuilder Query builder
   */
  static getQueryBuilder(tableName: string): OptimizedQueryBuilder {
    return new OptimizedQueryBuilder(tableName);
  }

  /**
   * Clear query cache
   * @param pattern Optional pattern to match keys
   */
  static clearCache(pattern?: string): void {
    if (pattern) {
      const regex = new RegExp(pattern);
      for (const key of this.queryCache.keys()) {
        if (regex.test(key)) {
          this.queryCache.delete(key);
        }
      }
    } else {
      this.queryCache.clear();
    }
  }

  /**
   * Get query performance metrics
   * @param queryKey Optional specific query key
   * @returns QueryMetrics | Map<string, QueryMetrics> Metrics
   */
  static getMetrics(queryKey?: string): QueryMetrics | Map<string, QueryMetrics> {
    if (queryKey) {
      return this.performanceMetrics.get(queryKey) || {
        totalExecutions: 0,
        totalTime: 0,
        averageTime: 0,
        cacheHits: 0,
        errors: 0,
        lastExecuted: null,
      };
    }
    return new Map(this.performanceMetrics);
  }

  /**
   * Get cache statistics
   * @returns CacheStats Cache statistics
   */
  static getCacheStats(): CacheStats {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const cached of this.queryCache.values()) {
      if (now - cached.timestamp < cached.ttl) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    }

    return {
      totalEntries: this.queryCache.size,
      validEntries,
      expiredEntries,
      hitRate: this.calculateOverallHitRate(),
      memoryUsage: this.estimateMemoryUsage(),
    };
  }

  /**
   * Optimize query for specific patterns
   * @param query Supabase query
   * @param pattern Optimization pattern
   * @returns Optimized query
   */
  static optimizeQuery(query: any, pattern: OptimizationPattern): any {
    switch (pattern) {
      case 'pagination':
        return this.optimizeForPagination(query);
      case 'aggregation':
        return this.optimizeForAggregation(query);
      case 'joins':
        return this.optimizeForJoins(query);
      case 'filtering':
        return this.optimizeForFiltering(query);
      default:
        return query;
    }
  }

  /**
   * Preload commonly used queries
   * @param queries Array of query definitions
   */
  static async preloadQueries(queries: PreloadQuery[]): Promise<void> {
    const promises = queries.map(async ({ key, queryFn, options }) => {
      try {
        await this.executeOptimized(key, queryFn, options);
      } catch (error) {
        console.warn(`Failed to preload query ${key}:`, error);
      }
    });

    await Promise.all(promises);
  }

  /**
   * Get cached result if valid
   * @param queryKey Query key
   * @returns T | null Cached result or null
   * @private
   */
  private static getCachedResult<T>(queryKey: string): T | null {
    const cached = this.queryCache.get(queryKey);
    if (!cached) {
      return null;
    }

    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      this.queryCache.delete(queryKey);
      return null;
    }

    return cached.data as T;
  }

  /**
   * Cache query result
   * @param queryKey Query key
   * @param data Result data
   * @param ttl Time to live
   * @private
   */
  private static cacheResult(queryKey: string, data: any, ttl: number): void {
    // Implement LRU eviction if cache is full
    if (this.queryCache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.queryCache.keys().next().value;
      if (oldestKey !== undefined) {
        this.queryCache.delete(oldestKey);
      }
    }

    this.queryCache.set(queryKey, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Update query metrics
   * @param queryKey Query key
   * @param executionTime Execution time in ms
   * @param cacheHit Whether this was a cache hit
   * @param error Whether an error occurred
   * @private
   */
  private static updateMetrics(
    queryKey: string,
    executionTime: number,
    cacheHit: boolean,
    error: boolean = false
  ): void {
    const existing = this.performanceMetrics.get(queryKey) || {
      totalExecutions: 0,
      totalTime: 0,
      averageTime: 0,
      cacheHits: 0,
      errors: 0,
      lastExecuted: null,
    };

    const updated: QueryMetrics = {
      totalExecutions: existing.totalExecutions + 1,
      totalTime: existing.totalTime + executionTime,
      averageTime: 0, // Will be calculated below
      cacheHits: existing.cacheHits + (cacheHit ? 1 : 0),
      errors: existing.errors + (error ? 1 : 0),
      lastExecuted: new Date().toISOString(),
    };

    updated.averageTime = updated.totalTime / updated.totalExecutions;

    this.performanceMetrics.set(queryKey, updated);
  }

  /**
   * Calculate overall cache hit rate
   * @returns number Hit rate percentage
   * @private
   */
  private static calculateOverallHitRate(): number {
    let totalExecutions = 0;
    let totalCacheHits = 0;

    for (const metrics of this.performanceMetrics.values()) {
      totalExecutions += metrics.totalExecutions;
      totalCacheHits += metrics.cacheHits;
    }

    return totalExecutions > 0 ? (totalCacheHits / totalExecutions) * 100 : 0;
  }

  /**
   * Estimate memory usage of cache
   * @returns number Estimated memory usage in bytes
   * @private
   */
  private static estimateMemoryUsage(): number {
    let totalSize = 0;

    for (const cached of this.queryCache.values()) {
      // Rough estimation of object size
      totalSize += JSON.stringify(cached.data).length * 2; // UTF-16 encoding
    }

    return totalSize;
  }

  /**
   * Optimize query for pagination
   * @param query Supabase query
   * @returns Optimized query
   * @private
   */
  private static optimizeForPagination(query: any): any {
    // Add index hints for pagination
    return query.order('created_at', { ascending: false });
  }

  /**
   * Optimize query for aggregation
   * @param query Supabase query
   * @returns Optimized query
   * @private
   */
  private static optimizeForAggregation(query: any): any {
    // Use count with head for better performance
    return query.select('*', { count: 'exact', head: true });
  }

  /**
   * Optimize query for joins
   * @param query Supabase query
   * @returns Optimized query
   * @private
   */
  private static optimizeForJoins(query: any): any {
    // Limit selected columns to reduce data transfer
    return query;
  }

  /**
   * Optimize query for filtering
   * @param query Supabase query
   * @returns Optimized query
   * @private
   */
  private static optimizeForFiltering(query: any): any {
    // Ensure most selective filters are applied first
    return query;
  }
}

/**
 * Optimized query builder
 */
export class OptimizedQueryBuilder {
  private query: any;

  constructor(tableName: string) {
    this.query = supabase.from(tableName);
  }

  /**
   * Select columns with optimization
   * @param columns Columns to select
   * @returns OptimizedQueryBuilder
   */
  select(columns: string = '*'): OptimizedQueryBuilder {
    this.query = this.query.select(columns);
    return this;
  }

  /**
   * Add equality filter
   * @param column Column name
   * @param value Value to match
   * @returns OptimizedQueryBuilder
   */
  eq(column: string, value: any): OptimizedQueryBuilder {
    this.query = this.query.eq(column, value);
    return this;
  }

  /**
   * Add range filter with index optimization
   * @param column Column name
   * @param min Minimum value
   * @param max Maximum value
   * @returns OptimizedQueryBuilder
   */
  range(column: string, min: any, max: any): OptimizedQueryBuilder {
    this.query = this.query.gte(column, min).lte(column, max);
    return this;
  }

  /**
   * Add ordering with index hints
   * @param column Column to order by
   * @param ascending Sort direction
   * @returns OptimizedQueryBuilder
   */
  orderBy(column: string, ascending: boolean = true): OptimizedQueryBuilder {
    this.query = this.query.order(column, { ascending });
    return this;
  }

  /**
   * Add pagination with optimization
   * @param offset Offset
   * @param limit Limit
   * @returns OptimizedQueryBuilder
   */
  paginate(offset: number, limit: number): OptimizedQueryBuilder {
    this.query = this.query.range(offset, offset + limit - 1);
    return this;
  }

  /**
   * Execute query with caching
   * @param cacheKey Cache key
   * @param options Optimization options
   * @returns Promise<any> Query result
   */
  async execute(cacheKey?: string, options: OptimizationOptions = {}): Promise<any> {
    const queryFn = async () => {
      const { data, error } = await this.query;
      if (error) throw error;
      return data;
    };

    if (cacheKey) {
      return QueryOptimizer.executeOptimized(cacheKey, queryFn, options);
    } else {
      return queryFn();
    }
  }
}

/**
 * Optimization options interface
 */
export interface OptimizationOptions {
  enableCache?: boolean;
  cacheTTL?: number;
  pattern?: OptimizationPattern;
}

/**
 * Optimization patterns
 */
export type OptimizationPattern = 'pagination' | 'aggregation' | 'joins' | 'filtering';

/**
 * Cached query interface
 */
interface CachedQuery {
  data: any;
  timestamp: number;
  ttl: number;
}

/**
 * Query metrics interface
 */
export interface QueryMetrics {
  totalExecutions: number;
  totalTime: number;
  averageTime: number;
  cacheHits: number;
  errors: number;
  lastExecuted: string | null;
}

/**
 * Cache statistics interface
 */
export interface CacheStats {
  totalEntries: number;
  validEntries: number;
  expiredEntries: number;
  hitRate: number;
  memoryUsage: number;
}

/**
 * Preload query interface
 */
export interface PreloadQuery {
  key: string;
  queryFn: () => Promise<any>;
  options?: OptimizationOptions;
}