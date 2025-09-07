// Comprehensive type definitions for the analysis-engine module
// Contains all shared interfaces, types, and data structures

/**
 * Base analysis result interface for individual engines
 */
export interface AnalysisResult {
  score: number;                    // 0-100 analysis score
  confidence: number;               // 0-1 confidence level
  factors: AnalysisFactor[];        // Supporting factors
  metadata: AnalysisMetadata;       // Engine-specific metadata
  timestamp: string;                // Analysis timestamp
  status: 'success' | 'error' | 'partial';
}

/**
 * Analysis factor interface for individual supporting factors
 */
export interface AnalysisFactor {
  type: 'positive' | 'negative';
  category: string;
  description: string;
  weight: number;                   // Impact weight 0-1
  confidence?: number;              // Factor confidence 0-1
}

/**
 * Engine metadata interface for analysis context
 */
export interface AnalysisMetadata {
  engineVersion: string;
  dataSource: string;
  processingTime: number;           // Processing time in milliseconds
  dataQuality: number;              // 0-1 data quality score
  [key: string]: any;               // Engine-specific fields
}

/**
 * Final synthesis result interface
 */
export interface SynthesisResult {
  synthesis_score: number;          // 0-100 final score
  convergence_factors: ConvergenceFactor[];
  divergence_factors: DivergenceFactor[];
  trade_parameters: TradeParameters;
  full_report: AnalysisReport;
  confidence: number;               // Overall confidence 0-1
}

/**
 * Convergence factor interface for aligned signals
 */
export interface ConvergenceFactor {
  category: string;
  description: string;
  weight: number;
  supporting_analyses: string[];
  metadata?: {
    [key: string]: any;
  };
}

/**
 * Divergence factor interface for conflicting signals
 */
export interface DivergenceFactor {
  category: string;
  description: string;
  weight: number;
  conflicting_analyses: string[];
  metadata?: {
    [key: string]: any;
  };
}

/**
 * Trade parameters interface for trading recommendations
 */
export interface TradeParameters {
  entry_price: number;
  stop_loss: number;
  take_profit_levels: number[];
  risk_reward_ratio: number;
  position_size_recommendation: number; // As percentage of portfolio
  confidence: number;
  methodology: string;
  metadata: {
    calculation_timestamp: string;
    volatility_used: number;
    support_resistance_levels: {
      support: number[];
      resistance: number[];
    };
    risk_metrics: {
      max_drawdown_risk: number;
      expected_return: number;
      sharpe_estimate: number;
    };
  };
}

/**
 * Analysis report interface for comprehensive reporting
 */
export interface AnalysisReport {
  summary: string;
  recommendation: string;
  key_insights: string[];
  risk_assessment: string;
  time_horizon: string;
  confidence_level: string;
  methodology: string;
  data_sources: string[];
  limitations: string[];
  last_updated: string;
}

/**
 * Request interface for analysis requests
 */
export interface AnalysisRequest {
  ticker: string;
  context: 'investment' | 'trading';
  apiKey: string;
}

/**
 * Engine results aggregation interface
 */
export interface EngineResults {
  fundamental: AnalysisResult | null;
  technical: AnalysisResult | null;
  eco: AnalysisResult | null;
  errors: EngineError[];
}

/**
 * Engine error interface for error tracking
 */
export interface EngineError {
  engine: string;
  error: Error;
  timestamp: string;
  recoverable: boolean;
}

// =============================================================================
// MIGRATED INTERFACES FROM googleApiService.ts
// =============================================================================

/**
 * Company information interface
 */
export interface CompanyInfo {
  name: string;
  sector: string;
  industry: string;
  marketCap: number;
  sharesOutstanding: number;
  currentPrice: number;
  peRatio: number;
  pbRatio: number;
  dividendYield: number;
  beta: number;
  description?: string;
  website?: string;
  employees?: number;
}

/**
 * Financial statement interface
 */
export interface FinancialStatement {
  revenue: number;
  netIncome: number;
  totalAssets: number;
  totalLiabilities: number;
  shareholderEquity: number;
  operatingCashFlow: number;
  freeCashFlow: number;
  totalDebt: number;
  currentAssets: number;
  currentLiabilities: number;
  period: string;
  reportDate: string;
}

/**
 * Financial ratios interface
 */
export interface FinancialRatios {
  profitability: {
    roe: number;
    roa: number;
    netMargin: number;
    grossMargin: number;
    operatingMargin: number;
  };
  liquidity: {
    currentRatio: number;
    quickRatio: number;
    cashRatio: number;
  };
  leverage: {
    debtToEquity: number;
    debtRatio: number;
    equityRatio: number;
    timesInterestEarned: number;
  };
  efficiency: {
    assetTurnover: number;
    inventoryTurnover: number;
    receivablesTurnover: number;
  };
  valuation: {
    peRatio: number;
    pbRatio: number;
    psRatio: number;
    pegRatio: number;
    evToEbitda: number;
  };
}

/**
 * Growth metrics interface
 */
export interface GrowthMetrics {
  revenueGrowth: number;
  earningsGrowth: number;
  fcfGrowth: number;
  revenueCAGR3Y: number;
  earningsCAGR3Y: number;
}

/**
 * Quality indicators interface
 */
export interface QualityIndicators {
  roicTrend: number;
  marginStability: number;
  debtTrend: number;
  fcfConsistency: number;
}

/**
 * Fundamental analysis data interface
 */
export interface FundamentalAnalysisData {
  ticker: string;
  companyInfo: CompanyInfo;
  financialStatements: FinancialStatement[];
  financialRatios: FinancialRatios;
  growthMetrics: GrowthMetrics;
  qualityIndicators: QualityIndicators;
  dataSources: string[];
  lastUpdated: string;
}

/**
 * Google API client configuration interface
 */
export interface GoogleApiConfig {
  apiKey: string;
  customSearchEngineId?: string;
  timeout?: number;
  retryAttempts?: number;
  rateLimitDelay?: number;
}

// =============================================================================
// ERROR HANDLING TYPES
// =============================================================================

/**
 * Analysis engine error types
 */
export enum AnalysisErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  PROCESSING_ERROR = 'PROCESSING_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  DATA_QUALITY_ERROR = 'DATA_QUALITY_ERROR'
}

/**
 * Analysis engine error interface
 */
export interface AnalysisEngineError extends Error {
  type: AnalysisErrorType;
  engine: string;
  statusCode?: number;
  retryable: boolean;
  context?: Record<string, any>;
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Neutral analysis result for failed engines
 */
export const NEUTRAL_ANALYSIS_RESULT: AnalysisResult = {
  score: 50,                    // Neutral score
  confidence: 0.1,              // Low confidence
  factors: [],                  // No factors
  metadata: {
    engineVersion: 'neutral',
    dataSource: 'fallback',
    processingTime: 0,
    dataQuality: 0
  },
  timestamp: new Date().toISOString(),
  status: 'error'
};

/**
 * Engine execution timeout in milliseconds
 */
export const ENGINE_TIMEOUT_MS = 30000; // 30 seconds

/**
 * Maximum number of retry attempts for API calls
 */
export const MAX_RETRY_ATTEMPTS = 3;

/**
 * Default rate limit delay in milliseconds
 */
export const DEFAULT_RATE_LIMIT_DELAY = 1000; // 1 second

/**
 * Synthesis weighting configuration
 */
export interface SynthesisWeights {
  investment: {
    fundamental: number;
    technical: number;
    esg: number;
  };
  trading: {
    fundamental: number;
    technical: number;
    esg: number;
  };
}

/**
 * Default synthesis weights
 */
export const DEFAULT_SYNTHESIS_WEIGHTS: SynthesisWeights = {
  investment: {
    fundamental: 0.60,
    technical: 0.25,
    esg: 0.15
  },
  trading: {
    fundamental: 0.35,
    technical: 0.50,
    esg: 0.15
  }
};

/**
 * Technical analysis data interface (for placeholder implementation)
 */
export interface TechnicalAnalysisData {
  ticker: string;
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;
  volume: number;
  movingAverages: {
    sma20: number;
    sma50: number;
    sma200: number;
    ema12: number;
    ema26: number;
  };
  technicalIndicators: {
    rsi: number;
    macd: number;
    macdSignal: number;
    macdHistogram: number;
    stochastic: number;
    bollingerBands: {
      upper: number;
      middle: number;
      lower: number;
    };
  };
  supportResistance: {
    support: number[];
    resistance: number[];
  };
  trend: 'bullish' | 'bearish' | 'neutral';
  momentum: 'strong' | 'moderate' | 'weak';
  volatility: number;
  lastUpdated: string;
}

/**
 * Sentiment analysis data interface (for placeholder implementation)
 */
export interface SentimentAnalysisData {
  ticker: string;
  overallSentiment: 'positive' | 'negative' | 'neutral';
  sentimentScore: number; // -1 to 1
  newsAnalysis: {
    totalArticles: number;
    positiveArticles: number;
    negativeArticles: number;
    neutralArticles: number;
    averageSentiment: number;
    keyTopics: string[];
  };
  socialMediaSentiment: {
    mentions: number;
    positiveRatio: number;
    negativeRatio: number;
    neutralRatio: number;
    trendingScore: number;
  };
  esgScore: number; // 0-100
  esgFactors: {
    environmental: number;
    social: number;
    governance: number;
  };
  lastUpdated: string;
}

/**
 * API response wrapper interface
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: string;
    processingTime: number;
    version: string;
  };
}

/**
 * Logging level enumeration
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

/**
 * Log entry interface
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  engine?: string;
  ticker?: string;
}