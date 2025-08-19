// Comprehensive logging utilities for Edge Functions
// Provides structured logging with different levels and security considerations

/**
 * Log levels for different types of messages
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

/**
 * Structured log entry interface
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  requestId?: string;
  userId?: string;
  functionName?: string;
  duration?: number;
  metadata?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
}

/**
 * Logger class with structured logging capabilities
 */
export class Logger {
  private functionName: string;
  private requestId?: string;
  private userId?: string;

  constructor(functionName: string, requestId?: string, userId?: string) {
    this.functionName = functionName;
    this.requestId = requestId;
    this.userId = userId;
  }

  /**
   * Create a structured log entry
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    metadata?: Record<string, any>,
    error?: Error,
    duration?: number
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      functionName: this.functionName,
      requestId: this.requestId,
      userId: this.userId
    };

    if (duration !== undefined) {
      entry.duration = duration;
    }

    if (metadata) {
      // Sanitize metadata to remove sensitive information
      entry.metadata = this.sanitizeMetadata(metadata);
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code
      };
    }

    return entry;
  }

  /**
   * Sanitize metadata to remove sensitive information
   */
  private sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
    const sanitized = { ...metadata };
    const sensitiveKeys = [
      'api_key', 'apiKey', 'password', 'token', 'secret', 'key',
      'authorization', 'encrypted_key', 'decrypted_key'
    ];

    for (const key of Object.keys(sanitized)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Log debug message
   */
  debug(message: string, metadata?: Record<string, any>): void {
    const entry = this.createLogEntry(LogLevel.DEBUG, message, metadata);
    console.log(JSON.stringify(entry));
  }

  /**
   * Log info message
   */
  info(message: string, metadata?: Record<string, any>): void {
    const entry = this.createLogEntry(LogLevel.INFO, message, metadata);
    console.log(JSON.stringify(entry));
  }

  /**
   * Log warning message
   */
  warn(message: string, metadata?: Record<string, any>): void {
    const entry = this.createLogEntry(LogLevel.WARN, message, metadata);
    console.warn(JSON.stringify(entry));
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error, metadata?: Record<string, any>): void {
    const entry = this.createLogEntry(LogLevel.ERROR, message, metadata, error);
    console.error(JSON.stringify(entry));
  }

  /**
   * Log performance metrics
   */
  performance(operation: string, duration: number, metadata?: Record<string, any>): void {
    const message = `${operation} completed in ${duration}ms`;
    const entry = this.createLogEntry(LogLevel.INFO, message, metadata, undefined, duration);
    console.log(JSON.stringify(entry));
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: { requestId?: string; userId?: string }): Logger {
    return new Logger(
      this.functionName,
      additionalContext.requestId || this.requestId,
      additionalContext.userId || this.userId
    );
  }
}

/**
 * Create a logger instance for a function
 */
export function createLogger(functionName: string, requestId?: string, userId?: string): Logger {
  return new Logger(functionName, requestId, userId);
}

/**
 * Performance monitoring utility
 */
export class PerformanceMonitor {
  private startTime: number;
  private logger: Logger;
  private operation: string;

  constructor(logger: Logger, operation: string) {
    this.logger = logger;
    this.operation = operation;
    this.startTime = Date.now();
  }

  /**
   * End performance monitoring and log results
   */
  end(metadata?: Record<string, any>): number {
    const duration = Date.now() - this.startTime;
    this.logger.performance(this.operation, duration, metadata);
    return duration;
  }
}

/**
 * Create a performance monitor
 */
export function createPerformanceMonitor(logger: Logger, operation: string): PerformanceMonitor {
  return new PerformanceMonitor(logger, operation);
}