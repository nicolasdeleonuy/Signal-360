// Connection pooling for external API calls
// Optimizes HTTP connections to external services for better performance

import { Logger } from './logging.ts';
import { PerformanceMetrics } from './performance.ts';

/**
 * Connection pool configuration for external APIs
 */
export interface APIConnectionConfig {
  baseURL: string;
  maxConnections: number;
  connectionTimeout: number;
  requestTimeout: number;
  retryAttempts: number;
  retryDelay: number;
  keepAlive: boolean;
  headers?: Record<string, string>;
}

/**
 * Connection wrapper for HTTP requests
 */
export interface PooledConnection {
  id: string;
  baseURL: string;
  created: number;
  lastUsed: number;
  inUse: boolean;
  requestCount: number;
  errorCount: number;
}

/**
 * HTTP Connection Pool Manager for external APIs
 */
export class APIConnectionPool {
  private connections: Map<string, PooledConnection[]> = new Map();
  private config: Map<string, APIConnectionConfig> = new Map();
  private logger: Logger;
  private cleanupInterval: number;

  constructor() {
    this.logger = new Logger('APIConnectionPool');
    this.startCleanupTimer();
  }

  /**
   * Register API configuration
   */
  registerAPI(name: string, config: APIConnectionConfig): void {
    this.config.set(name, config);
    this.connections.set(name, []);
    this.logger.info(`Registered API connection pool: ${name} (${config.baseURL})`);
  }

  /**
   * Get connection for API
   */
  async getConnection(apiName: string): Promise<PooledConnection> {
    const config = this.config.get(apiName);
    if (!config) {
      throw new Error(`API not registered: ${apiName}`);
    }

    const connections = this.connections.get(apiName) || [];
    
    // Find available connection
    const available = connections.find(conn => 
      !conn.inUse && this.isConnectionValid(conn, config)
    );

    if (available) {
      available.inUse = true;
      available.lastUsed = Date.now();
      return available;
    }

    // Create new connection if under limit
    if (connections.length < config.maxConnections) {
      const connection = this.createConnection(apiName, config);
      connections.push(connection);
      this.connections.set(apiName, connections);
      return connection;
    }

    // Wait for available connection
    return this.waitForConnection(apiName, config);
  }

  /**
   * Release connection back to pool
   */
  releaseConnection(apiName: string, connection: PooledConnection, success: boolean = true): void {
    connection.inUse = false;
    connection.lastUsed = Date.now();
    connection.requestCount++;
    
    if (!success) {
      connection.errorCount++;
    }

    // Remove connection if it has too many errors
    if (connection.errorCount > 5) {
      this.removeConnection(apiName, connection.id);
      this.logger.warn(`Removed connection ${connection.id} due to excessive errors`);
    }
  }

  /**
   * Make HTTP request using connection pool
   */
  async request(
    apiName: string,
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const startTime = performance.now();
    const config = this.config.get(apiName);
    
    if (!config) {
      throw new Error(`API not registered: ${apiName}`);
    }

    const connection = await this.getConnection(apiName);
    
    try {
      const url = `${config.baseURL}${endpoint}`;
      const requestOptions: RequestInit = {
        ...options,
        headers: {
          ...config.headers,
          ...options.headers,
        },
        signal: AbortSignal.timeout(config.requestTimeout),
      };

      const response = await fetch(url, requestOptions);
      
      this.releaseConnection(apiName, connection, response.ok);
      PerformanceMetrics.record(`api_request_${apiName}`, performance.now() - startTime);
      
      return response;
      
    } catch (error) {
      this.releaseConnection(apiName, connection, false);
      PerformanceMetrics.record(`api_request_error_${apiName}`, performance.now() - startTime);
      throw error;
    }
  }

  /**
   * Create new connection
   */
  private createConnection(apiName: string, config: APIConnectionConfig): PooledConnection {
    const connection: PooledConnection = {
      id: `${apiName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      baseURL: config.baseURL,
      created: Date.now(),
      lastUsed: Date.now(),
      inUse: true,
      requestCount: 0,
      errorCount: 0
    };

    this.logger.debug(`Created new connection for ${apiName}: ${connection.id}`);
    return connection;
  }

  /**
   * Wait for available connection
   */
  private async waitForConnection(apiName: string, config: APIConnectionConfig): Promise<PooledConnection> {
    const startTime = Date.now();
    const timeout = config.connectionTimeout;
    
    while (Date.now() - startTime < timeout) {
      const connections = this.connections.get(apiName) || [];
      const available = connections.find(conn => !conn.inUse);
      
      if (available) {
        available.inUse = true;
        available.lastUsed = Date.now();
        return available;
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    throw new Error(`Connection timeout for API: ${apiName}`);
  }

  /**
   * Check if connection is valid
   */
  private isConnectionValid(connection: PooledConnection, config: APIConnectionConfig): boolean {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes
    const maxIdle = 2 * 60 * 1000; // 2 minutes
    
    return (
      now - connection.created < maxAge &&
      now - connection.lastUsed < maxIdle &&
      connection.errorCount < 3
    );
  }

  /**
   * Remove connection from pool
   */
  private removeConnection(apiName: string, connectionId: string): void {
    const connections = this.connections.get(apiName) || [];
    const filtered = connections.filter(conn => conn.id !== connectionId);
    this.connections.set(apiName, filtered);
  }

  /**
   * Cleanup expired connections
   */
  private cleanup(): void {
    for (const [apiName, connections] of this.connections.entries()) {
      const config = this.config.get(apiName);
      if (!config) continue;

      const validConnections = connections.filter(conn => 
        this.isConnectionValid(conn, config) || conn.inUse
      );
      
      if (validConnections.length !== connections.length) {
        this.logger.debug(`Cleaned up ${connections.length - validConnections.length} expired connections for ${apiName}`);
        this.connections.set(apiName, validConnections);
      }
    }
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Cleanup every minute
  }

  /**
   * Get pool statistics
   */
  getStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    for (const [apiName, connections] of this.connections.entries()) {
      const config = this.config.get(apiName);
      const activeConnections = connections.filter(conn => conn.inUse).length;
      const totalRequests = connections.reduce((sum, conn) => sum + conn.requestCount, 0);
      const totalErrors = connections.reduce((sum, conn) => sum + conn.errorCount, 0);
      
      stats[apiName] = {
        totalConnections: connections.length,
        activeConnections,
        maxConnections: config?.maxConnections || 0,
        totalRequests,
        totalErrors,
        errorRate: totalRequests > 0 ? totalErrors / totalRequests : 0
      };
    }
    
    return stats;
  }

  /**
   * Destroy pool and cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.connections.clear();
    this.config.clear();
    this.logger.info('Connection pool destroyed');
  }
}

/**
 * Global connection pool instance
 */
export const globalConnectionPool = new APIConnectionPool();

/**
 * Initialize common API connections
 */
export function initializeAPIConnections(): void {
  // Google Finance API
  globalConnectionPool.registerAPI('google-finance', {
    baseURL: 'https://www.googleapis.com/finance/v1',
    maxConnections: 5,
    connectionTimeout: 10000,
    requestTimeout: 15000,
    retryAttempts: 2,
    retryDelay: 1000,
    keepAlive: true,
    headers: {
      'User-Agent': 'Signal-360-Analysis/1.0',
      'Accept': 'application/json'
    }
  });

  // Financial Modeling Prep API
  globalConnectionPool.registerAPI('fmp', {
    baseURL: 'https://financialmodelingprep.com/api/v3',
    maxConnections: 8,
    connectionTimeout: 8000,
    requestTimeout: 12000,
    retryAttempts: 3,
    retryDelay: 500,
    keepAlive: true,
    headers: {
      'User-Agent': 'Signal-360-Analysis/1.0',
      'Accept': 'application/json'
    }
  });

  // Alpha Vantage API
  globalConnectionPool.registerAPI('alpha-vantage', {
    baseURL: 'https://www.alphavantage.co/query',
    maxConnections: 3,
    connectionTimeout: 12000,
    requestTimeout: 20000,
    retryAttempts: 2,
    retryDelay: 2000,
    keepAlive: true,
    headers: {
      'User-Agent': 'Signal-360-Analysis/1.0',
      'Accept': 'application/json'
    }
  });

  // News API
  globalConnectionPool.registerAPI('news-api', {
    baseURL: 'https://newsapi.org/v2',
    maxConnections: 4,
    connectionTimeout: 10000,
    requestTimeout: 15000,
    retryAttempts: 2,
    retryDelay: 1000,
    keepAlive: true,
    headers: {
      'User-Agent': 'Signal-360-Analysis/1.0',
      'Accept': 'application/json'
    }
  });

  console.log('API connection pools initialized');
}

/**
 * Helper function to make API requests with connection pooling
 */
export async function makePooledAPIRequest(
  apiName: string,
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  const response = await globalConnectionPool.request(apiName, endpoint, options);
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
}