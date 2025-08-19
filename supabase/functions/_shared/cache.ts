// Comprehensive caching system for Edge Functions
// Provides multi-level caching with TTL, LRU eviction, and performance optimization

import { Logger } from './logging.ts';

/**
 * Cache entry interface
 */
export interface CacheEntry<T = any> {
  key: string;
  value: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  accessCount: number;
  lastAccessed: number;
  size?: number; // Size in bytes for memory management
}

/**
 * Cache configuration interface
 */
export interface CacheConfig {
  maxSize: number; // Maximum number of entries
  defaultTtl: number; // Default TTL in milliseconds
  maxMemoryMB: number; // Maximum memory usage in MB
  cleanupInterval: number; // Cleanup interval in milliseconds
  enableMetrics: boolean; // Enable performance metrics
}

/**
 * Cache metrics interface
 */
export interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  hitRate: number;
  memoryUsageMB: number;
  entryCount: number;
}

/**
 * Cache key generator interface
 */
export interface CacheKeyGenerator {
  generateKey(...args: any[]): string;
}

/**
 * In-memory cache implementation with LRU eviction
 */
export class MemoryCache<T = any> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private config: CacheConfig;
  private metrics: CacheMetrics;
  private cleanupTimer?: number;
  private logger: Logger;

  constructor(config: Partial<CacheConfig> = {}, logger?: Logger) {
    this.config = {
      maxSize: 1000,
      defaultTtl: 5 * 60 * 1000, // 5 minutes
      maxMemoryMB: 100,
      cleanupInterval: 60 * 1000, // 1 minute
      enableMetrics: true,
      ...config
    };

    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      hitRate: 0,
      memoryUsageMB: 0,
      entryCount: 0
    };

    this.logger = logger || new Logger('MemoryCache');
    this.startCleanupTimer();
  }

  /**
   * Get value from cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.metrics.misses++;
      this.updateHitRate();
      return null;
    }

    // Check if entry has expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.metrics.misses++;
      this.updateHitRate();
      return null;
    }

    // Update access information
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    
    this.metrics.hits++;
    this.updateHitRate();
    
    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key: string, value: T, ttl?: number): void {
    const now = Date.now();
    const entryTtl = ttl || this.config.defaultTtl;
    
    // Calculate approximate size
    const size = this.calculateSize(value);
    
    const entry: CacheEntry<T> = {
      key,
      value,
      timestamp: now,
      ttl: entryTtl,
      accessCount: 1,
      lastAccessed: now,
      size
    };

    // Check if we need to evict entries
    this.evictIfNecessary();
    
    this.cache.set(key, entry);
    this.metrics.sets++;
    this.updateMetrics();
  }

  /**
   * Delete value from cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.metrics.deletes++;
      this.updateMetrics();
    }
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.resetMetrics();
  }

  /**
   * Get cache metrics
   */
  getMetrics(): CacheMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    return entry !== undefined && !this.isExpired(entry);
  }

  /**
   * Get all keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    hitRate: number;
    memoryUsageMB: number;
    oldestEntry?: string;
    newestEntry?: string;
  } {
    const entries = Array.from(this.cache.values());
    const oldestEntry = entries.reduce((oldest, entry) => 
      entry.timestamp < oldest.timestamp ? entry : oldest, entries[0]);
    const newestEntry = entries.reduce((newest, entry) => 
      entry.timestamp > newest.timestamp ? entry : newest, entries[0]);

    return {
      size: this.cache.size,
      hitRate: this.metrics.hitRate,
      memoryUsageMB: this.metrics.memoryUsageMB,
      oldestEntry: oldestEntry?.key,
      newestEntry: newestEntry?.key
    };
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      this.logger.debug(`Cleaned up ${removedCount} expired cache entries`);
      this.updateMetrics();
    }

    return removedCount;
  }

  /**
   * Destroy cache and cleanup resources
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.clear();
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Evict entries if necessary (LRU + size-based)
   */
  private evictIfNecessary(): void {
    // Check size limit
    if (this.cache.size >= this.config.maxSize) {
      this.evictLRU();
    }

    // Check memory limit
    const memoryUsageMB = this.calculateMemoryUsage();
    if (memoryUsageMB > this.config.maxMemoryMB) {
      this.evictBySize();
    }
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
      this.metrics.evictions++;
      this.logger.debug(`Evicted LRU entry: ${lruKey}`);
    }
  }

  /**
   * Evict entries by size (largest first)
   */
  private evictBySize(): void {
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => (b.size || 0) - (a.size || 0));

    const targetMemory = this.config.maxMemoryMB * 0.8; // Evict to 80% of limit
    let currentMemory = this.calculateMemoryUsage();
    let evictedCount = 0;

    for (const [key] of entries) {
      if (currentMemory <= targetMemory) break;
      
      const entry = this.cache.get(key);
      if (entry) {
        currentMemory -= (entry.size || 0) / (1024 * 1024);
        this.cache.delete(key);
        evictedCount++;
      }
    }

    if (evictedCount > 0) {
      this.metrics.evictions += evictedCount;
      this.logger.debug(`Evicted ${evictedCount} entries to reduce memory usage`);
    }
  }

  /**
   * Calculate approximate size of value
   */
  private calculateSize(value: T): number {
    try {
      return JSON.stringify(value).length * 2; // Rough estimate (UTF-16)
    } catch {
      return 1000; // Default size if serialization fails
    }
  }

  /**
   * Calculate total memory usage in MB
   */
  private calculateMemoryUsage(): number {
    let totalSize = 0;
    for (const entry of this.cache.values()) {
      totalSize += entry.size || 0;
    }
    return totalSize / (1024 * 1024);
  }

  /**
   * Update hit rate
   */
  private updateHitRate(): void {
    const total = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRate = total > 0 ? this.metrics.hits / total : 0;
  }

  /**
   * Update metrics
   */
  private updateMetrics(): void {
    this.metrics.entryCount = this.cache.size;
    this.metrics.memoryUsageMB = this.calculateMemoryUsage();
    this.updateHitRate();
  }

  /**
   * Reset metrics
   */
  private resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      hitRate: 0,
      memoryUsageMB: 0,
      entryCount: 0
    };
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }
}

/**
 * Cache key generators for different data types
 */
export class CacheKeyGenerators {
  /**
   * Generate key for analysis results
   */
  static analysis(ticker: string, context: string, timeframe?: string): string {
    const parts = [ticker, context];
    if (timeframe) parts.push(timeframe);
    return `analysis:${parts.join(':')}`;
  }

  /**
   * Generate key for market data
   */
  static marketData(ticker: string, dataType: string, timeframe?: string): string {
    const parts = [ticker, dataType];
    if (timeframe) parts.push(timeframe);
    return `market:${parts.join(':')}`;
  }

  /**
   * Generate key for company fundamentals
   */
  static fundamentals(ticker: string): string {
    return `fundamentals:${ticker}`;
  }

  /**
   * Generate key for ESG data
   */
  static esg(ticker: string): string {
    return `esg:${ticker}`;
  }

  /**
   * Generate key for technical indicators
   */
  static technical(ticker: string, indicator: string, timeframe: string): string {
    return `technical:${ticker}:${indicator}:${timeframe}`;
  }

  /**
   * Generate key for user API key
   */
  static userApiKey(userId: string): string {
    return `api_key:${userId}`;
  }

  /**
   * Generate key for idea generation
   */
  static ideas(context: string, timeframe?: string): string {
    const parts = [context];
    if (timeframe) parts.push(timeframe);
    return `ideas:${parts.join(':')}`;
  }
}

/**
 * Cache TTL configurations for different data types
 */
export const CacheTTL = {
  // Market data (frequent updates)
  MARKET_DATA: 5 * 60 * 1000, // 5 minutes
  PRICE_DATA: 1 * 60 * 1000, // 1 minute
  
  // Company fundamentals (less frequent updates)
  FUNDAMENTALS: 60 * 60 * 1000, // 1 hour
  FINANCIAL_RATIOS: 60 * 60 * 1000, // 1 hour
  
  // ESG data (infrequent updates)
  ESG_DATA: 24 * 60 * 60 * 1000, // 24 hours
  
  // Technical analysis (depends on timeframe)
  TECHNICAL_1D: 5 * 60 * 1000, // 5 minutes
  TECHNICAL_1W: 30 * 60 * 1000, // 30 minutes
  TECHNICAL_1M: 60 * 60 * 1000, // 1 hour
  
  // Analysis results
  ANALYSIS_RESULTS: 15 * 60 * 1000, // 15 minutes
  
  // User data
  USER_API_KEY: 60 * 60 * 1000, // 1 hour
  
  // Ideas and suggestions
  IDEAS: 30 * 60 * 1000, // 30 minutes
  
  // Default
  DEFAULT: 10 * 60 * 1000 // 10 minutes
};

/**
 * Global cache instances
 */
export class CacheManager {
  private static instances: Map<string, MemoryCache> = new Map();
  private static logger = new Logger('CacheManager');

  /**
   * Get or create cache instance
   */
  static getCache(name: string, config?: Partial<CacheConfig>): MemoryCache {
    if (!this.instances.has(name)) {
      this.instances.set(name, new MemoryCache(config, this.logger));
      this.logger.info(`Created cache instance: ${name}`);
    }
    return this.instances.get(name)!;
  }

  /**
   * Get all cache instances
   */
  static getAllCaches(): Map<string, MemoryCache> {
    return new Map(this.instances);
  }

  /**
   * Clear all caches
   */
  static clearAll(): void {
    for (const [name, cache] of this.instances) {
      cache.clear();
      this.logger.info(`Cleared cache: ${name}`);
    }
  }

  /**
   * Destroy all caches
   */
  static destroyAll(): void {
    for (const [name, cache] of this.instances) {
      cache.destroy();
      this.logger.info(`Destroyed cache: ${name}`);
    }
    this.instances.clear();
  }

  /**
   * Get combined metrics from all caches
   */
  static getCombinedMetrics(): Record<string, CacheMetrics> {
    const metrics: Record<string, CacheMetrics> = {};
    for (const [name, cache] of this.instances) {
      metrics[name] = cache.getMetrics();
    }
    return metrics;
  }
}

/**
 * Cached function decorator
 */
export function cached<T extends (...args: any[]) => Promise<any>>(
  cache: MemoryCache,
  keyGenerator: (...args: Parameters<T>) => string,
  ttl?: number
) {
  return function(target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function(...args: Parameters<T>) {
      const key = keyGenerator(...args);
      
      // Try to get from cache
      const cached = cache.get(key);
      if (cached !== null) {
        return cached;
      }

      // Execute original method
      const result = await method.apply(this, args);
      
      // Store in cache
      cache.set(key, result, ttl);
      
      return result;
    };

    return descriptor;
  };
}