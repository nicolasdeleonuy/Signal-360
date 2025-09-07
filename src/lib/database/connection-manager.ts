// Database connection management utilities
// Provides connection pooling, health monitoring, and transaction management

import { supabase } from '../supabaseClient';
import { DatabaseErrorHandler } from './error-handler';
import { DatabaseError } from '../../types/database';

/**
 * Database connection manager
 * Handles connection health, monitoring, and transaction coordination
 */
export class ConnectionManager {
  private static healthCheckInterval: NodeJS.Timeout | null = null;
  private static connectionStatus: ConnectionStatus = {
    isConnected: false,
    lastCheck: new Date().toISOString(),
    consecutiveFailures: 0,
  };

  /**
   * Initialize connection monitoring
   * @param intervalMs Health check interval in milliseconds
   */
  static initializeMonitoring(intervalMs: number = 30000): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, intervalMs);

    // Perform initial health check
    this.performHealthCheck();
  }

  /**
   * Stop connection monitoring
   */
  static stopMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Perform database health check
   * @returns Promise<boolean> True if connection is healthy
   */
  static async performHealthCheck(): Promise<boolean> {
    try {
      const startTime = Date.now();
      
      // Simple query to test connectivity
      const { error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);

      const responseTime = Date.now() - startTime;

      if (error) {
        this.connectionStatus = {
          isConnected: false,
          lastCheck: new Date().toISOString(),
          consecutiveFailures: this.connectionStatus.consecutiveFailures + 1,
          lastError: error.message,
          responseTime,
        };
        return false;
      }

      this.connectionStatus = {
        isConnected: true,
        lastCheck: new Date().toISOString(),
        consecutiveFailures: 0,
        responseTime,
      };

      return true;
    } catch (error) {
      this.connectionStatus = {
        isConnected: false,
        lastCheck: new Date().toISOString(),
        consecutiveFailures: this.connectionStatus.consecutiveFailures + 1,
        lastError: error instanceof Error ? error.message : 'Unknown error',
      };
      return false;
    }
  }

  /**
   * Get current connection status
   * @returns ConnectionStatus Current status
   */
  static getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  /**
   * Wait for connection to be available
   * @param timeoutMs Timeout in milliseconds
   * @param checkIntervalMs Check interval in milliseconds
   * @returns Promise<boolean> True if connection becomes available
   */
  static async waitForConnection(
    timeoutMs: number = 10000,
    checkIntervalMs: number = 1000
  ): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const isHealthy = await this.performHealthCheck();
      if (isHealthy) {
        return true;
      }

      await new Promise(resolve => setTimeout(resolve, checkIntervalMs));
    }

    return false;
  }

  /**
   * Execute operation with connection verification
   * @param operation Database operation
   * @param context Operation context
   * @returns Promise<T> Operation result
   */
  static async executeWithConnectionCheck<T>(
    operation: () => Promise<T>,
    context: string = 'Database operation'
  ): Promise<T> {
    // Check connection before operation
    if (!this.connectionStatus.isConnected) {
      const isHealthy = await this.performHealthCheck();
      if (!isHealthy) {
        throw DatabaseErrorHandler.handleNetworkError(
          new Error('Database connection unavailable'),
          context
        );
      }
    }

    try {
      return await operation();
    } catch (error: any) {
      // Update connection status if operation failed due to connection issues
      if (this.isConnectionError(error)) {
        this.connectionStatus.isConnected = false;
        this.connectionStatus.consecutiveFailures += 1;
      }

      throw error;
    }
  }

  /**
   * Get connection metrics
   * @returns Promise<ConnectionMetrics> Connection metrics
   */
  static async getConnectionMetrics(): Promise<ConnectionMetrics> {
    const startTime = Date.now();
    let isConnected = false;
    let responseTime = -1;
    let error: string | undefined;

    try {
      const { error: queryError } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);

      responseTime = Date.now() - startTime;
      isConnected = !queryError;
      
      if (queryError) {
        error = queryError.message;
      }
    } catch (err) {
      responseTime = Date.now() - startTime;
      error = err instanceof Error ? err.message : 'Unknown error';
    }

    return {
      isConnected,
      responseTime,
      consecutiveFailures: this.connectionStatus.consecutiveFailures,
      lastCheck: new Date().toISOString(),
      error,
    };
  }

  /**
   * Reset connection status
   */
  static resetConnectionStatus(): void {
    this.connectionStatus = {
      isConnected: false,
      lastCheck: new Date().toISOString(),
      consecutiveFailures: 0,
    };
  }

  /**
   * Check if error is connection-related
   * @param error Error to check
   * @returns boolean True if connection error
   * @private
   */
  private static isConnectionError(error: any): boolean {
    if (!error) return false;

    const connectionErrorCodes = [
      'NETWORK_ERROR',
      'CONNECTION_ERROR',
      '08000', // Connection exception
      '08003', // Connection does not exist
      '08006', // Connection failure
    ];

    const connectionErrorMessages = [
      'network error',
      'connection',
      'timeout',
      'unreachable',
      'refused',
    ];

    // Check error code
    if (error.code && connectionErrorCodes.includes(error.code)) {
      return true;
    }

    // Check error message
    const message = (error.message || '').toLowerCase();
    return connectionErrorMessages.some(keyword => message.includes(keyword));
  }
}

/**
 * Transaction manager for coordinating multiple operations
 */
export class TransactionManager {
  /**
   * Execute multiple operations in sequence with rollback capability
   * @param operations Array of operations with rollback functions
   * @returns Promise<T[]> Results of all operations
   */
  static async executeTransaction<T>(
    operations: TransactionOperation<T>[]
  ): Promise<T[]> {
    const results: T[] = [];
    const completedOperations: TransactionOperation<T>[] = [];

    try {
      for (const operation of operations) {
        const result = await ConnectionManager.executeWithConnectionCheck(
          operation.execute,
          operation.name || 'Transaction operation'
        );
        
        results.push(result);
        completedOperations.push(operation);
      }

      return results;
    } catch (error) {
      // Attempt to rollback completed operations
      console.warn('Transaction failed, attempting rollback:', error);
      
      for (const operation of completedOperations.reverse()) {
        if (operation.rollback) {
          try {
            await operation.rollback();
            console.log(`Rolled back operation: ${operation.name}`);
          } catch (rollbackError) {
            console.error(`Rollback failed for operation ${operation.name}:`, rollbackError);
          }
        }
      }

      throw error;
    }
  }

  /**
   * Execute operations with retry and rollback
   * @param operations Array of operations
   * @param options Transaction options
   * @returns Promise<T[]> Results of all operations
   */
  static async executeWithRetry<T>(
    operations: TransactionOperation<T>[],
    options: TransactionOptions = {}
  ): Promise<T[]> {
    const { maxRetries = 3, baseDelay = 1000 } = options;
    let lastError: DatabaseError | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.executeTransaction(operations);
      } catch (error) {
        const dbError = error as DatabaseError;
        lastError = dbError;

        // Don't retry if it's not a retryable error
        if (!DatabaseErrorHandler.isRetryableError(dbError)) {
          throw dbError;
        }

        // Don't retry on the last attempt
        if (attempt === maxRetries) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));

        console.warn(`Retrying transaction (attempt ${attempt + 1}/${maxRetries + 1}) after ${delay}ms`);
      }
    }

    throw lastError;
  }
}

/**
 * Connection status interface
 */
export interface ConnectionStatus {
  isConnected: boolean;
  lastCheck: string;
  consecutiveFailures: number;
  lastError?: string;
  responseTime?: number;
}

/**
 * Connection metrics interface
 */
export interface ConnectionMetrics {
  isConnected: boolean;
  responseTime: number;
  consecutiveFailures: number;
  lastCheck: string;
  error?: string;
}

/**
 * Transaction operation interface
 */
export interface TransactionOperation<T> {
  name?: string;
  execute: () => Promise<T>;
  rollback?: () => Promise<void>;
}

/**
 * Transaction options interface
 */
export interface TransactionOptions {
  maxRetries?: number;
  baseDelay?: number;
  timeout?: number;
}