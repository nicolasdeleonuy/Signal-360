// Performance optimization utilities for Edge Functions
// Provides connection pooling, request batching, and resource management

import { Logger } from './logging.ts';
import { MemoryCache, CacheManager, CacheTTL } from './cache.ts';

/**
 * Connection pool configuration
 */
export interface ConnectionPoolConfig {
  maxConnections: number;
  minConnections: number;
  acquireTimeout: number;
  idleTimeout: number;
  maxLifetime: number;
  retryAttempts: number;
}

/**
 * Connection pool interface
 */
export interface Connection {
  id: string;
  created: number;
  lastUsed: number;
  inUse: boolean;
  client: any;
}

/**
 * HTTP connection pool for external API calls
 */
export class HTTPConnectionPool {
  private connections: Map<string, Connection[]> = new Map();
  private config: ConnectionPoolConfig;
  private logger: Logger;

  constructor(config: Partial<ConnectionPoolConfig> = {}) {
    this.config = {
      maxConnections: 10,
      minConnections: 2,
      acquireTimeout: 5000,
      idleTimeout: 30000,
      maxLifetime: 300000, // 5 minutes
      retryAttempts: 3,
      ...config
    };
    this.logger = new Logger('HTTPConnectionPool');
    this.startCleanupTimer();
  }

  /**
   * Get connection for a host
   */
  async getConnection(host: string): Promise<Connection> {
    const hostConnections = this.connections.get(host) || [];
    
    // Try to find available connection
    const available = hostConnections.find(conn => 
      !conn.inUse && !this.isExpired(conn)
    );

    if (available) {
      available.inUse = true;
      available.lastUsed = Date.now();
      return available;
    }

    // Create new connection if under limit
    if (hostConnections.length < this.config.maxConnections) {
      const connection = await this.createConnection(host);
      hostConnections.push(connection);
      this.connections.set(host, hostConnections);
      return connection;
    }

    // Wait for available connection
    return this.waitForConnection(host);
  }

  /**
   * Release connection back to pool
   */
  releaseConnection(host: string, connection: Connection): void {
    connection.inUse = false;
    connection.lastUsed = Date.now();
  }

  /**
   * Create new connection
   */
  private async createConnection(host: string): Promise<Connection> {
    const connection: Connection = {
      id: `${host}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created: Date.now(),
      lastUsed: Date.now(),
      inUse: true,
      client: null // Would be actual HTTP client in real implementation
    };

    this.logger.debug(`Created new connection for ${host}: ${connection.id}`);
    return connection;
  }

  /**
   * Wait for available connection
   */
  private async waitForConnection(host: string): Promise<Connection> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < this.config.acquireTimeout) {
      const hostConnections = this.connections.get(host) || [];
      const available = hostConnections.find(conn => !conn.inUse);
      
      if (available) {
        available.inUse = true;
        available.lastUsed = Date.now();
        return available;
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    throw new Error(`Connection timeout for ${host}`);
  }

  /**
   * Check if connection is expired
   */
  private isExpired(connection: Connection): boolean {
    const now = Date.now();
    return (
      now - connection.created > this.config.maxLifetime ||
      now - connection.lastUsed > this.config.idleTimeout
    );
  }

  /**
   * Cleanup expired connections
   */
  private cleanup(): void {
    for (const [host, connections] of this.connections.entries()) {
      const validConnections = connections.filter(conn => 
        !this.isExpired(conn) || conn.inUse
      );
      
      if (validConnections.length !== connections.length) {
        this.logger.debug(`Cleaned up ${connections.length - validConnections.length} expired connections for ${host}`);
        this.connections.set(host, validConnections);
      }
    }
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    setInterval(() => {
      this.cleanup();
    }, 60000); // Cleanup every minute
  }
}

/**
 * Request batching utility
 */
export class RequestBatcher<T, R> {
  private batches: Map<string, {
    requests: Array<{ args: T; resolve: (value: R) => void; reject: (error: any) => void }>;
    timer: number;
  }> = new Map();
  
  private batchSize: number;
  private batchTimeout: number;
  private processor: (requests: T[]) => Promise<R[]>;
  private keyGenerator: (args: T) => string;
  private logger: Logger;

  constructor(
    processor: (requests: T[]) => Promise<R[]>,
    keyGenerator: (args: T) => string,
    options: { batchSize?: number; batchTimeout?: number } = {}
  ) {
    this.processor = processor;
    this.keyGenerator = keyGenerator;
    this.batchSize = options.batchSize || 10;
    this.batchTimeout = options.batchTimeout || 100;
    this.logger = new Logger('RequestBatcher');
  }

  /**
   * Add request to batch
   */
  async batch(args: T): Promise<R> {
    const key = this.keyGenerator(args);
    
    return new Promise<R>((resolve, reject) => {
      let batch = this.batches.get(key);
      
      if (!batch) {
        batch = {
          requests: [],
          timer: setTimeout(() => this.processBatch(key), this.batchTimeout)
        };
        this.batches.set(key, batch);
      }
      
      batch.requests.push({ args, resolve, reject });
      
      // Process immediately if batch is full
      if (batch.requests.length >= this.batchSize) {
        clearTimeout(batch.timer);
        this.processBatch(key);
      }
    });
  }

  /**
   * Process batch of requests
   */
  private async processBatch(key: string): Promise<void> {
    const batch = this.batches.get(key);
    if (!batch) return;
    
    this.batches.delete(key);
    
    try {
      const requests = batch.requests.map(r => r.args);
      const results = await this.processor(requests);
      
      // Resolve all requests with their corresponding results
      batch.requests.forEach((request, index) => {
        if (results[index] !== undefined) {
          request.resolve(results[index]);
        } else {
          request.reject(new Error('No result for request'));
        }
      });
      
      this.logger.debug(`Processed batch of ${batch.requests.length} requests for key: ${key}`);
      
    } catch (error) {
      // Reject all requests in the batch
      batch.requests.forEach(request => {
        request.reject(error);
      });
      
      this.logger.error(`Batch processing failed for key: ${key}`, error);
    }
  }
}

/**
 * Resource manager for memory and CPU optimization
 */
export class ResourceManager {
  private static instance: ResourceManager;
  private memoryThreshold: number = 100 * 1024 * 1024; // 100MB
  private cpuThreshold: number = 80; // 80%
  private logger: Logger;

  private constructor() {
    this.logger = new Logger('ResourceManager');
    this.startMonitoring();
  }

  static getInstance(): ResourceManager {
    if (!ResourceManager.instance) {
      ResourceManager.instance = new ResourceManager();
    }
    return ResourceManager.instance;
  }

  /**
   * Check if system resources are available
   */
  checkResources(): { memory: boolean; cpu: boolean; overall: boolean } {
    const memoryOk = this.checkMemory();
    const cpuOk = this.checkCPU();
    
    return {
      memory: memoryOk,
      cpu: cpuOk,
      overall: memoryOk && cpuOk
    };
  }

  /**
   * Get current resource usage
   */
  getResourceUsage(): { memoryMB: number; cpuPercent: number } {
    const memoryMB = this.getMemoryUsage();
    const cpuPercent = this.getCPUUsage();
    
    return { memoryMB, cpuPercent };
  }

  /**
   * Optimize resources by clearing caches and garbage collection
   */
  optimizeResources(): void {
    this.logger.info('Optimizing system resources');
    
    // Clear caches if memory is high
    if (!this.checkMemory()) {
      CacheManager.clearAll();
      this.logger.info('Cleared all caches to free memory');
    }
    
    // Force garbage collection if available
    if (typeof (globalThis as any).gc === 'function') {
      (globalThis as any).gc();
      this.logger.debug('Forced garbage collection');
    }
  }

  /**
   * Check memory usage
   */
  private checkMemory(): boolean {
    const usage = this.getMemoryUsage();
    return usage < this.memoryThreshold / (1024 * 1024);
  }

  /**
   * Check CPU usage
   */
  private checkCPU(): boolean {
    const usage = this.getCPUUsage();
    return usage < this.cpuThreshold;
  }

  /**
   * Get memory usage in MB
   */
  private getMemoryUsage(): number {
    try {
      const memInfo = (performance as any).memory;
      if (memInfo) {
        return memInfo.usedJSHeapSize / (1024 * 1024);
      }
    } catch {
      // Memory info not available
    }
    return 0;
  }

  /**
   * Get CPU usage percentage (approximation)
   */
  private getCPUUsage(): number {
    // This is a simplified approximation
    // In a real implementation, you'd use system-specific APIs
    return 0;
  }

  /**
   * Start resource monitoring
   */
  private startMonitoring(): void {
    setInterval(() => {
      const resources = this.checkResources();
      
      if (!resources.overall) {
        this.logger.warn('High resource usage detected', {
          memory: this.getMemoryUsage(),
          cpu: this.getCPUUsage()
        });
        
        // Auto-optimize if resources are critically low
        if (!resources.memory) {
          this.optimizeResources();
        }
      }
    }, 30000); // Check every 30 seconds
  }
}

/**
 * Performance optimization decorator
 */
export function optimized(options: {
  cache?: boolean;
  cacheTTL?: number;
  batch?: boolean;
  timeout?: number;
} = {}) {
  return function(target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const cache = options.cache ? CacheManager.getCache(`${target.constructor.name}_${propertyName}`) : null;

    descriptor.value = async function(...args: any[]) {
      const startTime = performance.now();
      
      try {
        // Check cache first
        if (cache && options.cache) {
          const cacheKey = `${propertyName}:${JSON.stringify(args)}`;
          const cached = cache.get(cacheKey);
          if (cached !== null) {
            return cached;
          }
        }

        // Check resources
        const resourceManager = ResourceManager.getInstance();
        const resources = resourceManager.checkResources();
        
        if (!resources.overall) {
          throw new Error('Insufficient system resources');
        }

        // Execute with timeout if specified
        let result;
        if (options.timeout) {
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Operation timeout')), options.timeout);
          });
          result = await Promise.race([method.apply(this, args), timeoutPromise]);
        } else {
          result = await method.apply(this, args);
        }

        // Cache result
        if (cache && options.cache) {
          const cacheKey = `${propertyName}:${JSON.stringify(args)}`;
          cache.set(cacheKey, result, options.cacheTTL);
        }

        const duration = performance.now() - startTime;
        if (duration > 1000) { // Log slow operations
          console.warn(`Slow operation detected: ${propertyName} took ${duration.toFixed(2)}ms`);
        }

        return result;

      } catch (error) {
        const duration = performance.now() - startTime;
        console.error(`Operation failed: ${propertyName} after ${duration.toFixed(2)}ms`, error);
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Data compression utilities
 */
export class CompressionUtils {
  /**
   * Compress JSON data
   */
  static compressJSON(data: any): string {
    try {
      const json = JSON.stringify(data);
      // In a real implementation, you'd use actual compression algorithms
      // For now, we'll just return the JSON string
      return json;
    } catch (error) {
      throw new Error(`JSON compression failed: ${error.message}`);
    }
  }

  /**
   * Decompress JSON data
   */
  static decompressJSON(compressed: string): any {
    try {
      return JSON.parse(compressed);
    } catch (error) {
      throw new Error(`JSON decompression failed: ${error.message}`);
    }
  }

  /**
   * Calculate compression ratio
   */
  static getCompressionRatio(original: string, compressed: string): number {
    return compressed.length / original.length;
  }
}

/**
 * Lazy loading utility
 */
export class LazyLoader<T> {
  private loader: () => Promise<T>;
  private cached: T | null = null;
  private loading: Promise<T> | null = null;

  constructor(loader: () => Promise<T>) {
    this.loader = loader;
  }

  /**
   * Get value (load if not cached)
   */
  async get(): Promise<T> {
    if (this.cached !== null) {
      return this.cached;
    }

    if (this.loading) {
      return this.loading;
    }

    this.loading = this.loader();
    this.cached = await this.loading;
    this.loading = null;

    return this.cached;
  }

  /**
   * Clear cached value
   */
  clear(): void {
    this.cached = null;
    this.loading = null;
  }

  /**
   * Check if value is loaded
   */
  isLoaded(): boolean {
    return this.cached !== null;
  }
}

/**
 * Performance metrics collector
 */
export class PerformanceMetrics {
  private static metrics: Map<string, {
    count: number;
    totalTime: number;
    minTime: number;
    maxTime: number;
    avgTime: number;
  }> = new Map();

  /**
   * Record operation performance
   */
  static record(operation: string, duration: number): void {
    const existing = this.metrics.get(operation);
    
    if (existing) {
      existing.count++;
      existing.totalTime += duration;
      existing.minTime = Math.min(existing.minTime, duration);
      existing.maxTime = Math.max(existing.maxTime, duration);
      existing.avgTime = existing.totalTime / existing.count;
    } else {
      this.metrics.set(operation, {
        count: 1,
        totalTime: duration,
        minTime: duration,
        maxTime: duration,
        avgTime: duration
      });
    }
  }

  /**
   * Get metrics for operation
   */
  static getMetrics(operation: string) {
    return this.metrics.get(operation);
  }

  /**
   * Get all metrics
   */
  static getAllMetrics() {
    return new Map(this.metrics);
  }

  /**
   * Clear metrics
   */
  static clear(): void {
    this.metrics.clear();
  }
}

/**
 * Global performance optimization settings
 */
export const PerformanceConfig = {
  // Cache settings
  ENABLE_CACHING: true,
  DEFAULT_CACHE_SIZE: 1000,
  DEFAULT_CACHE_TTL: CacheTTL.DEFAULT,
  
  // Connection pooling
  ENABLE_CONNECTION_POOLING: true,
  MAX_CONNECTIONS_PER_HOST: 10,
  CONNECTION_TIMEOUT: 5000,
  
  // Request batching
  ENABLE_REQUEST_BATCHING: true,
  DEFAULT_BATCH_SIZE: 10,
  DEFAULT_BATCH_TIMEOUT: 100,
  
  // Resource management
  MEMORY_THRESHOLD_MB: 100,
  CPU_THRESHOLD_PERCENT: 80,
  AUTO_OPTIMIZE_RESOURCES: true,
  
  // Performance monitoring
  ENABLE_PERFORMANCE_METRICS: true,
  SLOW_OPERATION_THRESHOLD_MS: 1000,
  
  // Compression
  ENABLE_COMPRESSION: false, // Disabled until proper implementation
  COMPRESSION_THRESHOLD_BYTES: 1024
};