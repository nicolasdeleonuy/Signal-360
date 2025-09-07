// Database type definitions for Signal-360
// These interfaces match the PostgreSQL schema defined in the database migrations

/**
 * Profile interface matching the profiles table schema
 * Linked one-to-one with auth.users via UUID
 */
export interface Profile {
  /** UUID from auth.users, serves as both PK and FK */
  id: string;
  /** Encrypted Google API key using pgsodium - null if not set */
  encrypted_google_api_key: string | null;
  /** Profile creation timestamp */
  created_at: string;
  /** Last profile update timestamp */
  updated_at: string;
}

/**
 * Analysis interface matching the analyses table schema
 * Contains comprehensive analysis results and metadata
 */
export interface Analysis {
  /** Auto-incrementing primary key */
  id: number;
  /** Foreign key to profiles.id, enforces user ownership */
  user_id: string;
  /** Analysis creation timestamp */
  created_at: string;
  /** Stock ticker symbol (normalized to uppercase) */
  ticker_symbol: string;
  /** Type of analysis: investment or trading */
  analysis_context: 'investment' | 'trading';
  /** Trading timeframe (e.g., 1D, 1W, 1M) - null for investment analysis */
  trading_timeframe: string | null;
  /** Final analysis score from 0-100 */
  synthesis_score: number;
  /** JSONB array of positive factors */
  convergence_factors: ConvergenceFactor[];
  /** JSONB array of negative factors */
  divergence_factors: DivergenceFactor[];
  /** Complete analysis report in JSONB format */
  full_report: AnalysisReport;
}

/**
 * Convergence factor structure for positive analysis indicators
 */
export interface ConvergenceFactor {
  /** Factor category (e.g., 'fundamental', 'technical', 'esg') */
  category: string;
  /** Human-readable factor description */
  description: string;
  /** Numerical weight or score for this factor */
  weight: number;
  /** Additional metadata for the factor */
  metadata?: Record<string, any>;
}

/**
 * Divergence factor structure for negative analysis indicators
 */
export interface DivergenceFactor {
  /** Factor category (e.g., 'fundamental', 'technical', 'esg') */
  category: string;
  /** Human-readable factor description */
  description: string;
  /** Numerical weight or score for this factor */
  weight: number;
  /** Additional metadata for the factor */
  metadata?: Record<string, any>;
}

/**
 * Complete analysis report structure
 */
export interface AnalysisReport {
  /** Summary of the analysis */
  summary: string;
  /** Fundamental analysis results */
  fundamental?: {
    score: number;
    factors: string[];
    details: Record<string, any>;
  };
  /** Technical analysis results */
  technical?: {
    score: number;
    factors: string[];
    details: Record<string, any>;
  };
  /** ESG analysis results */
  esg?: {
    score: number;
    factors: string[];
    details: Record<string, any>;
  };
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Input type for creating a new profile
 */
export interface CreateProfileInput {
  /** User ID from auth.users */
  id: string;
  /** Optional Google API key (will be encrypted before storage) */
  google_api_key?: string;
}

/**
 * Input type for updating a profile
 */
export interface UpdateProfileInput {
  /** Optional Google API key (will be encrypted before storage) */
  google_api_key?: string;
}

/**
 * Input type for creating a new analysis
 */
export interface CreateAnalysisInput {
  /** Stock ticker symbol */
  ticker_symbol: string;
  /** Type of analysis */
  analysis_context: 'investment' | 'trading';
  /** Trading timeframe (required for trading analysis) */
  trading_timeframe?: string | null;
  /** Final synthesis score */
  synthesis_score: number;
  /** Positive factors */
  convergence_factors: ConvergenceFactor[];
  /** Negative factors */
  divergence_factors: DivergenceFactor[];
  /** Complete analysis report */
  full_report: AnalysisReport;
}

/**
 * Database error types for better error handling
 */
export interface DatabaseError {
  /** Error code from PostgreSQL */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Additional error details */
  details?: string;
  /** SQL hint if available */
  hint?: string;
}

/**
 * Query options for filtering and pagination
 */
export interface QueryOptions {
  /** Number of records to return */
  limit?: number;
  /** Number of records to skip */
  offset?: number;
  /** Sort order */
  order_by?: string;
  /** Sort direction */
  ascending?: boolean;
}

/**
 * Analysis query filters
 */
export interface AnalysisFilters extends QueryOptions {
  /** Filter by ticker symbol */
  ticker_symbol?: string;
  /** Filter by analysis context */
  analysis_context?: 'investment' | 'trading';
  /** Filter by trading timeframe */
  trading_timeframe?: string;
  /** Filter by date range */
  date_from?: string;
  date_to?: string;
}