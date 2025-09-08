// Shared TypeScript interfaces for Signal-360 Edge Functions
// These types define the contracts between all analysis modules and the frontend

/**
 * Core request/response interfaces for analysis functions
 */
export interface AnalysisRequest {
  ticker_symbol: string;
  analysis_context: 'investment' | 'trading';
  trading_timeframe?: string; // Required for trading context
  jobId?: string; // Optional job ID for asynchronous workflow
}

export interface AnalysisResponse {
  success: boolean;
  data?: {
    analysis_id: number;
    ticker_symbol: string;
    synthesis_score: number;
    convergence_factors: ConvergenceFactor[];
    divergence_factors: DivergenceFactor[];
    full_report: AnalysisReport;
  };
  error?: {
    code: string;
    message: string;
    details?: string;
  };
}

/**
 * Standard success response interface
 */
export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  request_id: string;
  timestamp: string;
}

/**
 * Standard error response interface
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: string;
    retry_after?: number;
  };
  request_id: string;
  timestamp: string;
}

/**
 * Individual analysis module interfaces
 */
export interface FundamentalAnalysisInput {
  ticker_symbol: string;
  api_key: string;
  analysis_context: 'investment' | 'trading';
}

export interface FundamentalAnalysisOutput {
  score: number; // 0-100
  factors: AnalysisFactor[];
  details: {
    financial_ratios: Record<string, number>;
    growth_metrics: Record<string, number>;
    valuation_metrics: Record<string, number>;
    quality_indicators: Record<string, number>;
  };
  confidence: number; // 0-1
}

export interface TechnicalAnalysisInput {
  ticker_symbol: string;
  api_key: string;
  analysis_context: 'investment' | 'trading';
  trading_timeframe?: string;
}

export interface TechnicalAnalysisOutput {
  score: number; // 0-100
  factors: AnalysisFactor[];
  details: {
    trend_indicators: Record<string, number>;
    momentum_indicators: Record<string, number>;
    volume_indicators: Record<string, number>;
    support_resistance: {
      support_levels: number[];
      resistance_levels: number[];
    };
  };
  confidence: number; // 0-1
}

export interface ESGAnalysisInput {
  ticker_symbol: string;
  api_key: string;
  analysis_context: 'investment' | 'trading';
}

export interface ESGAnalysisOutput {
  score: number; // 0-100
  factors: AnalysisFactor[];
  details: {
    environmental_score: number;
    social_score: number;
    governance_score: number;
    sustainability_metrics: Record<string, number>;
  };
  confidence: number; // 0-1
}

/**
 * Synthesis engine interfaces
 */
export interface SynthesisInput {
  ticker_symbol: string;
  analysis_context: 'investment' | 'trading';
  trading_timeframe?: string;
  fundamental_result: FundamentalAnalysisOutput;
  technical_result: TechnicalAnalysisOutput;
  esg_result: ESGAnalysisOutput;
}

export interface SynthesisOutput {
  synthesis_score: number; // 0-100
  convergence_factors: ConvergenceFactor[];
  divergence_factors: DivergenceFactor[];
  trade_parameters: {
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
  };
  full_report: AnalysisReport;
  confidence: number; // 0-1
}

/**
 * Idea generation interfaces
 */
export interface IdeaGenerationRequest {
  context: 'investment_idea' | 'trade_idea';
  timeframe?: string; // For trade ideas
}

export interface IdeaGenerationResponse {
  success: boolean;
  data?: {
    ticker_symbol: string;
    company_name: string;
    justification: string;
    confidence: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Encryption service interfaces
 */
export interface EncryptionRequest {
  api_key: string;
}

export interface EncryptionResponse {
  success: boolean;
  encrypted_key?: string;
  error?: string;
}

export interface DecryptionRequest {
  encrypted_key: string;
}

export interface DecryptionResponse {
  success: boolean;
  api_key?: string;
  error?: string;
}

/**
 * Core analysis data structures
 */
export interface AnalysisFactor {
  category: 'fundamental' | 'technical' | 'esg';
  type: 'positive' | 'negative';
  description: string;
  weight: number; // 0-1
  confidence: number; // 0-1
  metadata?: Record<string, any>;
}

export interface ConvergenceFactor {
  category: string;
  description: string;
  weight: number;
  supporting_analyses: string[]; // Which analyses support this factor
  metadata?: Record<string, any>;
}

export interface DivergenceFactor {
  category: string;
  description: string;
  weight: number;
  conflicting_analyses: string[]; // Which analyses conflict
  metadata?: Record<string, any>;
}

export interface AnalysisReport {
  summary: string;
  recommendation: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
  fundamental?: FundamentalAnalysisOutput;
  technical?: TechnicalAnalysisOutput;
  esg?: ESGAnalysisOutput;
  synthesis_methodology: string;
  limitations: string[];
  actionable_insights?: string[];
  metadata: {
    analysis_timestamp: string;
    data_sources: string[];
    api_version: string;
    confidence_score?: number;
    factor_analysis_summary?: {
      convergence_factors: number;
      divergence_factors: number;
      net_sentiment: number;
    };
  };
}

/**
 * Error handling interfaces
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: string;
    retry_after?: number; // For rate limit errors
  };
  request_id: string;
  timestamp: string;
}

/**
 * Database integration types (matching existing schema)
 */
export interface Profile {
  id: string;
  encrypted_google_api_key: string | null;
  created_at: string;
  updated_at: string;
}

export interface Analysis {
  id: number;
  user_id: string;
  created_at: string;
  ticker_symbol: string;
  analysis_context: 'investment' | 'trading';
  trading_timeframe: string | null;
  synthesis_score: number;
  convergence_factors: ConvergenceFactor[];
  divergence_factors: DivergenceFactor[];
  full_report: AnalysisReport;
}