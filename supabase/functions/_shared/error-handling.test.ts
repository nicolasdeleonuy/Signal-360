// Comprehensive tests for error handling and logging utilities
// Tests retry logic, circuit breakers, logging, and monitoring

import { assertEquals, assertExists, assert } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import {
  AppError,
  ERROR_CODES,
  withRetry,
  withTimeout,
  withRetryAndTimeout,
  CircuitBreaker,
  DEFAULT_RETRY_CONFIG
} from './errors.ts';
import { createLogger, LogLevel } from './logging.ts';
import { createRequestMonitor, createHealthChecker } from './monitoring.ts';

Deno.test('AppError - creates error with correct properties', () => {
  const error = new AppError(
    ERROR_CODES.INVALID_REQUEST,
    'Test error message',
    'Additional details',
    5000
  );

  assertEquals(error.code, ERROR_CODES.INVALID_REQUEST);
  assertEquals(error.message, 'Test error message');
  assertEquals(error.details, 'Additional details');
  assertEquals(error.retryAfter, 5000);
  assertEquals(error.statusCode, 400);
  assertEquals(error.name, 'AppError');
});

Deno.test('withRetry - succeeds on first attempt', async () => {
  let attempts = 0;
  const operation = async () => {
    attempts++;
    return 'success';
  };

  const result = await withRetry(operation, DEFAULT_RETRY_CONFIG, 'test-operation');
  
  assertEquals(result, 'success');
  assertEquals(attempts, 1);
});

Deno.test('withRetry - retries on retryable errors', async () => {
  let attempts = 0;
  const operation = async () => {
    attempts++;
    if (attempts < 3) {
      throw new AppError(ERROR_CODES.EXTERNAL_API_ERROR, 'API temporarily unavailable');
    }
    return 'success';
  };

  const result = await withRetry(operation, DEFAULT_RETRY_CONFIG, 'test-operation');
  
  assertEquals(result, 'success');
  assertEquals(attempts, 3);
});

Deno.test('withRetry - fails after max attempts', async () => {
  let attempts = 0;
  const operation = async () => {
    attempts++;
    throw new AppError(ERROR_CODES.EXTERNAL_API_ERROR, 'API unavailable');
  };

  try {
    await withRetry(operation, { ...DEFAULT_RETRY_CONFIG, maxAttempts: 2 }, 'test-operation');
    assert(false, 'Should have thrown an error');
  } catch (error) {
    assertEquals(error.code, ERROR_CODES.EXTERNAL_API_ERROR);
    assertEquals(attempts, 2);
  }
});

Deno.test('withRetry - does not retry non-retryable errors', async () => {
  let attempts = 0;
  const operation = async () => {
    attempts++;
    throw new AppError(ERROR_CODES.INVALID_REQUEST, 'Bad request');
  };

  try {
    await withRetry(operation, DEFAULT_RETRY_CONFIG, 'test-operation');
    assert(false, 'Should have thrown an error');
  } catch (error) {
    assertEquals(error.code, ERROR_CODES.INVALID_REQUEST);
    assertEquals(attempts, 1);
  }
});

Deno.test('withTimeout - succeeds within timeout', async () => {
  const operation = async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    return 'success';
  };

  const result = await withTimeout(operation, 1000, 'test-operation');
  assertEquals(result, 'success');
});

Deno.test('withTimeout - fails when timeout exceeded', async () => {
  const operation = async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return 'success';
  };

  try {
    await withTimeout(operation, 100, 'test-operation');
    assert(false, 'Should have thrown a timeout error');
  } catch (error) {
    assertEquals(error.code, ERROR_CODES.API_TIMEOUT);
    assert(error.message.includes('timed out'));
  }
});

Deno.test('withRetryAndTimeout - combines retry and timeout', async () => {
  let attempts = 0;
  const operation = async () => {
    attempts++;
    if (attempts < 2) {
      await new Promise(resolve => setTimeout(resolve, 50));
      throw new AppError(ERROR_CODES.EXTERNAL_API_ERROR, 'Temporary failure');
    }
    await new Promise(resolve => setTimeout(resolve, 50));
    return 'success';
  };

  const result = await withRetryAndTimeout(
    operation,
    500, // 500ms timeout per attempt
    { ...DEFAULT_RETRY_CONFIG, maxAttempts: 3 },
    'test-operation'
  );

  assertEquals(result, 'success');
  assertEquals(attempts, 2);
});

Deno.test('CircuitBreaker - allows requests when closed', async () => {
  const circuitBreaker = new CircuitBreaker('test-circuit', {
    failureThreshold: 3,
    recoveryTimeout: 1000,
    monitoringPeriod: 5000
  });

  const operation = async () => 'success';
  const result = await circuitBreaker.execute(operation);

  assertEquals(result, 'success');
  assertEquals(circuitBreaker.getStatus().state, 'CLOSED');
});

Deno.test('CircuitBreaker - opens after failure threshold', async () => {
  const circuitBreaker = new CircuitBreaker('test-circuit', {
    failureThreshold: 2,
    recoveryTimeout: 1000,
    monitoringPeriod: 5000
  });

  const failingOperation = async () => {
    throw new Error('Operation failed');
  };

  // First failure
  try {
    await circuitBreaker.execute(failingOperation);
  } catch (error) {
    // Expected
  }

  // Second failure - should open circuit
  try {
    await circuitBreaker.execute(failingOperation);
  } catch (error) {
    // Expected
  }

  assertEquals(circuitBreaker.getStatus().state, 'OPEN');
  assertEquals(circuitBreaker.getStatus().failures, 2);

  // Third attempt should fail immediately due to open circuit
  try {
    await circuitBreaker.execute(failingOperation);
    assert(false, 'Should have failed due to open circuit');
  } catch (error) {
    assertEquals(error.code, ERROR_CODES.SERVICE_UNAVAILABLE);
    assert(error.message.includes('Circuit breaker'));
  }
});

Deno.test('Logger - creates structured log entries', () => {
  const logger = createLogger('test-function', 'req-123', 'user-456');
  
  // Capture console output
  const originalLog = console.log;
  let logOutput = '';
  console.log = (message: string) => {
    logOutput = message;
  };

  logger.info('Test message', { key: 'value' });

  // Restore console.log
  console.log = originalLog;

  const logEntry = JSON.parse(logOutput);
  assertEquals(logEntry.level, LogLevel.INFO);
  assertEquals(logEntry.message, 'Test message');
  assertEquals(logEntry.functionName, 'test-function');
  assertEquals(logEntry.requestId, 'req-123');
  assertEquals(logEntry.userId, 'user-456');
  assertEquals(logEntry.metadata.key, 'value');
  assertExists(logEntry.timestamp);
});

Deno.test('Logger - sanitizes sensitive metadata', () => {
  const logger = createLogger('test-function');
  
  const originalLog = console.log;
  let logOutput = '';
  console.log = (message: string) => {
    logOutput = message;
  };

  logger.info('Test message', {
    api_key: 'secret-key',
    password: 'secret-password',
    normal_field: 'normal-value'
  });

  console.log = originalLog;

  const logEntry = JSON.parse(logOutput);
  assertEquals(logEntry.metadata.api_key, '[REDACTED]');
  assertEquals(logEntry.metadata.password, '[REDACTED]');
  assertEquals(logEntry.metadata.normal_field, 'normal-value');
});

Deno.test('Logger - logs errors with stack traces', () => {
  const logger = createLogger('test-function');
  
  const originalError = console.error;
  let logOutput = '';
  console.error = (message: string) => {
    logOutput = message;
  };

  const testError = new Error('Test error');
  logger.error('Error occurred', testError, { context: 'test' });

  console.error = originalError;

  const logEntry = JSON.parse(logOutput);
  assertEquals(logEntry.level, LogLevel.ERROR);
  assertEquals(logEntry.message, 'Error occurred');
  assertEquals(logEntry.error.name, 'Error');
  assertEquals(logEntry.error.message, 'Test error');
  assertExists(logEntry.error.stack);
  assertEquals(logEntry.metadata.context, 'test');
});

Deno.test('RequestMonitor - tracks request lifecycle', () => {
  const logger = createLogger('test-function');
  
  const originalLog = console.log;
  const logs: string[] = [];
  console.log = (message: string) => {
    logs.push(message);
  };

  const monitor = createRequestMonitor('test-function', 'req-123', 'POST', logger, 'user-456');
  
  // Add some metadata
  monitor.addMetadata({ operation: 'test' });
  
  // End the request
  monitor.end(200, undefined, { result: 'success' });

  console.log = originalLog;

  // Should have start and end log entries
  assert(logs.length >= 2);
  
  const startLog = JSON.parse(logs[0]);
  assertEquals(startLog.message, 'Request started');
  assertEquals(startLog.metadata.requestId, 'req-123');
  assertEquals(startLog.metadata.method, 'POST');

  const endLog = JSON.parse(logs[logs.length - 1]);
  assertEquals(endLog.message, 'Request completed successfully');
  assertEquals(endLog.metadata.statusCode, 200);
  assertEquals(endLog.metadata.result, 'success');
  assertExists(endLog.metadata.duration);
});

Deno.test('HealthChecker - runs health checks', async () => {
  const healthChecker = createHealthChecker();
  
  // Register test checks
  healthChecker.registerCheck('always-pass', async () => ({
    status: 'pass',
    message: 'All good'
  }));
  
  healthChecker.registerCheck('always-warn', async () => ({
    status: 'warn',
    message: 'Warning condition'
  }));

  const result = await healthChecker.runChecks();

  assertEquals(result.status, 'degraded'); // Due to warning
  assertEquals(result.checks['always-pass'].status, 'pass');
  assertEquals(result.checks['always-warn'].status, 'warn');
  assertExists(result.checks['always-pass'].duration);
  assertExists(result.checks['always-warn'].duration);
  assertExists(result.timestamp);
});

Deno.test('HealthChecker - handles failing checks', async () => {
  const healthChecker = createHealthChecker();
  
  healthChecker.registerCheck('always-fail', async () => {
    throw new Error('Check failed');
  });

  const result = await healthChecker.runChecks();

  assertEquals(result.status, 'unhealthy');
  assertEquals(result.checks['always-fail'].status, 'fail');
  assertEquals(result.checks['always-fail'].message, 'Check failed');
});

Deno.test('HealthChecker - determines overall status correctly', async () => {
  const healthChecker = createHealthChecker();
  
  healthChecker.registerCheck('pass-1', async () => ({ status: 'pass' }));
  healthChecker.registerCheck('pass-2', async () => ({ status: 'pass' }));

  let result = await healthChecker.runChecks();
  assertEquals(result.status, 'healthy');

  // Add a warning
  healthChecker.registerCheck('warn-1', async () => ({ status: 'warn' }));
  result = await healthChecker.runChecks();
  assertEquals(result.status, 'degraded');

  // Add a failure
  healthChecker.registerCheck('fail-1', async () => ({ status: 'fail' }));
  result = await healthChecker.runChecks();
  assertEquals(result.status, 'unhealthy');
});