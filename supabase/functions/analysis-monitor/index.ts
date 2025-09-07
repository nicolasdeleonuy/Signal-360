// Analysis monitoring and health check endpoint
// Provides real-time monitoring, health checks, and performance metrics for the analysis pipeline

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  createRequestHandler,
  createSuccessHttpResponse,
  createErrorHttpResponse,
  AppError,
  ERROR_CODES,
  createHealthChecker,
  registerDefaultHealthChecks
} from '../_shared/index.ts';

import {
  globalRateLimiter,
  globalCircuitBreakers,
  AnalysisPerformanceMonitor,
  ANALYSIS_ERROR_CODES
} from '../_shared/analysis-error-handler.ts';

/**
 * Analysis system health and monitoring data
 */
interface AnalysisSystemStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  components: {
    database: ComponentStatus;
    external_apis: {
      google_api: ComponentStatus;
      financial_data: ComponentStatus;
      news_api: ComponentStatus;
    };
    circuit_breakers: Record<string, CircuitBreakerStatus>;
    rate_limits: Record<string, RateLimitStatus>;
  };
  performance: {
    analysis_stats: Record<string, PerformanceStats>;
    system_metrics: SystemMetrics;
  };
  recent_errors: ErrorSummary[];
  alerts: Alert[];
}

interface ComponentStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  last_check: string;
  response_time?: number;
  error_message?: string;
  uptime_percentage?: number;
}

interface CircuitBreakerStatus {
  state: 'closed' | 'open' | 'half-open';
  failure_count: number;
  last_failure?: string;
  success_rate?: number;
}

interface RateLimitStatus {
  used: number;
  limit: number;
  remaining: number;
  reset_time: string;
  utilization_percentage: number;
}

interface PerformanceStats {
  average_duration: number;
  error_rate: number;
  total_analyses: number;
  p95_duration?: number;
  p99_duration?: number;
}

interface SystemMetrics {
  memory_usage: number;
  cpu_usage?: number;
  active_connections: number;
  request_rate: number;
}

interface ErrorSummary {
  timestamp: string;
  error_code: string;
  message: string;
  stage: string;
  ticker?: string;
  count: number;
}

interface Alert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
  component: string;
  resolved: boolean;
}

/**
 * Analysis monitoring service
 */
class AnalysisMonitoringService {
  private startTime: number;
  private healthChecker: any;
  private recentErrors: Map<string, ErrorSummary> = new Map();
  private alerts: Alert[] = [];

  constructor() {
    this.startTime = Date.now();
    this.healthChecker = createHealthChecker();
    this.setupHealthChecks();
    this.setupErrorTracking();
  }

  /**
   * Setup health checks for all components
   */
  private setupHealthChecks(): void {
    // Register default health checks
    registerDefaultHealthChecks(this.healthChecker);

    // Add analysis-specific health checks
    this.healthChecker.registerCheck('google-api', async () => {
      try {
        // Simple health check - could be enhanced with actual API call
        const circuitBreaker = globalCircuitBreakers.getBreaker('google-api');
        const state = circuitBreaker.getState();
        
        if (state === 'open') {
          return {
            status: 'fail',
            message: 'Google API circuit breaker is open',
            details: { circuit_breaker_state: state }
          };
        }

        return {
          status: 'pass',
          message: 'Google API circuit breaker is healthy',
          details: { circuit_breaker_state: state }
        };
      } catch (error) {
        return {
          status: 'fail',
          message: `Google API health check failed: ${error.message}`
        };
      }
    });

    this.healthChecker.registerCheck('financial-data-api', async () => {
      try {
        const circuitBreaker = globalCircuitBreakers.getBreaker('financial-data');
        const state = circuitBreaker.getState();
        
        return {
          status: state === 'open' ? 'fail' : 'pass',
          message: `Financial data API circuit breaker state: ${state}`,
          details: { circuit_breaker_state: state }
        };
      } catch (error) {
        return {
          status: 'fail',
          message: `Financial data API health check failed: ${error.message}`
        };
      }
    });

    this.healthChecker.registerCheck('news-api', async () => {
      try {
        const circuitBreaker = globalCircuitBreakers.getBreaker('news-api');
        const state = circuitBreaker.getState();
        
        return {
          status: state === 'open' ? 'fail' : 'pass',
          message: `News API circuit breaker state: ${state}`,
          details: { circuit_breaker_state: state }
        };
      } catch (error) {
        return {
          status: 'fail',
          message: `News API health check failed: ${error.message}`
        };
      }
    });

    this.healthChecker.registerCheck('rate-limits', async () => {
      try {
        const googleQuota = globalRateLimiter.getQuotaStatus('google-api');
        const financialQuota = globalRateLimiter.getQuotaStatus('financial-data');
        const newsQuota = globalRateLimiter.getQuotaStatus('news-api');

        const highUtilization = [googleQuota, financialQuota, newsQuota].some(
          quota => (quota.used / quota.limit) > 0.9
        );

        return {
          status: highUtilization ? 'warn' : 'pass',
          message: highUtilization ? 'High rate limit utilization detected' : 'Rate limits healthy',
          details: {
            google_api: googleQuota,
            financial_data: financialQuota,
            news_api: newsQuota
          }
        };
      } catch (error) {
        return {
          status: 'fail',
          message: `Rate limit health check failed: ${error.message}`
        };
      }
    });
  }

  /**
   * Setup error tracking
   */
  private setupErrorTracking(): void {
    // This would typically integrate with a logging system
    // For now, we'll track errors in memory
    setInterval(() => {
      this.cleanupOldErrors();
      this.checkForAlerts();
    }, 60000); // Check every minute
  }

  /**
   * Get comprehensive system status
   */
  async getSystemStatus(): Promise<AnalysisSystemStatus> {
    const healthResults = await this.healthChecker.runChecks();
    const circuitBreakerStatus = globalCircuitBreakers.getStatus();
    const performanceStats = AnalysisPerformanceMonitor.getStats();

    // Determine overall system status
    const overallStatus = this.determineOverallStatus(healthResults, circuitBreakerStatus);

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      version: '2.0.0',
      components: {
        database: this.mapHealthResult(healthResults.database),
        external_apis: {
          google_api: this.mapHealthResult(healthResults['google-api']),
          financial_data: this.mapHealthResult(healthResults['financial-data-api']),
          news_api: this.mapHealthResult(healthResults['news-api'])
        },
        circuit_breakers: this.mapCircuitBreakerStatus(circuitBreakerStatus),
        rate_limits: this.getRateLimitStatus()
      },
      performance: {
        analysis_stats: this.mapPerformanceStats(performanceStats),
        system_metrics: await this.getSystemMetrics()
      },
      recent_errors: Array.from(this.recentErrors.values()),
      alerts: this.alerts.filter(alert => !alert.resolved)
    };
  }

  /**
   * Record an error for monitoring
   */
  recordError(error: any, stage: string, ticker?: string): void {
    const errorKey = `${error.code || 'UNKNOWN'}-${stage}`;
    const existing = this.recentErrors.get(errorKey);

    if (existing) {
      existing.count++;
      existing.timestamp = new Date().toISOString();
    } else {
      this.recentErrors.set(errorKey, {
        timestamp: new Date().toISOString(),
        error_code: error.code || 'UNKNOWN',
        message: error.message || 'Unknown error',
        stage,
        ticker,
        count: 1
      });
    }

    // Check if this error should trigger an alert
    this.checkErrorForAlert(error, stage, ticker);
  }

  /**
   * Determine overall system status
   */
  private determineOverallStatus(
    healthResults: any,
    circuitBreakerStatus: any
  ): 'healthy' | 'degraded' | 'unhealthy' {
    const healthStatuses = Object.values(healthResults).map((result: any) => result.status);
    const circuitBreakerStates = Object.values(circuitBreakerStatus).map((status: any) => status.state);

    // Check for critical failures
    if (healthStatuses.includes('fail') || circuitBreakerStates.includes('open')) {
      const criticalFailures = healthStatuses.filter(status => status === 'fail').length;
      const openBreakers = circuitBreakerStates.filter(state => state === 'open').length;
      
      if (criticalFailures > 1 || openBreakers > 1) {
        return 'unhealthy';
      } else {
        return 'degraded';
      }
    }

    // Check for warnings
    if (healthStatuses.includes('warn')) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Map health check result to component status
   */
  private mapHealthResult(result: any): ComponentStatus {
    if (!result) {
      return {
        status: 'unhealthy',
        last_check: new Date().toISOString(),
        error_message: 'Health check not found'
      };
    }

    return {
      status: result.status === 'pass' ? 'healthy' : 
              result.status === 'warn' ? 'degraded' : 'unhealthy',
      last_check: new Date().toISOString(),
      response_time: result.responseTime,
      error_message: result.status !== 'pass' ? result.message : undefined
    };
  }

  /**
   * Map circuit breaker status
   */
  private mapCircuitBreakerStatus(status: any): Record<string, CircuitBreakerStatus> {
    const mapped: Record<string, CircuitBreakerStatus> = {};
    
    for (const [name, breaker] of Object.entries(status)) {
      const breakerStatus = breaker as any;
      mapped[name] = {
        state: breakerStatus.state,
        failure_count: breakerStatus.failures,
        last_failure: breakerStatus.lastFailure?.toISOString()
      };
    }
    
    return mapped;
  }

  /**
   * Get rate limit status for all APIs
   */
  private getRateLimitStatus(): Record<string, RateLimitStatus> {
    const apis = ['google-api', 'financial-data', 'news-api'];
    const status: Record<string, RateLimitStatus> = {};

    for (const api of apis) {
      const quota = globalRateLimiter.getQuotaStatus(api);
      status[api] = {
        used: quota.used,
        limit: quota.limit,
        remaining: quota.remaining,
        reset_time: new Date(quota.resetTime).toISOString(),
        utilization_percentage: Math.round((quota.used / quota.limit) * 100)
      };
    }

    return status;
  }

  /**
   * Map performance statistics
   */
  private mapPerformanceStats(stats: any): Record<string, PerformanceStats> {
    const mapped: Record<string, PerformanceStats> = {};
    
    for (const [key, stat] of Object.entries(stats)) {
      const statData = stat as any;
      mapped[key] = {
        average_duration: Math.round(statData.averageDuration),
        error_rate: Math.round(statData.errorRate * 100) / 100,
        total_analyses: statData.totalAnalyses
      };
    }
    
    return mapped;
  }

  /**
   * Get system metrics
   */
  private async getSystemMetrics(): Promise<SystemMetrics> {
    // In a real implementation, this would gather actual system metrics
    return {
      memory_usage: Math.round((performance as any).memory?.usedJSHeapSize / 1024 / 1024) || 0,
      active_connections: 0, // Would be tracked by connection pool
      request_rate: 0 // Would be calculated from recent requests
    };
  }

  /**
   * Clean up old errors (keep only last hour)
   */
  private cleanupOldErrors(): void {
    const oneHourAgo = Date.now() - 3600000;
    
    for (const [key, error] of this.recentErrors) {
      if (new Date(error.timestamp).getTime() < oneHourAgo) {
        this.recentErrors.delete(key);
      }
    }
  }

  /**
   * Check for conditions that should trigger alerts
   */
  private checkForAlerts(): void {
    // Check error rates
    const errorCounts = Array.from(this.recentErrors.values());
    const highErrorCount = errorCounts.filter(error => error.count > 10);
    
    if (highErrorCount.length > 0) {
      this.createAlert(
        'high-error-rate',
        'high',
        `High error rate detected: ${highErrorCount.length} error types with >10 occurrences`,
        'error-tracking'
      );
    }

    // Check circuit breaker states
    const breakerStatus = globalCircuitBreakers.getStatus();
    for (const [name, status] of Object.entries(breakerStatus)) {
      if (status.state === 'open') {
        this.createAlert(
          `circuit-breaker-${name}`,
          'critical',
          `Circuit breaker for ${name} is open`,
          name
        );
      }
    }

    // Check rate limit utilization
    const rateLimits = this.getRateLimitStatus();
    for (const [api, status] of Object.entries(rateLimits)) {
      if (status.utilization_percentage > 90) {
        this.createAlert(
          `rate-limit-${api}`,
          'medium',
          `High rate limit utilization for ${api}: ${status.utilization_percentage}%`,
          api
        );
      }
    }
  }

  /**
   * Check if an error should trigger an alert
   */
  private checkErrorForAlert(error: any, stage: string, ticker?: string): void {
    // Critical errors that should always alert
    const criticalErrors = [
      ANALYSIS_ERROR_CODES.DATABASE_ERROR,
      ANALYSIS_ERROR_CODES.INTERNAL_ERROR,
      ANALYSIS_ERROR_CODES.SYNTHESIS_FAILED
    ];

    if (criticalErrors.includes(error.code)) {
      this.createAlert(
        `critical-error-${error.code}`,
        'critical',
        `Critical error in ${stage}: ${error.message}`,
        stage
      );
    }
  }

  /**
   * Create an alert
   */
  private createAlert(id: string, severity: Alert['severity'], message: string, component: string): void {
    // Check if alert already exists and is not resolved
    const existing = this.alerts.find(alert => alert.id === id && !alert.resolved);
    if (existing) {
      return; // Don't create duplicate alerts
    }

    this.alerts.push({
      id,
      severity,
      message,
      timestamp: new Date().toISOString(),
      component,
      resolved: false
    });

    // Auto-resolve alerts after 1 hour
    setTimeout(() => {
      const alert = this.alerts.find(a => a.id === id);
      if (alert) {
        alert.resolved = true;
      }
    }, 3600000);
  }
}

/**
 * Global monitoring service instance
 */
const monitoringService = new AnalysisMonitoringService();

/**
 * Main request handler for monitoring endpoint
 */
const handleMonitoring = async (request: Request, requestId: string): Promise<Response> => {
  try {
    const url = new URL(request.url);
    const path = url.pathname;

    // Route different monitoring endpoints
    if (path.endsWith('/health')) {
      // Simple health check
      const healthResults = await monitoringService.healthChecker.runChecks();
      const isHealthy = Object.values(healthResults).every((result: any) => result.status === 'pass');
      
      return createSuccessHttpResponse({
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        checks: healthResults
      }, requestId);

    } else if (path.endsWith('/status')) {
      // Comprehensive system status
      const systemStatus = await monitoringService.getSystemStatus();
      return createSuccessHttpResponse(systemStatus, requestId);

    } else if (path.endsWith('/metrics')) {
      // Performance metrics only
      const performanceStats = AnalysisPerformanceMonitor.getStats();
      const rateLimits = monitoringService.getRateLimitStatus();
      
      return createSuccessHttpResponse({
        timestamp: new Date().toISOString(),
        performance: performanceStats,
        rate_limits: rateLimits
      }, requestId);

    } else {
      // Default: return basic status
      const systemStatus = await monitoringService.getSystemStatus();
      return createSuccessHttpResponse({
        status: systemStatus.status,
        timestamp: systemStatus.timestamp,
        uptime: systemStatus.uptime,
        version: systemStatus.version
      }, requestId);
    }

  } catch (error) {
    console.error(`Monitoring request failed for request ${requestId}:`, error);
    return createErrorHttpResponse(error, requestId);
  }
};

// Create and serve the request handler
const handler = createRequestHandler(handleMonitoring, ['GET']);

serve(handler);

// Export monitoring service for use by other functions
export { monitoringService };