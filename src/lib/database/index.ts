// Database utilities index
// Centralized exports for all database services and types

// Main Service Layer
export { DatabaseService } from './database-service';
export type {
  UserData,
  AnalysisDashboard,
  ApiKeyStatus,
  HealthCheck,
  ConnectionInfo,
} from './database-service';

// Individual Services
export { ProfileService } from './profile-service';
export { AnalysisService } from './analysis-service';

// Repository Pattern
export { BaseRepository } from './repositories/base-repository';
export type { PaginatedResult } from './repositories/base-repository';
export { ProfileRepository } from './repositories/profile-repository';
export type { ProfileStats } from './repositories/profile-repository';
export { AnalysisRepository } from './repositories/analysis-repository';
export type {
  AnalysisStats,
  FactorAnalysis,
  TickerTrend,
} from './repositories/analysis-repository';

// Query Optimization
export { QueryOptimizer, OptimizedQueryBuilder } from './query-optimizer';
export type {
  OptimizationOptions,
  OptimizationPattern,
  QueryMetrics,
  CacheStats,
  PreloadQuery,
} from './query-optimizer';

// Utilities
export { ValidationService, VALIDATION_CONSTRAINTS } from './validation';
export type { ValidationResult } from './validation';
export { JsonbHelpers } from './jsonb-helpers';

// Error Handling
export {
  DatabaseErrorHandler,
  ErrorRetryHandler,
  DatabaseOperation,
} from './error-handler';

// Security Layer
export {
  RLSEnforcer,
  InputValidator,
  SecureQueryBuilder,
} from './security';
export type {
  SecurityOperation,
  SecurityContext,
  SecurityEvent,
  TextValidationOptions,
  ArrayValidationOptions,
  DateValidationOptions,
  JSONSchema,
  ComparisonOperator,
} from './security';

// Connection Management
export { ConnectionManager, TransactionManager } from './connection-manager';
export type {
  ConnectionStatus,
  ConnectionMetrics,
  TransactionOperation,
  TransactionOptions,
} from './connection-manager';

// Types
export type {
  Profile,
  Analysis,
  ConvergenceFactor,
  DivergenceFactor,
  AnalysisReport,
  CreateProfileInput,
  UpdateProfileInput,
  CreateAnalysisInput,
  DatabaseError,
  QueryOptions,
  AnalysisFilters,
} from '../../types/database';

// Encryption utilities
export {
  EncryptionService,
  DevEncryptionFallback,
  AdaptiveEncryptionService,
} from '../edge-functions/encryption';