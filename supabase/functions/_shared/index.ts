// Comprehensive shared utilities index
// Exports all shared functionality for Edge Functions

// Error handling and retry logic
export {
  ERROR_CODES,
  ERROR_STATUS_CODES,
  AppError,
  generateRequestId,
  DEFAULT_RETRY_CONFIG,
  RATE_LIMITED_RETRY_CONFIG,
  withRetry,
  withTimeout,
  withRetryAndTimeout,
  CircuitBreaker,
  type RetryConfig,
  type CircuitBreakerConfig
} from './errors.ts';

// HTTP utilities and response formatting
export {
  CORS_HEADERS,
  createSuccessResponse,
  createSuccessHttpResponse,
  handleCorsPreflightRequest,
  isMethodAllowed,
  createMethodNotAllowedResponse,
  createErrorResponse,
  createErrorHttpResponse,
  parseJsonBody,
  createRequestHandler,
  type SuccessResponse,
  type ErrorResponse
} from './http.ts';

// Logging and structured logging
export {
  LogLevel,
  Logger,
  createLogger,
  PerformanceMonitor,
  createPerformanceMonitor,
  type LogEntry
} from './logging.ts';

// Monitoring and metrics
export {
  RequestMonitor,
  HealthChecker,
  createRequestMonitor,
  getFunctionMetrics,
  getAllMetrics,
  getRecentRequests,
  getErrorRate,
  createHealthChecker,
  registerDefaultHealthChecks,
  type Metrics,
  type RequestMetrics,
  type HealthCheck
} from './monitoring.ts';

// Authentication utilities
export {
  authenticateUser,
  createServiceClient,
  createAuthErrorResponse,
  type UserContext,
  type AuthResult
} from './auth.ts';

// Validation utilities
export {
  validateRequest,
  validateAnalysisRequest,
  validateEncryptionRequest,
  validateDecryptionRequest,
  validateIdeaGenerationRequest,
  type ValidationResult,
  type ValidationSchema
} from './validation.ts';

// Configuration management
export {
  getConfig,
  type Config
} from './config.ts';

// Database utilities
export {
  DatabaseService,
  createDatabaseService,
  type DatabaseConfig
} from './database.ts';

// Security utilities
export {
  RateLimiter,
  InputSanitizer,
  SecurityHeaders,
  SecurityMiddleware,
  JWTUtils,
  DEFAULT_RATE_LIMITS,
  createSecurityMiddleware,
  type RateLimitConfig
} from './security.ts';

// Security configuration
export {
  DEFAULT_SECURITY_CONFIG,
  getSecurityConfig,
  validateSecurityConfig,
  getEnvironmentSecurityConfig,
  createSecurityEvent,
  SecurityLevel,
  SecurityEventType,
  type SecurityConfig,
  type SecurityMetrics,
  type SecurityEvent
} from './security-config.ts';

// Caching utilities
export {
  MemoryCache,
  CacheManager,
  CacheKeyGenerators,
  CacheTTL,
  cached,
  type CacheEntry,
  type CacheConfig,
  type CacheMetrics,
  type CacheKeyGenerator
} from './cache.ts';

// Performance optimization utilities
export {
  HTTPConnectionPool,
  RequestBatcher,
  ResourceManager,
  PerformanceMetrics,
  LazyLoader,
  CompressionUtils,
  optimized,
  PerformanceConfig,
  type ConnectionPoolConfig,
  type Connection
} from './performance.ts';

// Analysis-specific caching
export {
  AnalysisCacheManager,
  CachedAnalysisService,
  globalAnalysisCache,
  globalCachedAnalysisService,
  type AnalysisCacheConfig,
  CacheInvalidationStrategy
} from './analysis-cache.ts';

// Type definitions
export * from './types.ts';