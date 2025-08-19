// Dashboard-specific TypeScript interfaces

export type AnalysisStep = 'input' | 'analysis' | 'goal-selection' | 'synthesis' | 'results';

export type InvestmentGoalType = 'investment' | 'trading';

export type TradingTimeframe = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y';

export type RecommendationType = 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';

export type AnalysisStageStatus = 'pending' | 'running' | 'completed' | 'failed';

export type DashboardErrorType = 'validation' | 'api' | 'network' | 'timeout';

export interface InvestmentGoal {
  type: InvestmentGoalType;
  timeframe?: TradingTimeframe;
  description: string;
}

export interface TickerSuggestion {
  symbol: string;
  name: string;
  exchange: string;
}

export interface AnalysisStageInfo {
  status: AnalysisStageStatus;
  progress: number; // 0-100
  message: string;
  started_at?: string;
  completed_at?: string;
}

export interface AnalysisProgress {
  overall_progress: number; // 0-100
  stages: {
    fundamental: AnalysisStageInfo;
    technical: AnalysisStageInfo;
    esg: AnalysisStageInfo;
    synthesis: AnalysisStageInfo;
  };
  estimated_completion: string; // ISO timestamp
  current_stage: string;
}

export interface AnalysisProgressProps {
  progress: AnalysisProgress;
  onCancel?: () => void;
}

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

export interface AnalysisResult {
  synthesisScore: number; // A score from 0 to 100
  recommendation: 'BUY' | 'SELL' | 'HOLD';
  convergenceFactors: string[]; // Key points supporting the recommendation
  divergenceFactors: string[]; // Key risks or counterpoints
}

export interface AnalysisResults {
  ticker_symbol: string;
  synthesis_score: number; // 0-100
  recommendation: RecommendationType;
  convergence_factors: ConvergenceFactor[];
  divergence_factors: DivergenceFactor[];
  detailed_analysis: {
    fundamental: FundamentalAnalysisOutput;
    technical: TechnicalAnalysisOutput;
    esg: ESGAnalysisOutput;
  };
  confidence: number; // 0-1
  analysis_timestamp: string;
  goal_context: InvestmentGoal;
}

export interface DashboardState {
  currentStep: AnalysisStep;
  tickerSymbol: string;
  analysisId: number | null;
  analysisProgress: AnalysisProgress | null;
  goalSelection: InvestmentGoalType | null;
  tradingTimeframe: TradingTimeframe | null;
  results: AnalysisResult | null;
  error: DashboardError | null;
  loading: boolean;
}

export interface DashboardError {
  type: DashboardErrorType;
  message: string;
  details?: string;
  recoverable: boolean;
  retry_after?: number;
}

export interface APIError {
  code: string;
  message: string;
  details?: string;
  request_id: string;
}

export interface AnalysisRequest {
  ticker_symbol: string;
  analysis_context: InvestmentGoalType;
  trading_timeframe?: TradingTimeframe;
}

export interface AnalysisResponse {
  success: boolean;
  data?: {
    analysis_id: number;
    progress_url: string;
    estimated_completion: string;
  };
  error?: APIError;
}

export interface ProgressResponse {
  analysis_id: number;
  status: 'running' | 'completed' | 'failed';
  progress: AnalysisProgress;
  results?: AnalysisResults;
  error?: APIError;
}

// Chart data interfaces for recharts integration
export interface TechnicalChartData {
  timestamp: string;
  price: number;
  volume: number;
  sma_20: number;
  sma_50: number;
  rsi: number;
  support_level?: number;
  resistance_level?: number;
}

export interface FundamentalChartData {
  metric: string;
  value: number;
  benchmark: number;
  category: 'valuation' | 'growth' | 'profitability' | 'leverage';
}

export interface ESGChartData {
  category: 'environmental' | 'social' | 'governance';
  score: number;
  industry_average: number;
  percentile: number;
}