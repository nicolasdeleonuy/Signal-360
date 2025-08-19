// Monitoring and metrics utilities for Edge Functions
// Provides performance monitoring, health checks, and operational metrics

import { Logger } from './logging.ts';

/**
 * Metrics collection interface
 */
export interface Metrics {
  requestCount: number;
  errorCount: number;
  averageResponseTime: number;
  lastRequestTime: string;
  uptime: number;
  memoryUsage?: {
    used: number;
    total: number;
  };
}

/**
 * Request metrics interface
 */
export interface RequestMetrics {
  requestId: string;
  functionName: string;
  method: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  statusCode?: number;
  errorCode?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

/**
 * Global metrics store
 */
class MetricsStore {
  private metrics: Map<string, Metrics> = new Map();
  private requestMetrics: RequestMetrics[] = [];
  private maxRequestHistory = 1000; // Keep last 1000 requests

  /**
   * Initialize metrics for a function
   */
  initializeFunction(functionName: string): void {
    if (!this.metrics.has(functionName)) {
      this.metrics.set(functionName, {
        requestCount: 0,
        errorCount: 0,
        averageResponseTime: 0,
        lastRequestTime: new Date().toISOString(),
        uptime: Date.now()
      });
    }
  }

  /**
   * Record request start
   */
  recordRequestStart(requestMetrics: Omit<RequestMetrics, 'startTime'>): RequestMetrics {
    const fullMetrics: RequestMetrics = {
      ...requestMetrics,
      startTime: Date.now()
    };

    this.requestMetrics.push(fullMetrics);

    // Trim history if needed
    if (this.requestMetrics.length > this.maxRequestHistory) {
      this.requestMetrics = this.requestMetrics.slice(-this.maxRequestHistory);
    }

    return fullMetrics;
  }

  /**
   * Record request completion
   */
  recordRequestEnd(
    requestId: string,
    statusCode: number,
    errorCode?: string,
    metadata?: Record<string, any>
  ): void {
    const requestMetrics = this.requestMetrics.find(r => r.requestId === requestId);
    if (!requestMetrics) return;

    const endTime = Date.now();
    const duration = endTime - requestMetrics.startTime;

    requestMetrics.endTime = endTime;
    requestMetrics.duration = duration;
    requestMetrics.statusCode = statusCode;
    requestMetrics.errorCode = errorCode;
    requestMetrics.metadata = metadata;

    // Update function metrics
    const functionMetrics = this.metrics.get(requestMetrics.functionName);
    if (functionMetrics) {
      functionMetrics.requestCount++;
      functionMetrics.lastRequestTime = new Date().toISOString();

      if (statusCode >= 400) {
        functionMetrics.errorCount++;
      }

      // Update average response time
      const completedRequests = this.requestMetrics.filter(
        r => r.functionName === requestMetrics.functionName && r.duration !== undefined
      );
      
      if (completedRequests.length > 0) {
        const totalTime = completedRequests.reduce((sum, r) => sum + (r.duration || 0), 0);
        functionMetrics.averageResponseTime = totalTime / completedRequests.length;
      }
    }
  }

  /**
   * Get metrics for a function
   */
  getFunctionMetrics(functionName: string): Metrics | undefined {
    return this.metrics.get(functionName);
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Record<string, Metrics> {
    const result: Record<string, Metrics> = {};
    for (const [name, metrics] of this.metrics.entries()) {
      result[name] = { ...metrics };
    }
    return result;
  }

  /**
   * Get recent request metrics
   */
  getRecentRequests(functionName?: string, limit: number = 100): RequestMetrics[] {
    let filtered = this.requestMetrics;
    
    if (functionName) {
      filtered = filtered.filter(r => r.functionName === functionName);
    }

    return filtered
      .slice(-limit)
      .sort((a, b) => b.startTime - a.startTime);
  }

  /**
   * Get error rate for a function
   */
  getErrorRate(functionName: string, timeWindowMs: number = 300000): number {
    const cutoff = Date.now() - timeWindowMs;
    const recentRequests = this.requestMetrics.filter(
      r => r.functionName === functionName && r.startTime > cutoff && r.endTime
    );

    if (recentRequests.length === 0) return 0;

    const errorRequests = recentRequests.filter(r => (r.statusCode || 0) >= 400);
    return errorRequests.length / recentRequests.length;
  }
}

// Global metrics store instance
const metricsStore = new MetricsStore();

/**
 * Request monitor class for tracking individual requests
 */
export class RequestMonitor {
  private requestMetrics: RequestMetrics;
  private logger: Logger;

  constructor(
    functionName: string,
    requestId: string,
    method: string,
    logger: Logger,
    userId?: string
  ) {
    this.logger = logger;
    
    // Initialize function metrics if needed
    metricsStore.initializeFunction(functionName);

    // Record request start
    this.requestMetrics = metricsStore.recordRequestStart({
      requestId,
      functionName,
      method,
      userId
    });

    this.logger.info(`Request started`, {
      requestId,
      method,
      functionName
    });
  }

  /**
   * Record request completion
   */
  end(statusCode: number, errorCode?: string, metadata?: Record<string, any>): void {
    metricsStore.recordRequestEnd(
      this.requestMetrics.requestId,
      statusCode,
      errorCode,
      metadata
    );

    const duration = Date.now() - this.requestMetrics.startTime;
    
    if (statusCode >= 400) {
      this.logger.error(`Request completed with error`, undefined, {
        requestId: this.requestMetrics.requestId,
        statusCode,
        errorCode,
        duration,
        ...metadata
      });
    } else {
      this.logger.info(`Request completed successfully`, {
        requestId: this.requestMetrics.requestId,
        statusCode,
        duration,
        ...metadata
      });
    }
  }

  /**
   * Add metadata to the request
   */
  addMetadata(metadata: Record<string, any>): void {
    this.requestMetrics.metadata = {
      ...this.requestMetrics.metadata,
      ...metadata
    };
  }
}

/**
 * Health check interface
 */
export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    [key: string]: {
      status: 'pass' | 'fail' | 'warn';
      message?: string;
      duration?: number;
    };
  };
  timestamp: string;
}

/**
 * Health checker class
 */
export class HealthChecker {
  private checks: Map<string, () => Promise<{ status: 'pass' | 'fail' | 'warn'; message?: string }>> = new Map();

  /**
   * Register a health check
   */
  registerCheck(
    name: string,
    check: () => Promise<{ status: 'pass' | 'fail' | 'warn'; message?: string }>
  ): void {
    this.checks.set(name, check);
  }

  /**
   * Run all health checks
   */
  async runChecks(): Promise<HealthCheck> {
    const results: HealthCheck['checks'] = {};
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    for (const [name, check] of this.checks.entries()) {
      const startTime = Date.now();
      try {
        const result = await check();
        const duration = Date.now() - startTime;
        
        results[name] = {
          ...result,
          duration
        };

        if (result.status === 'fail') {
          overallStatus = 'unhealthy';
        } else if (result.status === 'warn' && overallStatus === 'healthy') {
          overallStatus = 'degraded';
        }
      } catch (error) {
        results[name] = {
          status: 'fail',
          message: error instanceof Error ? error.message : String(error),
          duration: Date.now() - startTime
        };
        overallStatus = 'unhealthy';
      }
    }

    return {
      status: overallStatus,
      checks: results,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Create a request monitor
 */
export function createRequestMonitor(
  functionName: string,
  requestId: string,
  method: string,
  logger: Logger,
  userId?: string
): RequestMonitor {
  return new RequestMonitor(functionName, requestId, method, logger, userId);
}

/**
 * Get function metrics
 */
export function getFunctionMetrics(functionName: string): Metrics | undefined {
  return metricsStore.getFunctionMetrics(functionName);
}

/**
 * Get all metrics
 */
export function getAllMetrics(): Record<string, Metrics> {
  return metricsStore.getAllMetrics();
}

/**
 * Get recent requests
 */
export function getRecentRequests(functionName?: string, limit: number = 100): RequestMetrics[] {
  return metricsStore.getRecentRequests(functionName, limit);
}

/**
 * Get error rate
 */
export function getErrorRate(functionName: string, timeWindowMs: number = 300000): number {
  return metricsStore.getErrorRate(functionName, timeWindowMs);
}

/**
 * Create a health checker
 */
export function createHealthChecker(): HealthChecker {
  return new HealthChecker();
}

/**
 * Default health checks
 */
export function registerDefaultHealthChecks(healthChecker: HealthChecker): void {
  // Memory usage check
  healthChecker.registerCheck('memory', async () => {
    try {
      // In Deno, we can check memory usage if available
      const memInfo = (Deno as any).memoryUsage?.();
      if (memInfo) {
        const usagePercent = (memInfo.rss / (memInfo.heapTotal || memInfo.rss)) * 100;
        if (usagePercent > 90) {
          return { status: 'fail', message: `High memory usage: ${usagePercent.toFixed(1)}%` };
        } else if (usagePercent > 75) {
          return { status: 'warn', message: `Elevated memory usage: ${usagePercent.toFixed(1)}%` };
        }
      }
      return { status: 'pass', message: 'Memory usage normal' };
    } catch {
      return { status: 'warn', message: 'Memory usage check unavailable' };
    }
  });

  // Environment variables check
  healthChecker.registerCheck('environment', async () => {
    const requiredEnvVars = [
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY'
    ];

    const missing = requiredEnvVars.filter(env => !Deno.env.get(env));
    
    if (missing.length > 0) {
      return { 
        status: 'fail', 
        message: `Missing environment variables: ${missing.join(', ')}` 
      };
    }

    return { status: 'pass', message: 'All required environment variables present' };
  });
}