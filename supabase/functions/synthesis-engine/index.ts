// Enhanced Edge Function for synthesis engine v2
// Combines fundamental, technical, and ESG analysis results with advanced real data processing

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  createRequestHandler,
  parseJsonBody,
  createSuccessHttpResponse,
  createErrorHttpResponse,
  AppError,
  ERROR_CODES,
  getConfig,
  getRecommendation,
  SynthesisInput,
  SynthesisOutput,
  FundamentalAnalysisOutput,
  TechnicalAnalysisOutput,
  ESGAnalysisOutput,
  AnalysisFactor,
  ConvergenceFactor,
  DivergenceFactor,
  AnalysisReport,
  createLogger,
  createRequestMonitor
} from '../_shared/index.ts';

import {
  AnalysisError,
  AnalysisStage,
  AnalysisPipelineMonitor,
  ANALYSIS_ERROR_CODES,
  GracefulDegradationHandler,
  AnalysisPerformanceMonitor
} from '../_shared/analysis-error-handler.ts';

/**
 * Synthesis configuration interface
 */
interface SynthesisConfig {
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
 * Trade parameters input interface
 */
interface TradeParametersInput {
  ticker_symbol: string;
  analysis_context: 'investment' | 'trading';
  trading_timeframe?: string;
  technical_result: TechnicalAnalysisOutput;
  fundamental_result?: FundamentalAnalysisOutput;
  synthesis_score: number;
  current_price: number;
}

/**
 * Trade parameters output interface
 */
interface TradeParametersOutput {
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
 * Factor analysis result interface
 */
interface FactorAnalysis {
  convergenceFactors: ConvergenceFactor[];
  divergenceFactors: DivergenceFactor[];
  totalConvergenceWeight: number;
  totalDivergenceWeight: number;
  netSentiment: number;
}

/**
 * Weighted score calculation result
 */
interface WeightedScores {
  fundamentalWeighted: number;
  technicalWeighted: number;
  esgWeighted: number;
  totalWeight: number;
  rawScore: number;
}

/**
 * Enhanced synthesis engine for combining analysis results with real data processing
 */
class SynthesisEngine {
  private config: SynthesisConfig;

  constructor() {
    const globalConfig = getConfig();
    this.config = {
      investment: globalConfig.analysis.weighting.investment,
      trading: globalConfig.analysis.weighting.trading
    };
  }

  /**
   * Perform fundamental-only synthesis for Phase 1 implementation
   * @param fundamentalResult Fundamental analysis result
   * @param ticker Stock ticker symbol
   * @param analysisContext Investment or trading context
   * @returns Promise<SynthesisOutput> Synthesis results based only on fundamental analysis
   */
  async synthesizeFundamentalOnly(
    fundamentalResult: FundamentalAnalysisOutput,
    ticker: string,
    analysisContext: 'investment' | 'trading'
  ): Promise<SynthesisOutput> {
    try {
      console.log(`Starting fundamental-only synthesis for ${ticker} (${analysisContext})`);

      // Validate fundamental analysis input
      this.validateFundamentalInput(fundamentalResult, ticker, analysisContext);

      // Generate convergence and divergence factors from fundamental analysis
      const factorAnalysis = this.generateFundamentalFactorAnalysis(fundamentalResult, analysisContext);

      // Calculate synthesis score based only on fundamental analysis
      const synthesisScore = this.calculateFundamentalSynthesisScore(
        fundamentalResult,
        factorAnalysis,
        analysisContext
      );

      // Calculate confidence based on fundamental data quality
      const confidence = this.calculateFundamentalConfidence(fundamentalResult, factorAnalysis);

      // Generate simplified analysis report
      const fullReport = this.generateFundamentalAnalysisReport(
        fundamentalResult,
        factorAnalysis,
        synthesisScore,
        confidence,
        ticker,
        analysisContext
      );

      // Generate basic trade parameters (simplified for fundamental-only)
      const tradeParameters = this.generateBasicTradeParameters(
        fundamentalResult,
        synthesisScore,
        ticker,
        analysisContext
      );

      console.log(`Fundamental-only synthesis completed for ${ticker}: Score=${synthesisScore}, Confidence=${confidence.toFixed(2)}`);

      return {
        synthesis_score: synthesisScore,
        convergence_factors: factorAnalysis.convergenceFactors,
        divergence_factors: factorAnalysis.divergenceFactors,
        trade_parameters: tradeParameters,
        full_report: fullReport,
        confidence
      };

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError(
        ERROR_CODES.PROCESSING_ERROR,
        'Failed to synthesize fundamental analysis results',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Perform enhanced comprehensive synthesis of all analysis results with real data processing
   * @param input Synthesis input with all analysis results
   * @returns Promise<SynthesisOutput> Combined analysis results
   */
  async synthesize(input: SynthesisInput): Promise<SynthesisOutput> {
    try {
      console.log(`Starting enhanced synthesis for ${input.ticker_symbol} (${input.analysis_context})`);

      // Validate input data with enhanced checks
      this.validateInput(input);

      // Calculate context-aware weighted scores
      const weightedScores = this.calculateEnhancedWeightedScores(input);

      // Perform advanced factor analysis for convergence and divergence
      const factorAnalysis = this.performAdvancedFactorAnalysis(input);

      // Calculate final synthesis score with real data considerations
      const synthesisScore = this.calculateEnhancedSynthesisScore(
        weightedScores,
        factorAnalysis,
        input.analysis_context,
        input.trading_timeframe
      );

      // Calculate enhanced overall confidence with real data quality assessment
      const confidence = this.calculateEnhancedOverallConfidence(input, factorAnalysis);

      // Calculate trade parameters based on technical analysis and synthesis score
      const currentPrice = this.extractCurrentPrice(input.technical_result);
      const tradeParametersInput: TradeParametersInput = {
        ticker_symbol: input.ticker_symbol,
        analysis_context: input.analysis_context,
        trading_timeframe: input.trading_timeframe,
        technical_result: input.technical_result,
        fundamental_result: input.fundamental_result,
        synthesis_score: synthesisScore,
        current_price: currentPrice
      };
      const tradeParameters = await this.calculateTradeParameters(tradeParametersInput);

      // Generate comprehensive analysis report with real data insights
      const fullReport = this.generateEnhancedAnalysisReport(
        input,
        weightedScores,
        factorAnalysis,
        synthesisScore,
        confidence
      );

      console.log(`Synthesis completed for ${input.ticker_symbol}: Score=${synthesisScore}, Confidence=${confidence.toFixed(2)}`);

      return {
        synthesis_score: synthesisScore,
        convergence_factors: factorAnalysis.convergenceFactors,
        divergence_factors: factorAnalysis.divergenceFactors,
        trade_parameters: tradeParameters,
        full_report: fullReport,
        confidence
      };

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError(
        ERROR_CODES.PROCESSING_ERROR,
        'Failed to synthesize analysis results',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Validate synthesis input data
   */
  private validateInput(input: SynthesisInput): void {
    if (!input.ticker_symbol || typeof input.ticker_symbol !== 'string') {
      throw new AppError(ERROR_CODES.INVALID_PARAMETER, 'Invalid ticker symbol');
    }

    if (!['investment', 'trading'].includes(input.analysis_context)) {
      throw new AppError(ERROR_CODES.INVALID_PARAMETER, 'Invalid analysis context');
    }

    if (!input.fundamental_result || typeof input.fundamental_result.score !== 'number') {
      throw new AppError(ERROR_CODES.INVALID_PARAMETER, 'Invalid fundamental analysis result');
    }

    if (!input.technical_result || typeof input.technical_result.score !== 'number') {
      throw new AppError(ERROR_CODES.INVALID_PARAMETER, 'Invalid technical analysis result');
    }

    if (!input.esg_result || typeof input.esg_result.score !== 'number') {
      throw new AppError(ERROR_CODES.INVALID_PARAMETER, 'Invalid ESG analysis result');
    }

    // Validate score ranges
    const scores = [
      input.fundamental_result.score,
      input.technical_result.score,
      input.esg_result.score
    ];

    for (const score of scores) {
      if (score < 0 || score > 100) {
        throw new AppError(ERROR_CODES.INVALID_PARAMETER, 'Analysis scores must be between 0 and 100');
      }
    }
  }

  /**
   * Calculate enhanced weighted scores with real data quality considerations
   */
  private calculateEnhancedWeightedScores(input: SynthesisInput): WeightedScores {
    const baseWeights = this.config[input.analysis_context];
    
    // Apply timeframe adjustments for trading context
    let adjustedWeights = { ...baseWeights };
    
    if (input.analysis_context === 'trading' && input.trading_timeframe) {
      adjustedWeights = this.adjustWeightsForTimeframe(baseWeights, input.trading_timeframe);
    }

    // Apply confidence-based weight adjustments (real data quality consideration)
    const confidenceAdjustedWeights = this.adjustWeightsForConfidence(adjustedWeights, input);

    // Apply score distribution adjustments (prevent extreme outliers from dominating)
    const finalWeights = this.adjustWeightsForScoreDistribution(confidenceAdjustedWeights, input);

    const fundamentalWeighted = input.fundamental_result.score * finalWeights.fundamental;
    const technicalWeighted = input.technical_result.score * finalWeights.technical;
    const esgWeighted = input.esg_result.score * finalWeights.esg;
    
    const totalWeight = finalWeights.fundamental + finalWeights.technical + finalWeights.esg;
    const rawScore = (fundamentalWeighted + technicalWeighted + esgWeighted) / totalWeight;

    console.log(`Enhanced weighting for ${input.ticker_symbol}: F=${finalWeights.fundamental.toFixed(2)}, T=${finalWeights.technical.toFixed(2)}, E=${finalWeights.esg.toFixed(2)}`);

    return {
      fundamentalWeighted,
      technicalWeighted,
      esgWeighted,
      totalWeight,
      rawScore
    };
  }

  /**
   * Adjust weights based on confidence levels of individual analyses
   */
  private adjustWeightsForConfidence(
    weights: { fundamental: number; technical: number; esg: number },
    input: SynthesisInput
  ): { fundamental: number; technical: number; esg: number } {
    const confidences = {
      fundamental: input.fundamental_result.confidence || 0.8,
      technical: input.technical_result.confidence || 0.8,
      esg: input.esg_result.confidence || 0.8
    };

    // Boost weights for high-confidence analyses, reduce for low-confidence
    const adjustedWeights = {
      fundamental: weights.fundamental * (0.5 + confidences.fundamental * 0.5),
      technical: weights.technical * (0.5 + confidences.technical * 0.5),
      esg: weights.esg * (0.5 + confidences.esg * 0.5)
    };

    // Normalize to maintain total weight
    const totalWeight = adjustedWeights.fundamental + adjustedWeights.technical + adjustedWeights.esg;
    
    return {
      fundamental: adjustedWeights.fundamental / totalWeight,
      technical: adjustedWeights.technical / totalWeight,
      esg: adjustedWeights.esg / totalWeight
    };
  }

  /**
   * Adjust weights based on score distribution to prevent extreme outliers
   */
  private adjustWeightsForScoreDistribution(
    weights: { fundamental: number; technical: number; esg: number },
    input: SynthesisInput
  ): { fundamental: number; technical: number; esg: number } {
    const scores = [
      input.fundamental_result.score,
      input.technical_result.score,
      input.esg_result.score
    ];

    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const standardDeviation = Math.sqrt(variance);

    // If there's high variance (one analysis is very different), reduce its influence
    if (standardDeviation > 25) {
      const adjustedWeights = { ...weights };
      
      // Find the outlier and reduce its weight
      scores.forEach((score, index) => {
        const deviation = Math.abs(score - mean);
        if (deviation > standardDeviation * 1.5) {
          const reductionFactor = 0.7; // Reduce outlier weight by 30%
          switch (index) {
            case 0:
              adjustedWeights.fundamental *= reductionFactor;
              break;
            case 1:
              adjustedWeights.technical *= reductionFactor;
              break;
            case 2:
              adjustedWeights.esg *= reductionFactor;
              break;
          }
        }
      });

      // Normalize weights
      const totalWeight = adjustedWeights.fundamental + adjustedWeights.technical + adjustedWeights.esg;
      
      return {
        fundamental: adjustedWeights.fundamental / totalWeight,
        technical: adjustedWeights.technical / totalWeight,
        esg: adjustedWeights.esg / totalWeight
      };
    }

    return weights;
  }

  /**
   * Adjust weights based on trading timeframe
   */
  private adjustWeightsForTimeframe(
    baseWeights: { fundamental: number; technical: number; esg: number },
    timeframe: string
  ): { fundamental: number; technical: number; esg: number } {
    const adjustments: Record<string, { technical: number; fundamental: number; esg: number }> = {
      '1D': { technical: 1.3, fundamental: 0.7, esg: 0.5 },
      '1W': { technical: 1.2, fundamental: 0.8, esg: 0.6 },
      '1M': { technical: 1.1, fundamental: 0.9, esg: 0.8 },
      '3M': { technical: 1.0, fundamental: 1.0, esg: 0.9 },
      '6M': { technical: 0.9, fundamental: 1.1, esg: 1.0 },
      '1Y': { technical: 0.8, fundamental: 1.2, esg: 1.1 }
    };

    const adjustment = adjustments[timeframe] || { technical: 1.0, fundamental: 1.0, esg: 1.0 };
    
    const adjustedWeights = {
      fundamental: baseWeights.fundamental * adjustment.fundamental,
      technical: baseWeights.technical * adjustment.technical,
      esg: baseWeights.esg * adjustment.esg
    };

    // Normalize weights to sum to 1
    const totalWeight = adjustedWeights.fundamental + adjustedWeights.technical + adjustedWeights.esg;
    
    return {
      fundamental: adjustedWeights.fundamental / totalWeight,
      technical: adjustedWeights.technical / totalWeight,
      esg: adjustedWeights.esg / totalWeight
    };
  }

  /**
   * Perform advanced factor analysis for convergence and divergence with real data processing
   */
  private performAdvancedFactorAnalysis(input: SynthesisInput): FactorAnalysis {
    const allFactors = [
      ...input.fundamental_result.factors,
      ...input.technical_result.factors,
      ...input.esg_result.factors
    ];

    console.log(`Analyzing ${allFactors.length} factors for ${input.ticker_symbol}`);

    const convergenceFactors: ConvergenceFactor[] = [];
    const divergenceFactors: DivergenceFactor[] = [];

    // Group factors by sentiment and category with enhanced analysis
    const positiveFactors = allFactors.filter(f => f.type === 'positive');
    const negativeFactors = allFactors.filter(f => f.type === 'negative');

    // Enhanced convergence identification with real data patterns
    const convergenceGroups = this.identifyEnhancedConvergence(positiveFactors, negativeFactors, input);
    convergenceFactors.push(...convergenceGroups);

    // Enhanced divergence identification with conflict resolution
    const divergenceGroups = this.identifyEnhancedDivergence(input);
    divergenceFactors.push(...divergenceGroups);

    // Advanced pattern recognition for cross-analysis themes
    const crossAnalysisPatterns = this.identifyCrossAnalysisPatterns(input);
    convergenceFactors.push(...crossAnalysisPatterns.convergence);
    divergenceFactors.push(...crossAnalysisPatterns.divergence);

    // Calculate enhanced weights with confidence considerations
    const totalConvergenceWeight = convergenceFactors.reduce((sum, f) => sum + (f.weight * (f.metadata?.confidence || 1)), 0);
    const totalDivergenceWeight = divergenceFactors.reduce((sum, f) => sum + (f.weight * (f.metadata?.confidence || 1)), 0);
    
    // Calculate net sentiment with momentum consideration
    const netSentiment = this.calculateNetSentimentWithMomentum(
      totalConvergenceWeight, 
      totalDivergenceWeight, 
      input
    );

    console.log(`Factor analysis for ${input.ticker_symbol}: ${convergenceFactors.length} convergence, ${divergenceFactors.length} divergence factors`);

    return {
      convergenceFactors,
      divergenceFactors,
      totalConvergenceWeight,
      totalDivergenceWeight,
      netSentiment
    };
  }

  /**
   * Calculate net sentiment with momentum consideration
   */
  private calculateNetSentimentWithMomentum(
    convergenceWeight: number,
    divergenceWeight: number,
    input: SynthesisInput
  ): number {
    const baseSentiment = convergenceWeight - divergenceWeight;
    
    // Apply momentum based on score trends and context
    let momentumMultiplier = 1.0;
    
    if (input.analysis_context === 'trading') {
      // For trading, recent momentum matters more
      const scores = [
        input.fundamental_result.score,
        input.technical_result.score,
        input.esg_result.score
      ];
      
      const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      
      // If scores are consistently high or low, amplify sentiment
      if (avgScore > 70) {
        momentumMultiplier = 1.2;
      } else if (avgScore < 30) {
        momentumMultiplier = 1.2;
      }
    }
    
    return baseSentiment * momentumMultiplier;
  }

  /**
   * Identify cross-analysis patterns and themes
   */
  private identifyCrossAnalysisPatterns(input: SynthesisInput): {
    convergence: ConvergenceFactor[];
    divergence: DivergenceFactor[];
  } {
    const convergence: ConvergenceFactor[] = [];
    const divergence: DivergenceFactor[] = [];

    // Analyze score momentum patterns
    const scores = [
      input.fundamental_result.score,
      input.technical_result.score,
      input.esg_result.score
    ];

    const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const scoreVariance = scores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / scores.length;

    // Strong alignment pattern
    if (scoreVariance < 100 && avgScore > 60) {
      convergence.push({
        category: 'alignment',
        description: `Strong cross-analysis alignment with consistent positive signals (avg: ${avgScore.toFixed(1)})`,
        weight: 0.8,
        supporting_analyses: ['fundamental', 'technical', 'esg'],
        metadata: {
          pattern_type: 'strong_alignment',
          average_score: avgScore,
          variance: scoreVariance,
          confidence: 0.9
        }
      });
    } else if (scoreVariance < 100 && avgScore < 40) {
      convergence.push({
        category: 'alignment',
        description: `Consistent negative signals across all analyses (avg: ${avgScore.toFixed(1)})`,
        weight: 0.8,
        supporting_analyses: ['fundamental', 'technical', 'esg'],
        metadata: {
          pattern_type: 'negative_alignment',
          average_score: avgScore,
          variance: scoreVariance,
          confidence: 0.9
        }
      });
    }

    // High variance pattern (conflicting signals)
    if (scoreVariance > 400) {
      const maxScore = Math.max(...scores);
      const minScore = Math.min(...scores);
      
      divergence.push({
        category: 'conflict',
        description: `High variance in analysis results suggests conflicting market signals (range: ${minScore.toFixed(1)}-${maxScore.toFixed(1)})`,
        weight: 0.7,
        conflicting_analyses: ['fundamental', 'technical', 'esg'],
        metadata: {
          pattern_type: 'high_variance',
          score_range: maxScore - minScore,
          variance: scoreVariance,
          confidence: 0.8
        }
      });
    }

    return { convergence, divergence };
  }

  /**
   * Enhanced convergence identification with real data pattern recognition
   */
  private identifyEnhancedConvergence(
    positiveFactors: AnalysisFactor[],
    negativeFactors: AnalysisFactor[],
    input: SynthesisInput
  ): ConvergenceFactor[] {
    const convergenceFactors: ConvergenceFactor[] = [];

    // Check for strong positive convergence with confidence weighting
    const strongPositive = this.checkEnhancedStrongPositiveConvergence(input);
    if (strongPositive) {
      convergenceFactors.push(strongPositive);
    }

    // Check for strong negative convergence with confidence weighting
    const strongNegative = this.checkEnhancedStrongNegativeConvergence(input);
    if (strongNegative) {
      convergenceFactors.push(strongNegative);
    }

    // Enhanced thematic convergence with semantic analysis
    const thematicConvergence = this.identifyEnhancedThematicConvergence(positiveFactors, negativeFactors);
    convergenceFactors.push(...thematicConvergence);

    // Enhanced score alignment with statistical significance
    const scoreAlignment = this.checkEnhancedScoreAlignment(input);
    if (scoreAlignment) {
      convergenceFactors.push(scoreAlignment);
    }

    // Context-specific convergence patterns
    const contextSpecific = this.identifyContextSpecificConvergence(input);
    convergenceFactors.push(...contextSpecific);

    return convergenceFactors;
  }

  /**
   * Enhanced strong positive convergence check with confidence weighting
   */
  private checkEnhancedStrongPositiveConvergence(input: SynthesisInput): ConvergenceFactor | null {
    const scores = [
      input.fundamental_result.score,
      input.technical_result.score,
      input.esg_result.score
    ];

    const confidences = [
      input.fundamental_result.confidence || 0.8,
      input.technical_result.confidence || 0.8,
      input.esg_result.confidence || 0.8
    ];

    const threshold = input.analysis_context === 'trading' ? 65 : 70;
    const allStrong = scores.every(score => score >= threshold);
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const averageConfidence = confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;

    if (allStrong && averageScore >= threshold + 5) {
      return {
        category: 'convergence',
        description: `Strong positive signals across all analyses (avg: ${averageScore.toFixed(1)}, confidence: ${(averageConfidence * 100).toFixed(0)}%)`,
        weight: 0.9 * averageConfidence,
        supporting_analyses: ['fundamental', 'technical', 'esg'],
        metadata: {
          fundamental_score: input.fundamental_result.score,
          technical_score: input.technical_result.score,
          esg_score: input.esg_result.score,
          average_score: averageScore,
          average_confidence: averageConfidence,
          confidence: averageConfidence
        }
      };
    }

    return null;
  }

  /**
   * Enhanced strong negative convergence check with confidence weighting
   */
  private checkEnhancedStrongNegativeConvergence(input: SynthesisInput): ConvergenceFactor | null {
    const scores = [
      input.fundamental_result.score,
      input.technical_result.score,
      input.esg_result.score
    ];

    const confidences = [
      input.fundamental_result.confidence || 0.8,
      input.technical_result.confidence || 0.8,
      input.esg_result.confidence || 0.8
    ];

    const threshold = input.analysis_context === 'trading' ? 35 : 40;
    const allWeak = scores.every(score => score <= threshold);
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const averageConfidence = confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;

    if (allWeak && averageScore <= threshold - 5) {
      return {
        category: 'convergence',
        description: `Consistent negative signals across all analyses (avg: ${averageScore.toFixed(1)}, confidence: ${(averageConfidence * 100).toFixed(0)}%)`,
        weight: 0.8 * averageConfidence,
        supporting_analyses: ['fundamental', 'technical', 'esg'],
        metadata: {
          fundamental_score: input.fundamental_result.score,
          technical_score: input.technical_result.score,
          esg_score: input.esg_result.score,
          average_score: averageScore,
          average_confidence: averageConfidence,
          confidence: averageConfidence
        }
      };
    }

    return null;
  }

  /**
   * Identify context-specific convergence patterns
   */
  private identifyContextSpecificConvergence(input: SynthesisInput): ConvergenceFactor[] {
    const convergenceFactors: ConvergenceFactor[] = [];

    if (input.analysis_context === 'trading') {
      // For trading, look for momentum alignment
      const technicalScore = input.technical_result.score;
      const sentimentScore = input.esg_result.score; // Using ESG as sentiment proxy
      
      if (Math.abs(technicalScore - sentimentScore) < 15 && technicalScore > 60) {
        convergenceFactors.push({
          category: 'momentum',
          description: `Technical and sentiment analysis align for positive trading momentum`,
          weight: 0.7,
          supporting_analyses: ['technical', 'esg'],
          metadata: {
            technical_score: technicalScore,
            sentiment_score: sentimentScore,
            alignment_strength: 15 - Math.abs(technicalScore - sentimentScore),
            confidence: 0.8
          }
        });
      }
    } else {
      // For investment, look for fundamental-ESG alignment
      const fundamentalScore = input.fundamental_result.score;
      const esgScore = input.esg_result.score;
      
      if (Math.abs(fundamentalScore - esgScore) < 20 && fundamentalScore > 55) {
        convergenceFactors.push({
          category: 'sustainability',
          description: `Fundamental strength aligns with ESG quality for sustainable investment`,
          weight: 0.6,
          supporting_analyses: ['fundamental', 'esg'],
          metadata: {
            fundamental_score: fundamentalScore,
            esg_score: esgScore,
            alignment_strength: 20 - Math.abs(fundamentalScore - esgScore),
            confidence: 0.7
          }
        });
      }
    }

    return convergenceFactors;
  }

  /**
   * Enhanced thematic convergence identification with semantic analysis
   */
  private identifyEnhancedThematicConvergence(
    positiveFactors: AnalysisFactor[],
    negativeFactors: AnalysisFactor[]
  ): ConvergenceFactor[] {
    const convergenceFactors: ConvergenceFactor[] = [];

    // Group factors by theme/topic with enhanced semantic analysis
    const themes = this.groupEnhancedFactorsByTheme(positiveFactors, negativeFactors);

    for (const [theme, factors] of Object.entries(themes)) {
      if (factors.length >= 2) {
        const categories = [...new Set(factors.map(f => f.category))];
        const avgWeight = factors.reduce((sum, f) => sum + f.weight, 0) / factors.length;
        const avgConfidence = factors.reduce((sum, f) => sum + (f.confidence || 0.8), 0) / factors.length;

        if (categories.length >= 2) { // Cross-category agreement
          const isPositive = factors.every(f => f.type === 'positive');
          const isNegative = factors.every(f => f.type === 'negative');

          if (isPositive || isNegative) {
            convergenceFactors.push({
              category: 'thematic',
              description: `${isPositive ? 'Positive' : 'Negative'} convergence on ${theme} across multiple analyses`,
              weight: Math.min(0.8, avgWeight * avgConfidence),
              supporting_analyses: categories,
              metadata: {
                theme,
                factor_count: factors.length,
                average_weight: avgWeight,
                average_confidence: avgConfidence,
                confidence: avgConfidence
              }
            });
          }
        }
      }
    }

    return convergenceFactors;
  }

  /**
   * Enhanced factor grouping by theme with improved semantic analysis
   */
  private groupEnhancedFactorsByTheme(
    positiveFactors: AnalysisFactor[],
    negativeFactors: AnalysisFactor[]
  ): Record<string, AnalysisFactor[]> {
    const themes: Record<string, AnalysisFactor[]> = {};
    const allFactors = [...positiveFactors, ...negativeFactors];

    // Enhanced theme keywords with more comprehensive coverage
    const themeKeywords: Record<string, string[]> = {
      'growth': ['growth', 'revenue', 'earnings', 'expansion', 'increase', 'rising', 'accelerating'],
      'profitability': ['profit', 'margin', 'roe', 'roa', 'return', 'earnings', 'income', 'profitable'],
      'valuation': ['valuation', 'pe', 'pb', 'price', 'expensive', 'cheap', 'overvalued', 'undervalued', 'fair value'],
      'momentum': ['momentum', 'trend', 'moving average', 'macd', 'rsi', 'breakout', 'uptrend', 'downtrend'],
      'sustainability': ['esg', 'environmental', 'social', 'governance', 'sustainability', 'green', 'carbon'],
      'risk': ['risk', 'debt', 'leverage', 'volatility', 'controversy', 'uncertainty', 'exposure'],
      'quality': ['quality', 'management', 'governance', 'transparency', 'leadership', 'execution'],
      'market_sentiment': ['sentiment', 'market', 'investor', 'confidence', 'optimism', 'pessimism', 'outlook'],
      'competitive_position': ['competitive', 'market share', 'advantage', 'moat', 'differentiation', 'leadership']
    };

    for (const factor of allFactors) {
      const description = factor.description.toLowerCase();
      let assigned = false;
      
      for (const [theme, keywords] of Object.entries(themeKeywords)) {
        if (keywords.some(keyword => description.includes(keyword))) {
          if (!themes[theme]) {
            themes[theme] = [];
          }
          themes[theme].push(factor);
          assigned = true;
          break; // Assign to first matching theme only
        }
      }

      // If no theme matched, create a generic theme
      if (!assigned) {
        const genericTheme = 'other';
        if (!themes[genericTheme]) {
          themes[genericTheme] = [];
        }
        themes[genericTheme].push(factor);
      }
    }

    return themes;
  }

  /**
   * Enhanced score alignment check with statistical significance
   */
  private checkEnhancedScoreAlignment(input: SynthesisInput): ConvergenceFactor | null {
    const scores = [
      input.fundamental_result.score,
      input.technical_result.score,
      input.esg_result.score
    ];

    const confidences = [
      input.fundamental_result.confidence || 0.8,
      input.technical_result.confidence || 0.8,
      input.esg_result.confidence || 0.8
    ];

    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const standardDeviation = Math.sqrt(variance);
    const avgConfidence = confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;

    // Enhanced alignment detection with confidence weighting
    const alignmentThreshold = input.analysis_context === 'trading' ? 12 : 15;
    
    if (standardDeviation <= alignmentThreshold && mean >= 45) {
      const alignmentStrength = alignmentThreshold - standardDeviation;
      const weight = Math.min(0.7, (alignmentStrength / alignmentThreshold) * avgConfidence);

      return {
        category: 'alignment',
        description: `Strong score alignment across analyses (σ: ${standardDeviation.toFixed(1)}, avg: ${mean.toFixed(1)})`,
        weight,
        supporting_analyses: ['fundamental', 'technical', 'esg'],
        metadata: {
          mean_score: mean,
          standard_deviation: standardDeviation,
          scores: scores,
          alignment_strength: alignmentStrength,
          average_confidence: avgConfidence,
          confidence: avgConfidence
        }
      };
    }

    return null;
  }

  /**
   * Check for strong positive convergence across all analyses
   */
  private checkStrongPositiveConvergence(input: SynthesisInput): ConvergenceFactor | null {
    const scores = [
      input.fundamental_result.score,
      input.technical_result.score,
      input.esg_result.score
    ];

    const allStrong = scores.every(score => score >= 70);
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

    if (allStrong && averageScore >= 75) {
      return {
        category: 'convergence',
        description: `Strong positive signals across all analyses (avg: ${averageScore.toFixed(1)})`,
        weight: 0.9,
        supporting_analyses: ['fundamental', 'technical', 'esg'],
        metadata: {
          fundamental_score: input.fundamental_result.score,
          technical_score: input.technical_result.score,
          esg_score: input.esg_result.score,
          average_score: averageScore
        }
      };
    }

    return null;
  }

  /**
   * Check for strong negative convergence across all analyses
   */
  private checkStrongNegativeConvergence(input: SynthesisInput): ConvergenceFactor | null {
    const scores = [
      input.fundamental_result.score,
      input.technical_result.score,
      input.esg_result.score
    ];

    const allWeak = scores.every(score => score <= 40);
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

    if (allWeak && averageScore <= 35) {
      return {
        category: 'convergence',
        description: `Consistent negative signals across all analyses (avg: ${averageScore.toFixed(1)})`,
        weight: 0.8,
        supporting_analyses: ['fundamental', 'technical', 'esg'],
        metadata: {
          fundamental_score: input.fundamental_result.score,
          technical_score: input.technical_result.score,
          esg_score: input.esg_result.score,
          average_score: averageScore
        }
      };
    }

    return null;
  }

  /**
   * Identify thematic convergence between different analysis types
   */
  private identifyThematicConvergence(
    positiveFactors: AnalysisFactor[],
    negativeFactors: AnalysisFactor[]
  ): ConvergenceFactor[] {
    const convergenceFactors: ConvergenceFactor[] = [];

    // Group factors by theme/topic
    const themes = this.groupFactorsByTheme(positiveFactors, negativeFactors);

    for (const [theme, factors] of Object.entries(themes)) {
      if (factors.length >= 2) {
        const categories = [...new Set(factors.map(f => f.category))];
        const avgWeight = factors.reduce((sum, f) => sum + f.weight, 0) / factors.length;
        const avgConfidence = factors.reduce((sum, f) => sum + f.confidence, 0) / factors.length;

        if (categories.length >= 2) { // Cross-category agreement
          const isPositive = factors.every(f => f.type === 'positive');
          const isNegative = factors.every(f => f.type === 'negative');

          if (isPositive || isNegative) {
            convergenceFactors.push({
              category: 'thematic',
              description: `${isPositive ? 'Positive' : 'Negative'} convergence on ${theme}`,
              weight: Math.min(0.8, avgWeight * avgConfidence),
              supporting_analyses: categories,
              metadata: {
                theme,
                factor_count: factors.length,
                average_weight: avgWeight,
                average_confidence: avgConfidence
              }
            });
          }
        }
      }
    }

    return convergenceFactors;
  }

  /**
   * Check for score alignment between analyses
   */
  private checkScoreAlignment(input: SynthesisInput): ConvergenceFactor | null {
    const scores = [
      input.fundamental_result.score,
      input.technical_result.score,
      input.esg_result.score
    ];

    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const standardDeviation = Math.sqrt(variance);

    // Low standard deviation indicates alignment
    if (standardDeviation <= 10 && mean >= 50) {
      return {
        category: 'alignment',
        description: `Strong score alignment across analyses (σ: ${standardDeviation.toFixed(1)})`,
        weight: 0.6,
        supporting_analyses: ['fundamental', 'technical', 'esg'],
        metadata: {
          mean_score: mean,
          standard_deviation: standardDeviation,
          scores: scores
        }
      };
    }

    return null;
  }

  /**
   * Enhanced divergence identification with advanced conflict analysis
   */
  private identifyEnhancedDivergence(input: SynthesisInput): DivergenceFactor[] {
    const divergenceFactors: DivergenceFactor[] = [];

    // Enhanced score divergence analysis
    const scoreDivergence = this.checkEnhancedScoreDivergence(input);
    if (scoreDivergence) {
      divergenceFactors.push(scoreDivergence);
    }

    // Enhanced conflicting signals detection
    const conflictingSignals = this.identifyEnhancedConflictingSignals(input);
    divergenceFactors.push(...conflictingSignals);

    // Enhanced confidence conflicts
    const confidenceConflicts = this.checkEnhancedConfidenceConflicts(input);
    if (confidenceConflicts) {
      divergenceFactors.push(confidenceConflicts);
    }

    // Context-specific divergence patterns
    const contextSpecific = this.identifyContextSpecificDivergence(input);
    divergenceFactors.push(...contextSpecific);

    return divergenceFactors;
  }

  /**
   * Enhanced score divergence check with statistical analysis
   */
  private checkEnhancedScoreDivergence(input: SynthesisInput): DivergenceFactor | null {
    const scores = [
      input.fundamental_result.score,
      input.technical_result.score,
      input.esg_result.score
    ];

    const analysisNames = ['fundamental', 'technical', 'esg'];
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    const range = max - min;
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;

    // Enhanced threshold based on context
    const threshold = input.analysis_context === 'trading' ? 25 : 30;

    if (range >= threshold) {
      const maxIndex = scores.indexOf(max);
      const minIndex = scores.indexOf(min);
      const maxAnalysis = analysisNames[maxIndex];
      const minAnalysis = analysisNames[minIndex];

      // Calculate statistical significance
      const standardDeviation = Math.sqrt(
        scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length
      );

      return {
        category: 'score_divergence',
        description: `Significant score divergence: ${maxAnalysis} (${max}) vs ${minAnalysis} (${min}) - ${range} point spread`,
        weight: Math.min(0.9, range / 100),
        conflicting_analyses: [maxAnalysis, minAnalysis],
        metadata: {
          score_range: range,
          max_score: max,
          min_score: min,
          max_analysis: maxAnalysis,
          min_analysis: minAnalysis,
          standard_deviation: standardDeviation,
          statistical_significance: range / standardDeviation,
          confidence: Math.min(0.9, range / 50)
        }
      };
    }

    return null;
  }

  /**
   * Enhanced conflicting signals identification
   */
  private identifyEnhancedConflictingSignals(input: SynthesisInput): DivergenceFactor[] {
    const divergenceFactors: DivergenceFactor[] = [];

    // Enhanced fundamental vs technical conflicts
    const fundTechConflict = this.checkEnhancedFundamentalTechnicalConflict(input);
    if (fundTechConflict) {
      divergenceFactors.push(fundTechConflict);
    }

    // Enhanced time horizon conflicts
    const timeHorizonConflict = this.checkEnhancedTimeHorizonConflict(input);
    if (timeHorizonConflict) {
      divergenceFactors.push(timeHorizonConflict);
    }

    // Quality vs momentum conflicts
    const qualityMomentumConflict = this.checkQualityMomentumConflict(input);
    if (qualityMomentumConflict) {
      divergenceFactors.push(qualityMomentumConflict);
    }

    return divergenceFactors;
  }

  /**
   * Enhanced fundamental vs technical conflict analysis
   */
  private checkEnhancedFundamentalTechnicalConflict(input: SynthesisInput): DivergenceFactor | null {
    const fundScore = input.fundamental_result.score;
    const techScore = input.technical_result.score;
    const scoreDiff = Math.abs(fundScore - techScore);

    const threshold = input.analysis_context === 'trading' ? 20 : 25;

    if (scoreDiff >= threshold) {
      const stronger = fundScore > techScore ? 'fundamental' : 'technical';
      const weaker = fundScore > techScore ? 'technical' : 'fundamental';
      const strongerScore = Math.max(fundScore, techScore);
      const weakerScore = Math.min(fundScore, techScore);

      // Determine conflict severity
      let conflictType = 'moderate';
      if (scoreDiff > 40) conflictType = 'severe';
      else if (scoreDiff > 30) conflictType = 'significant';

      return {
        category: 'analysis_conflict',
        description: `${conflictType} ${stronger}-${weaker} conflict: ${stronger} (${strongerScore}) vs ${weaker} (${weakerScore})`,
        weight: Math.min(0.8, scoreDiff / 100),
        conflicting_analyses: ['fundamental', 'technical'],
        metadata: {
          fundamental_score: fundScore,
          technical_score: techScore,
          score_difference: scoreDiff,
          stronger_analysis: stronger,
          conflict_severity: conflictType,
          confidence: Math.min(0.9, scoreDiff / 30)
        }
      };
    }

    return null;
  }

  /**
   * Enhanced time horizon conflict check
   */
  private checkEnhancedTimeHorizonConflict(input: SynthesisInput): DivergenceFactor | null {
    if (input.analysis_context === 'trading' && input.trading_timeframe) {
      const techScore = input.technical_result.score;
      const fundScore = input.fundamental_result.score;
      const esgScore = input.esg_result.score;

      // For very short timeframes, technical should dominate
      if (['1D', '1W'].includes(input.trading_timeframe)) {
        const longTermAvg = (fundScore + esgScore) / 2;
        const conflict = Math.abs(techScore - longTermAvg);

        if (conflict >= 25 && longTermAvg > techScore + 10) {
          return {
            category: 'time_horizon_conflict',
            description: `Short-term technical weakness (${techScore}) conflicts with stronger long-term outlook (${longTermAvg.toFixed(1)})`,
            weight: 0.7,
            conflicting_analyses: ['technical', 'fundamental', 'esg'],
            metadata: {
              timeframe: input.trading_timeframe,
              technical_score: techScore,
              long_term_average: longTermAvg,
              conflict_magnitude: conflict,
              confidence: 0.8
            }
          };
        }
      }
    }

    return null;
  }

  /**
   * Check for quality vs momentum conflicts
   */
  private checkQualityMomentumConflict(input: SynthesisInput): DivergenceFactor | null {
    const fundamentalScore = input.fundamental_result.score; // Quality proxy
    const technicalScore = input.technical_result.score; // Momentum proxy

    // Look for high quality but poor momentum (or vice versa)
    if (fundamentalScore > 70 && technicalScore < 40) {
      return {
        category: 'quality_momentum_conflict',
        description: `High fundamental quality (${fundamentalScore}) conflicts with poor technical momentum (${technicalScore})`,
        weight: 0.6,
        conflicting_analyses: ['fundamental', 'technical'],
        metadata: {
          quality_score: fundamentalScore,
          momentum_score: technicalScore,
          conflict_type: 'quality_over_momentum',
          confidence: 0.7
        }
      };
    } else if (fundamentalScore < 40 && technicalScore > 70) {
      return {
        category: 'quality_momentum_conflict',
        description: `Strong technical momentum (${technicalScore}) conflicts with weak fundamentals (${fundamentalScore})`,
        weight: 0.6,
        conflicting_analyses: ['fundamental', 'technical'],
        metadata: {
          quality_score: fundamentalScore,
          momentum_score: technicalScore,
          conflict_type: 'momentum_over_quality',
          confidence: 0.7
        }
      };
    }

    return null;
  }

  /**
   * Enhanced confidence conflicts check
   */
  private checkEnhancedConfidenceConflicts(input: SynthesisInput): DivergenceFactor | null {
    const confidences = [
      input.fundamental_result.confidence || 0.8,
      input.technical_result.confidence || 0.8,
      input.esg_result.confidence || 0.8
    ];

    const maxConfidence = Math.max(...confidences);
    const minConfidence = Math.min(...confidences);
    const confidenceRange = maxConfidence - minConfidence;

    if (confidenceRange >= 0.3) {
      const analysisNames = ['fundamental', 'technical', 'esg'];
      const maxIndex = confidences.indexOf(maxConfidence);
      const minIndex = confidences.indexOf(minConfidence);

      return {
        category: 'confidence_conflict',
        description: `Significant confidence variation: ${analysisNames[maxIndex]} (${(maxConfidence * 100).toFixed(0)}%) vs ${analysisNames[minIndex]} (${(minConfidence * 100).toFixed(0)}%)`,
        weight: 0.5,
        conflicting_analyses: ['fundamental', 'technical', 'esg'],
        metadata: {
          confidence_range: confidenceRange,
          max_confidence: maxConfidence,
          min_confidence: minConfidence,
          max_confidence_analysis: analysisNames[maxIndex],
          min_confidence_analysis: analysisNames[minIndex],
          confidences: confidences,
          confidence: 0.8
        }
      };
    }

    return null;
  }

  /**
   * Identify context-specific divergence patterns
   */
  private identifyContextSpecificDivergence(input: SynthesisInput): DivergenceFactor[] {
    const divergenceFactors: DivergenceFactor[] = [];

    if (input.analysis_context === 'trading') {
      // For trading, look for short-term vs long-term conflicts
      const technicalScore = input.technical_result.score;
      const fundamentalScore = input.fundamental_result.score;
      
      if (input.trading_timeframe === '1D' && Math.abs(technicalScore - fundamentalScore) > 30) {
        divergenceFactors.push({
          category: 'timeframe_conflict',
          description: `Day trading signals conflict with underlying fundamentals`,
          weight: 0.5,
          conflicting_analyses: ['technical', 'fundamental'],
          metadata: {
            timeframe: input.trading_timeframe,
            technical_score: technicalScore,
            fundamental_score: fundamentalScore,
            confidence: 0.6
          }
        });
      }
    } else {
      // For investment, look for sustainability conflicts
      const fundamentalScore = input.fundamental_result.score;
      const esgScore = input.esg_result.score;
      
      if (fundamentalScore > 70 && esgScore < 40) {
        divergenceFactors.push({
          category: 'sustainability_conflict',
          description: `Strong financial performance conflicts with poor ESG practices`,
          weight: 0.6,
          conflicting_analyses: ['fundamental', 'esg'],
          metadata: {
            fundamental_score: fundamentalScore,
            esg_score: esgScore,
            conflict_type: 'financial_vs_sustainability',
            confidence: 0.7
          }
        });
      }
    }

    return divergenceFactors;
  }

  /**
   * Check for significant score divergence between analyses
   */
  private checkScoreDivergence(input: SynthesisInput): DivergenceFactor | null {
    const scores = [
      input.fundamental_result.score,
      input.technical_result.score,
      input.esg_result.score
    ];

    const max = Math.max(...scores);
    const min = Math.min(...scores);
    const range = max - min;

    if (range >= 30) {
      const maxAnalysis = scores.indexOf(max) === 0 ? 'fundamental' : 
                         scores.indexOf(max) === 1 ? 'technical' : 'esg';
      const minAnalysis = scores.indexOf(min) === 0 ? 'fundamental' : 
                         scores.indexOf(min) === 1 ? 'technical' : 'esg';

      return {
        category: 'score_divergence',
        description: `Significant score divergence: ${maxAnalysis} (${max}) vs ${minAnalysis} (${min})`,
        weight: Math.min(0.8, range / 100),
        conflicting_analyses: [maxAnalysis, minAnalysis],
        metadata: {
          score_range: range,
          max_score: max,
          min_score: min,
          max_analysis: maxAnalysis,
          min_analysis: minAnalysis
        }
      };
    }

    return null;
  }

  /**
   * Identify conflicting signals between analyses
   */
  private identifyConflictingSignals(input: SynthesisInput): DivergenceFactor[] {
    const divergenceFactors: DivergenceFactor[] = [];

    // Check for fundamental vs technical conflicts
    const fundTechConflict = this.checkFundamentalTechnicalConflict(input);
    if (fundTechConflict) {
      divergenceFactors.push(fundTechConflict);
    }

    // Check for short-term vs long-term conflicts
    const timeHorizonConflict = this.checkTimeHorizonConflict(input);
    if (timeHorizonConflict) {
      divergenceFactors.push(timeHorizonConflict);
    }

    return divergenceFactors;
  }

  /**
   * Check for fundamental vs technical analysis conflicts
   */
  private checkFundamentalTechnicalConflict(input: SynthesisInput): DivergenceFactor | null {
    const fundScore = input.fundamental_result.score;
    const techScore = input.technical_result.score;
    const scoreDiff = Math.abs(fundScore - techScore);

    if (scoreDiff >= 25) {
      const stronger = fundScore > techScore ? 'fundamental' : 'technical';
      const weaker = fundScore > techScore ? 'technical' : 'fundamental';

      return {
        category: 'analysis_conflict',
        description: `${stronger} analysis significantly stronger than ${weaker} (${Math.abs(fundScore - techScore)} point difference)`,
        weight: Math.min(0.7, scoreDiff / 100),
        conflicting_analyses: ['fundamental', 'technical'],
        metadata: {
          fundamental_score: fundScore,
          technical_score: techScore,
          score_difference: scoreDiff,
          stronger_analysis: stronger
        }
      };
    }

    return null;
  }

  /**
   * Check for time horizon conflicts
   */
  private checkTimeHorizonConflict(input: SynthesisInput): DivergenceFactor | null {
    if (input.analysis_context === 'trading' && input.trading_timeframe) {
      const techScore = input.technical_result.score;
      const fundScore = input.fundamental_result.score;
      const esgScore = input.esg_result.score;

      // For very short timeframes, technical should dominate
      if (['1D', '1W'].includes(input.trading_timeframe)) {
        const longTermAvg = (fundScore + esgScore) / 2;
        const conflict = Math.abs(techScore - longTermAvg);

        if (conflict >= 20 && longTermAvg > techScore) {
          return {
            category: 'time_horizon_conflict',
            description: `Short-term technical signals conflict with long-term fundamentals/ESG`,
            weight: 0.6,
            conflicting_analyses: ['technical', 'fundamental', 'esg'],
            metadata: {
              timeframe: input.trading_timeframe,
              technical_score: techScore,
              long_term_average: longTermAvg,
              conflict_magnitude: conflict
            }
          };
        }
      }
    }

    return null;
  }

  /**
   * Check for confidence conflicts between analyses
   */
  private checkConfidenceConflicts(input: SynthesisInput): DivergenceFactor | null {
    const confidences = [
      input.fundamental_result.confidence,
      input.technical_result.confidence,
      input.esg_result.confidence
    ];

    const maxConfidence = Math.max(...confidences);
    const minConfidence = Math.min(...confidences);
    const confidenceRange = maxConfidence - minConfidence;

    if (confidenceRange >= 0.4) {
      return {
        category: 'confidence_conflict',
        description: `Significant confidence variation between analyses (${(confidenceRange * 100).toFixed(0)}% range)`,
        weight: 0.4,
        conflicting_analyses: ['fundamental', 'technical', 'esg'],
        metadata: {
          confidence_range: confidenceRange,
          max_confidence: maxConfidence,
          min_confidence: minConfidence,
          confidences: confidences
        }
      };
    }

    return null;
  }

  /**
   * Group factors by theme for convergence analysis
   */
  private groupFactorsByTheme(
    positiveFactors: AnalysisFactor[],
    negativeFactors: AnalysisFactor[]
  ): Record<string, AnalysisFactor[]> {
    const themes: Record<string, AnalysisFactor[]> = {};
    const allFactors = [...positiveFactors, ...negativeFactors];

    // Define theme keywords
    const themeKeywords: Record<string, string[]> = {
      'growth': ['growth', 'revenue', 'earnings', 'expansion'],
      'profitability': ['profit', 'margin', 'roe', 'roa', 'return'],
      'valuation': ['valuation', 'pe', 'pb', 'price', 'expensive', 'cheap'],
      'momentum': ['momentum', 'trend', 'moving average', 'macd', 'rsi'],
      'sustainability': ['esg', 'environmental', 'social', 'governance', 'sustainability'],
      'risk': ['risk', 'debt', 'leverage', 'volatility', 'controversy'],
      'quality': ['quality', 'management', 'governance', 'transparency']
    };

    for (const factor of allFactors) {
      const description = factor.description.toLowerCase();
      
      for (const [theme, keywords] of Object.entries(themeKeywords)) {
        if (keywords.some(keyword => description.includes(keyword))) {
          if (!themes[theme]) {
            themes[theme] = [];
          }
          themes[theme].push(factor);
          break; // Assign to first matching theme only
        }
      }
    }

    return themes;
  }

  /**
   * Calculate enhanced final synthesis score with real data processing
   */
  private calculateEnhancedSynthesisScore(
    weightedScores: WeightedScores,
    factorAnalysis: FactorAnalysis,
    analysisContext: 'investment' | 'trading',
    tradingTimeframe?: string
  ): number {
    let score = weightedScores.rawScore;

    // Enhanced convergence/divergence adjustments with confidence weighting
    const netSentimentImpact = this.calculateEnhancedSentimentImpact(factorAnalysis);
    score += netSentimentImpact;

    // Apply enhanced context-specific adjustments
    if (analysisContext === 'trading') {
      // For trading, apply enhanced timeframe-specific adjustments
      if (tradingTimeframe) {
        const timeframeAdjustment = this.getEnhancedTimeframeAdjustment(tradingTimeframe, factorAnalysis);
        score *= timeframeAdjustment;
      }
      
      // Apply momentum boost for trading
      const momentumBoost = this.calculateMomentumBoost(factorAnalysis);
      score += momentumBoost;
    } else {
      // For investment, apply stability adjustments
      const stabilityAdjustment = this.calculateStabilityAdjustment(factorAnalysis);
      score += stabilityAdjustment;
    }

    // Apply confidence-based adjustments
    const confidenceAdjustment = this.calculateConfidenceAdjustment(factorAnalysis);
    score *= confidenceAdjustment;

    // Ensure score is within valid range with enhanced bounds checking
    const finalScore = Math.round(Math.max(5, Math.min(95, score))); // Avoid extreme 0 or 100 scores
    
    console.log(`Enhanced synthesis score calculation: base=${weightedScores.rawScore.toFixed(1)}, sentiment=${netSentimentImpact.toFixed(1)}, final=${finalScore}`);
    
    return finalScore;
  }

  /**
   * Calculate enhanced sentiment impact with confidence weighting
   */
  private calculateEnhancedSentimentImpact(factorAnalysis: FactorAnalysis): number {
    // Weight convergence and divergence factors by their confidence
    const weightedConvergence = factorAnalysis.convergenceFactors.reduce((sum, factor) => {
      const confidence = factor.metadata?.confidence || 0.8;
      return sum + (factor.weight * confidence);
    }, 0);

    const weightedDivergence = factorAnalysis.divergenceFactors.reduce((sum, factor) => {
      const confidence = factor.metadata?.confidence || 0.8;
      return sum + (factor.weight * confidence);
    }, 0);

    const netSentiment = weightedConvergence - weightedDivergence;
    
    // Enhanced scaling with diminishing returns
    const scaleFactor = 8; // Increased from 5 for more impact
    const sentimentImpact = netSentiment * scaleFactor;
    
    // Apply diminishing returns for extreme values
    if (Math.abs(sentimentImpact) > 15) {
      const sign = sentimentImpact > 0 ? 1 : -1;
      return sign * (15 + Math.log(Math.abs(sentimentImpact) - 14));
    }
    
    return sentimentImpact;
  }

  /**
   * Calculate momentum boost for trading context
   */
  private calculateMomentumBoost(factorAnalysis: FactorAnalysis): number {
    // Look for momentum-related convergence factors
    const momentumFactors = factorAnalysis.convergenceFactors.filter(factor => 
      factor.category === 'momentum' || 
      factor.description.toLowerCase().includes('momentum') ||
      factor.description.toLowerCase().includes('trend')
    );

    if (momentumFactors.length > 0) {
      const momentumWeight = momentumFactors.reduce((sum, factor) => sum + factor.weight, 0);
      return Math.min(5, momentumWeight * 3); // Max 5 point boost
    }

    return 0;
  }

  /**
   * Calculate stability adjustment for investment context
   */
  private calculateStabilityAdjustment(factorAnalysis: FactorAnalysis): number {
    // Look for alignment and consistency factors
    const stabilityFactors = factorAnalysis.convergenceFactors.filter(factor => 
      factor.category === 'alignment' || 
      factor.category === 'sustainability' ||
      factor.description.toLowerCase().includes('consistent') ||
      factor.description.toLowerCase().includes('stable')
    );

    if (stabilityFactors.length > 0) {
      const stabilityWeight = stabilityFactors.reduce((sum, factor) => sum + factor.weight, 0);
      return Math.min(3, stabilityWeight * 2); // Max 3 point boost, more conservative than momentum
    }

    return 0;
  }

  /**
   * Calculate confidence-based score adjustment
   */
  private calculateConfidenceAdjustment(factorAnalysis: FactorAnalysis): number {
    const allFactors = [...factorAnalysis.convergenceFactors, ...factorAnalysis.divergenceFactors];
    
    if (allFactors.length === 0) return 1.0;

    const avgConfidence = allFactors.reduce((sum, factor) => {
      const confidence = factor.metadata?.confidence || 0.8;
      return sum + confidence;
    }, 0) / allFactors.length;

    // Adjust score based on overall confidence
    // High confidence: slight boost, Low confidence: slight reduction
    return 0.9 + (avgConfidence * 0.2); // Range: 0.9 to 1.1
  }

  /**
   * Get enhanced timeframe-specific score adjustment with factor analysis
   */
  private getEnhancedTimeframeAdjustment(timeframe: string, factorAnalysis: FactorAnalysis): number {
    const baseAdjustments: Record<string, number> = {
      '1D': 0.95, // Slightly conservative for very short-term
      '1W': 0.98,
      '1M': 1.0,
      '3M': 1.02,
      '6M': 1.03,
      '1Y': 1.05  // Slightly optimistic for longer-term
    };

    let adjustment = baseAdjustments[timeframe] || 1.0;

    // Apply factor-based adjustments
    if (factorAnalysis.convergenceFactors.length > factorAnalysis.divergenceFactors.length) {
      // More convergence factors = slight boost
      adjustment += 0.02;
    } else if (factorAnalysis.divergenceFactors.length > factorAnalysis.convergenceFactors.length) {
      // More divergence factors = slight reduction
      adjustment -= 0.02;
    }

    // Ensure adjustment stays within reasonable bounds
    return Math.max(0.9, Math.min(1.1, adjustment));
  }

  /**
   * Calculate trade parameters based on technical analysis and synthesis results
   */
  private calculateTradeParameters(
    input: SynthesisInput,
    synthesisScore: number,
    confidence: number
  ): {
    entry_price: number;
    stop_loss: number;
    take_profit_levels: number[];
  } {
    // Extract current price from technical analysis
    const technicalDetails = input.technical_result.details;
    const currentPrice = this.extractCurrentPrice(technicalDetails);
    
    // Calculate volatility from ATR
    const volatility = this.calculateVolatilityFromTechnical(technicalDetails, currentPrice);
    
    // Get support and resistance levels
    const supportResistance = this.extractSupportResistanceLevels(technicalDetails);
    
    // Calculate entry price based on synthesis score and context
    const entryPrice = this.calculateOptimalEntryPrice(
      currentPrice,
      synthesisScore,
      supportResistance,
      volatility,
      input.analysis_context
    );
    
    // Calculate stop loss
    const stopLoss = this.calculateOptimalStopLoss(
      entryPrice,
      currentPrice,
      supportResistance,
      volatility,
      input.analysis_context,
      synthesisScore
    );
    
    // Calculate take profit levels
    const takeProfitLevels = this.calculateOptimalTakeProfitLevels(
      entryPrice,
      currentPrice,
      supportResistance,
      volatility,
      input.analysis_context,
      synthesisScore
    );
    
    return {
      entry_price: entryPrice,
      stop_loss: stopLoss,
      take_profit_levels: takeProfitLevels
    };
  }

  /**
   * Extract current price from technical analysis details
   */
  private extractCurrentPrice(technicalDetails: any): number {
    // Try to get current price from various sources in technical analysis
    const trendIndicators = technicalDetails.trend_indicators || {};
    const momentumIndicators = technicalDetails.momentum_indicators || {};
    
    // Look for current price indicators
    const currentPrice = trendIndicators.current_price || 
                        momentumIndicators.current_price ||
                        trendIndicators.sma_20 || // Use SMA as proxy if current price not available
                        100; // Fallback value
    
    return currentPrice;
  }

  /**
   * Calculate volatility from technical analysis data
   */
  private calculateVolatilityFromTechnical(technicalDetails: any, currentPrice: number): number {
    const trendIndicators = technicalDetails.trend_indicators || {};
    const momentumIndicators = technicalDetails.momentum_indicators || {};
    
    // Use ATR (Average True Range) as primary volatility measure
    const atr = trendIndicators.atr || 
                momentumIndicators.atr || 
                currentPrice * 0.02; // Fallback to 2% of price
    
    // Convert ATR to percentage volatility
    const volatility = atr / currentPrice;
    
    // Ensure reasonable bounds
    return Math.max(0.005, Math.min(0.15, volatility)); // 0.5% to 15%
  }

  /**
   * Extract support and resistance levels from technical analysis
   */
  private extractSupportResistanceLevels(technicalDetails: any): {
    support: number[];
    resistance: number[];
  } {
    const supportResistance = technicalDetails.support_resistance || {};
    
    return {
      support: supportResistance.support_levels || [],
      resistance: supportResistance.resistance_levels || []
    };
  }

  /**
   * Calculate optimal entry price
   */
  private calculateOptimalEntryPrice(
    currentPrice: number,
    synthesisScore: number,
    supportResistance: { support: number[]; resistance: number[] },
    volatility: number,
    analysisContext: 'investment' | 'trading'
  ): number {
    let entryPrice = currentPrice;
    const isBuySignal = synthesisScore > 50;

    if (isBuySignal) {
      // For buy signals
      if (analysisContext === 'trading') {
        if (synthesisScore > 75) {
          // Strong signal - enter at market or slight premium
          entryPrice = currentPrice * (1 + volatility * 0.1);
        } else if (synthesisScore > 60) {
          // Moderate signal - wait for slight pullback
          entryPrice = currentPrice * (1 - volatility * 0.2);
        } else {
          // Weak signal - wait for better entry
          entryPrice = currentPrice * (1 - volatility * 0.5);
        }
      } else {
        // Investment context - more patient entries
        if (synthesisScore > 80) {
          entryPrice = currentPrice;
        } else if (synthesisScore > 65) {
          entryPrice = currentPrice * (1 - volatility * 0.3);
        } else {
          entryPrice = currentPrice * (1 - volatility * 0.6);
        }
      }

      // Adjust based on support levels
      const nearestSupport = this.findNearestLevel(currentPrice, supportResistance.support, 'below');
      if (nearestSupport && nearestSupport > entryPrice * 0.95) {
        entryPrice = Math.max(entryPrice, nearestSupport * 1.005);
      }
    } else {
      // For sell signals
      if (analysisContext === 'trading') {
        if (synthesisScore < 25) {
          entryPrice = currentPrice * (1 - volatility * 0.1);
        } else if (synthesisScore < 40) {
          entryPrice = currentPrice * (1 + volatility * 0.2);
        } else {
          entryPrice = currentPrice * (1 + volatility * 0.5);
        }
      } else {
        entryPrice = currentPrice; // Exit at market for investment
      }

      // Adjust based on resistance levels
      const nearestResistance = this.findNearestLevel(currentPrice, supportResistance.resistance, 'above');
      if (nearestResistance && nearestResistance < entryPrice * 1.05) {
        entryPrice = Math.min(entryPrice, nearestResistance * 0.995);
      }
    }

    // Ensure entry price is reasonable (within 10% of current price)
    const maxDeviation = currentPrice * 0.1;
    entryPrice = Math.max(currentPrice - maxDeviation, Math.min(currentPrice + maxDeviation, entryPrice));

    return Math.round(entryPrice * 100) / 100;
  }

  /**
   * Calculate optimal stop loss
   */
  private calculateOptimalStopLoss(
    entryPrice: number,
    currentPrice: number,
    supportResistance: { support: number[]; resistance: number[] },
    volatility: number,
    analysisContext: 'investment' | 'trading',
    synthesisScore: number
  ): number {
    const isBuySignal = synthesisScore > 50;
    let stopLoss: number;

    if (isBuySignal) {
      // For buy positions, stop loss is below entry
      if (analysisContext === 'trading') {
        const baseStopDistance = volatility * 2.0;
        stopLoss = entryPrice * (1 - baseStopDistance);
      } else {
        const baseStopDistance = volatility * 3.0;
        stopLoss = entryPrice * (1 - baseStopDistance);
      }

      // Adjust based on support levels
      const nearestSupport = this.findNearestLevel(entryPrice, supportResistance.support, 'below');
      if (nearestSupport && nearestSupport > stopLoss) {
        stopLoss = nearestSupport * 0.995;
      }

      // Ensure minimum stop distance
      const minStopDistance = analysisContext === 'trading' ? 0.01 : 0.02;
      stopLoss = Math.min(stopLoss, entryPrice * (1 - minStopDistance));
    } else {
      // For sell positions, stop loss is above entry
      if (analysisContext === 'trading') {
        const baseStopDistance = volatility * 2.0;
        stopLoss = entryPrice * (1 + baseStopDistance);
      } else {
        stopLoss = entryPrice * 1.05; // 5% above as safety measure
      }

      // Adjust based on resistance levels
      const nearestResistance = this.findNearestLevel(entryPrice, supportResistance.resistance, 'above');
      if (nearestResistance && nearestResistance < stopLoss) {
        stopLoss = nearestResistance * 1.005;
      }
    }

    return Math.round(stopLoss * 100) / 100;
  }

  /**
   * Calculate optimal take profit levels
   */
  private calculateOptimalTakeProfitLevels(
    entryPrice: number,
    currentPrice: number,
    supportResistance: { support: number[]; resistance: number[] },
    volatility: number,
    analysisContext: 'investment' | 'trading',
    synthesisScore: number
  ): number[] {
    const isBuySignal = synthesisScore > 50;
    const takeProfitLevels: number[] = [];

    if (isBuySignal) {
      // For buy positions, take profits above entry
      if (analysisContext === 'trading') {
        const baseTargets = [
          entryPrice * (1 + volatility * 2), // First target: 2x volatility
          entryPrice * (1 + volatility * 4), // Second target: 4x volatility
          entryPrice * (1 + volatility * 6)  // Third target: 6x volatility
        ];
        takeProfitLevels.push(...baseTargets);
      } else {
        const baseTargets = [
          entryPrice * (1 + volatility * 5),  // First target: 5x volatility
          entryPrice * (1 + volatility * 10), // Second target: 10x volatility
          entryPrice * (1 + volatility * 15)  // Third target: 15x volatility
        ];
        takeProfitLevels.push(...baseTargets);
      }

      // Adjust based on resistance levels
      supportResistance.resistance.forEach((resistance, index) => {
        if (resistance > entryPrice && index < takeProfitLevels.length) {
          takeProfitLevels[index] = Math.min(takeProfitLevels[index], resistance * 0.995);
        }
      });
    } else {
      // For sell positions, take profits below entry
      if (analysisContext === 'trading') {
        const baseTargets = [
          entryPrice * (1 - volatility * 2),
          entryPrice * (1 - volatility * 4),
          entryPrice * (1 - volatility * 6)
        ];
        takeProfitLevels.push(...baseTargets);
      } else {
        takeProfitLevels.push(entryPrice * 0.95); // Single exit at 5% below
      }

      // Adjust based on support levels
      supportResistance.support.forEach((support, index) => {
        if (support < entryPrice && index < takeProfitLevels.length) {
          takeProfitLevels[index] = Math.max(takeProfitLevels[index], support * 1.005);
        }
      });
    }

    // Return properly ordered and rounded levels
    return takeProfitLevels
      .filter(level => level > 0)
      .map(level => Math.round(level * 100) / 100)
      .sort((a, b) => isBuySignal ? a - b : b - a)
      .slice(0, 3);
  }

  /**
   * Find the nearest support or resistance level
   */
  private findNearestLevel(
    price: number, 
    levels: number[], 
    direction: 'above' | 'below'
  ): number | null {
    const filteredLevels = levels.filter(level => 
      direction === 'above' ? level > price : level < price
    );

    if (filteredLevels.length === 0) return null;

    return filteredLevels.reduce((nearest, current) => {
      const nearestDistance = Math.abs(price - nearest);
      const currentDistance = Math.abs(price - current);
      return currentDistance < nearestDistance ? current : nearest;
    });
  }

  /**
   * Calculate enhanced overall confidence with real data quality assessment
   */
  private calculateEnhancedOverallConfidence(input: SynthesisInput, factorAnalysis: FactorAnalysis): number {
    const confidences = [
      input.fundamental_result.confidence || 0.8,
      input.technical_result.confidence || 0.8,
      input.esg_result.confidence || 0.8
    ];

    // Weighted average of confidences based on context
    const weights = this.config[input.analysis_context];
    const weightedConfidence = (
      confidences[0] * weights.fundamental +
      confidences[1] * weights.technical +
      confidences[2] * weights.esg
    );

    // Enhanced adjustments based on factor analysis quality
    let confidenceAdjustment = 1.0;

    // Factor quality assessment
    const totalFactors = factorAnalysis.convergenceFactors.length + factorAnalysis.divergenceFactors.length;
    if (totalFactors > 5) {
      confidenceAdjustment += 0.1; // More factors = higher confidence
    } else if (totalFactors < 2) {
      confidenceAdjustment -= 0.15; // Few factors = lower confidence
    }

    // Convergence/divergence balance assessment
    const convergenceWeight = factorAnalysis.totalConvergenceWeight;
    const divergenceWeight = factorAnalysis.totalDivergenceWeight;
    const totalWeight = convergenceWeight + divergenceWeight;
    
    if (totalWeight > 0) {
      const balance = Math.abs(convergenceWeight - divergenceWeight) / totalWeight;
      if (balance > 0.7) {
        confidenceAdjustment += 0.05; // Clear directional signal increases confidence
      }
    }

    // Confidence consistency penalty
    const confidenceRange = Math.max(...confidences) - Math.min(...confidences);
    const consistencyPenalty = confidenceRange * 0.15; // Reduced penalty compared to basic version

    // Data quality bonus for high individual confidences
    const avgIndividualConfidence = confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
    const qualityBonus = avgIndividualConfidence > 0.85 ? 0.05 : 0;

    const finalConfidence = (weightedConfidence * confidenceAdjustment) - consistencyPenalty + qualityBonus;

    return Math.max(0.15, Math.min(0.95, finalConfidence)); // Slightly wider range than basic version
  }

  /**
   * Calculate overall confidence
   */
  private calculateOverallConfidence(input: SynthesisInput): number {
    const confidences = [
      input.fundamental_result.confidence,
      input.technical_result.confidence,
      input.esg_result.confidence
    ];

    // Weighted average of confidences
    const weights = this.config[input.analysis_context];
    const weightedConfidence = (
      confidences[0] * weights.fundamental +
      confidences[1] * weights.technical +
      confidences[2] * weights.esg
    );

    // Adjust for confidence consistency
    const confidenceRange = Math.max(...confidences) - Math.min(...confidences);
    const consistencyPenalty = confidenceRange * 0.2; // Penalize inconsistent confidence

    const finalConfidence = weightedConfidence - consistencyPenalty;

    return Math.max(0.1, Math.min(1.0, finalConfidence));
  }

  /**
   * Generate enhanced comprehensive analysis report with real data insights
   */
  private generateEnhancedAnalysisReport(
    input: SynthesisInput,
    weightedScores: WeightedScores,
    factorAnalysis: FactorAnalysis,
    synthesisScore: number,
    confidence: number
  ): AnalysisReport {
    const recommendation = getRecommendation(synthesisScore);
    
    // Generate enhanced summary with more detailed insights
    const summary = this.generateEnhancedSummary(
      input,
      synthesisScore,
      recommendation,
      factorAnalysis,
      confidence
    );

    // Generate enhanced methodology explanation
    const methodology = this.generateEnhancedMethodologyExplanation(
      input.analysis_context, 
      input.trading_timeframe,
      weightedScores,
      factorAnalysis
    );

    // Identify enhanced limitations with more specific insights
    const limitations = this.identifyEnhancedLimitations(input, confidence, factorAnalysis);

    // Generate actionable insights
    const actionableInsights = this.generateActionableInsights(input, factorAnalysis, synthesisScore);

    return {
      summary,
      recommendation,
      fundamental: input.fundamental_result,
      technical: input.technical_result,
      esg: input.esg_result,
      synthesis_methodology: methodology,
      limitations,
      actionable_insights: actionableInsights,
      metadata: {
        analysis_timestamp: new Date().toISOString(),
        data_sources: ['fundamental-analysis', 'technical-analysis', 'esg-analysis'],
        api_version: '2.0.0',
        confidence_score: confidence,
        factor_analysis_summary: {
          convergence_factors: factorAnalysis.convergenceFactors.length,
          divergence_factors: factorAnalysis.divergenceFactors.length,
          net_sentiment: factorAnalysis.netSentiment
        }
      }
    };
  }

  /**
   * Generate enhanced summary with detailed insights
   */
  private generateEnhancedSummary(
    input: SynthesisInput,
    synthesisScore: number,
    recommendation: string,
    factorAnalysis: FactorAnalysis,
    confidence: number
  ): string {
    const context = input.analysis_context === 'investment' ? 'investment' : 'trading';
    const timeframe = input.trading_timeframe ? ` (${input.trading_timeframe})` : '';
    
    let summary = `${input.ticker_symbol} receives a synthesis score of ${synthesisScore}/100 for ${context}${timeframe}, `;
    summary += `resulting in a ${recommendation.replace('_', ' ').toUpperCase()} recommendation with ${(confidence * 100).toFixed(0)}% confidence. `;

    // Add enhanced convergence/divergence insights
    if (factorAnalysis.convergenceFactors.length > 0) {
      const topConvergence = factorAnalysis.convergenceFactors
        .sort((a, b) => (b.weight * (b.metadata?.confidence || 1)) - (a.weight * (a.metadata?.confidence || 1)))[0];
      summary += `Primary strength: ${topConvergence.description.toLowerCase()}. `;
    }

    if (factorAnalysis.divergenceFactors.length > 0) {
      const topDivergence = factorAnalysis.divergenceFactors
        .sort((a, b) => (b.weight * (b.metadata?.confidence || 1)) - (a.weight * (a.metadata?.confidence || 1)))[0];
      summary += `Key concern: ${topDivergence.description.toLowerCase()}. `;
    }

    // Add component scores with context
    summary += `Component scores: Fundamental (${input.fundamental_result.score}), `;
    summary += `Technical (${input.technical_result.score}), `;
    summary += `ESG (${input.esg_result.score}). `;

    // Add net sentiment insight
    if (Math.abs(factorAnalysis.netSentiment) > 0.5) {
      const sentimentDirection = factorAnalysis.netSentiment > 0 ? 'positive' : 'negative';
      summary += `Overall sentiment leans ${sentimentDirection} with net factor weight of ${factorAnalysis.netSentiment.toFixed(2)}.`;
    }

    return summary;
  }

  /**
   * Generate enhanced methodology explanation
   */
  private generateEnhancedMethodologyExplanation(
    analysisContext: 'investment' | 'trading',
    tradingTimeframe?: string,
    weightedScores?: WeightedScores,
    factorAnalysis?: FactorAnalysis
  ): string {
    const weights = this.config[analysisContext];
    
    let methodology = `This enhanced analysis uses a context-aware weighted synthesis approach optimized for ${analysisContext}. `;
    methodology += `Base component weightings: Fundamental (${(weights.fundamental * 100).toFixed(0)}%), `;
    methodology += `Technical (${(weights.technical * 100).toFixed(0)}%), `;
    methodology += `ESG (${(weights.esg * 100).toFixed(0)}%). `;

    if (analysisContext === 'trading' && tradingTimeframe) {
      methodology += `Timeframe-specific adjustments applied for ${tradingTimeframe} analysis with momentum considerations. `;
    }

    if (factorAnalysis) {
      methodology += `Advanced factor analysis identified ${factorAnalysis.convergenceFactors.length} convergence and `;
      methodology += `${factorAnalysis.divergenceFactors.length} divergence patterns. `;
    }

    methodology += `Confidence-based weight adjustments and statistical significance testing applied to enhance accuracy. `;
    methodology += `Cross-analysis pattern recognition used to identify thematic convergence and conflicts.`;

    return methodology;
  }

  /**
   * Generate actionable insights based on analysis
   */
  private generateActionableInsights(
    input: SynthesisInput,
    factorAnalysis: FactorAnalysis,
    synthesisScore: number
  ): string[] {
    const insights: string[] = [];

    // Score-based insights
    if (synthesisScore >= 75) {
      insights.push(`Strong overall signal suggests favorable ${input.analysis_context} opportunity`);
    } else if (synthesisScore <= 35) {
      insights.push(`Weak overall signal suggests caution or avoidance for ${input.analysis_context}`);
    } else {
      insights.push(`Mixed signals require careful consideration of individual analysis components`);
    }

    // Context-specific insights
    if (input.analysis_context === 'trading') {
      const technicalScore = input.technical_result.score;
      if (technicalScore > 70) {
        insights.push(`Strong technical momentum supports short-term trading opportunities`);
      } else if (technicalScore < 40) {
        insights.push(`Weak technical signals suggest waiting for better entry points`);
      }

      if (input.trading_timeframe === '1D') {
        insights.push(`Day trading requires close monitoring of intraday momentum and volume`);
      }
    } else {
      const fundamentalScore = input.fundamental_result.score;
      const esgScore = input.esg_result.score;
      
      if (fundamentalScore > 70 && esgScore > 60) {
        insights.push(`Strong fundamentals and ESG profile support long-term investment thesis`);
      } else if (fundamentalScore > 70 && esgScore < 40) {
        insights.push(`Consider ESG risks despite strong financial metrics for sustainable investing`);
      }
    }

    // Factor-based insights
    if (factorAnalysis.convergenceFactors.length > factorAnalysis.divergenceFactors.length) {
      insights.push(`Multiple analyses align, increasing confidence in the overall assessment`);
    } else if (factorAnalysis.divergenceFactors.length > factorAnalysis.convergenceFactors.length) {
      insights.push(`Conflicting signals between analyses warrant additional due diligence`);
    }

    // Risk insights
    const scores = [input.fundamental_result.score, input.technical_result.score, input.esg_result.score];
    const scoreVariance = scores.reduce((sum, score) => sum + Math.pow(score - (scores.reduce((a, b) => a + b) / scores.length), 2), 0) / scores.length;
    
    if (scoreVariance > 400) {
      insights.push(`High variance between analysis types suggests elevated uncertainty and risk`);
    }

    return insights;
  }

  /**
   * Identify enhanced limitations with specific insights
   */
  private identifyEnhancedLimitations(
    input: SynthesisInput, 
    confidence: number, 
    factorAnalysis: FactorAnalysis
  ): string[] {
    const limitations: string[] = [];

    // Enhanced confidence-based limitations
    if (confidence < 0.5) {
      limitations.push('Low analysis confidence due to significant data quality issues or conflicting signals');
    } else if (confidence < 0.7) {
      limitations.push('Moderate analysis confidence suggests some data limitations or minor conflicts between analyses');
    }

    // Factor analysis limitations
    const totalFactors = factorAnalysis.convergenceFactors.length + factorAnalysis.divergenceFactors.length;
    if (totalFactors < 3) {
      limitations.push('Limited factor identification may indicate insufficient data depth for comprehensive analysis');
    }

    // Context-specific enhanced limitations
    if (input.analysis_context === 'trading') {
      if (input.trading_timeframe === '1D') {
        limitations.push('Intraday analysis is highly susceptible to market noise, news events, and low-volume conditions');
      } else if (input.trading_timeframe === '1W') {
        limitations.push('Weekly trading analysis may miss important intraday momentum shifts and volume patterns');
      }
    } else {
      limitations.push('Long-term investment analysis assumes stable market conditions and business fundamentals');
    }

    // Component-specific enhanced limitations
    const confidences = [
      input.fundamental_result.confidence || 0.8,
      input.technical_result.confidence || 0.8,
      input.esg_result.confidence || 0.8
    ];

    if (confidences[0] < 0.6) {
      limitations.push('Fundamental analysis limited by incomplete financial data or recent corporate changes');
    }

    if (confidences[1] < 0.6) {
      limitations.push('Technical analysis constrained by insufficient price history or unusual market conditions');
    }

    if (confidences[2] < 0.6) {
      limitations.push('ESG analysis limited by incomplete sustainability reporting or recent policy changes');
    }

    // Enhanced general limitations
    limitations.push('Analysis reflects current market conditions and available data as of the analysis timestamp');
    limitations.push('External factors such as regulatory changes, geopolitical events, or market crashes may override analysis conclusions');
    limitations.push('Individual risk tolerance and investment objectives should be considered alongside this analysis');

    return limitations;
  }

  /**
   * Generate comprehensive analysis report
   */
  private generateAnalysisReport(
    input: SynthesisInput,
    weightedScores: WeightedScores,
    factorAnalysis: FactorAnalysis,
    synthesisScore: number,
    confidence: number
  ): AnalysisReport {
    const recommendation = getRecommendation(synthesisScore);
    
    // Generate summary
    const summary = this.generateSummary(
      input,
      synthesisScore,
      recommendation,
      factorAnalysis
    );

    // Generate methodology explanation
    const methodology = this.generateMethodologyExplanation(input.analysis_context, input.trading_timeframe);

    // Identify limitations
    const limitations = this.identifyLimitations(input, confidence);

    return {
      summary,
      recommendation,
      fundamental: input.fundamental_result,
      technical: input.technical_result,
      esg: input.esg_result,
      synthesis_methodology: methodology,
      limitations,
      metadata: {
        analysis_timestamp: new Date().toISOString(),
        data_sources: ['fundamental-analysis', 'technical-analysis', 'esg-analysis'],
        api_version: '1.0.0'
      }
    };
  }

  /**
   * Generate analysis summary
   */
  private generateSummary(
    input: SynthesisInput,
    synthesisScore: number,
    recommendation: string,
    factorAnalysis: FactorAnalysis
  ): string {
    const context = input.analysis_context === 'investment' ? 'investment' : 'trading';
    const timeframe = input.trading_timeframe ? ` (${input.trading_timeframe})` : '';
    
    let summary = `${input.ticker_symbol} receives a synthesis score of ${synthesisScore}/100 for ${context}${timeframe}, `;
    summary += `resulting in a ${recommendation.replace('_', ' ').toUpperCase()} recommendation. `;

    // Add convergence/divergence insights
    if (factorAnalysis.convergenceFactors.length > 0) {
      summary += `Key strengths include ${factorAnalysis.convergenceFactors[0].description.toLowerCase()}. `;
    }

    if (factorAnalysis.divergenceFactors.length > 0) {
      summary += `Notable concerns include ${factorAnalysis.divergenceFactors[0].description.toLowerCase()}. `;
    }

    // Add component scores
    summary += `Component scores: Fundamental (${input.fundamental_result.score}), `;
    summary += `Technical (${input.technical_result.score}), `;
    summary += `ESG (${input.esg_result.score}).`;

    return summary;
  }

  /**
   * Generate methodology explanation
   */
  private generateMethodologyExplanation(
    analysisContext: 'investment' | 'trading',
    tradingTimeframe?: string
  ): string {
    const weights = this.config[analysisContext];
    
    let methodology = `This analysis uses a weighted synthesis approach optimized for ${analysisContext}. `;
    methodology += `Component weightings: Fundamental (${(weights.fundamental * 100).toFixed(0)}%), `;
    methodology += `Technical (${(weights.technical * 100).toFixed(0)}%), `;
    methodology += `ESG (${(weights.esg * 100).toFixed(0)}%). `;

    if (analysisContext === 'trading' && tradingTimeframe) {
      methodology += `Timeframe-specific adjustments applied for ${tradingTimeframe} analysis. `;
    }

    methodology += `Convergence and divergence factors are identified and weighted based on cross-analysis agreement and conflict patterns.`;

    return methodology;
  }

  /**
   * Identify analysis limitations
   */
  private identifyLimitations(input: SynthesisInput, confidence: number): string[] {
    const limitations: string[] = [];

    // Confidence-based limitations
    if (confidence < 0.6) {
      limitations.push('Analysis confidence is below optimal levels due to data quality or availability issues');
    }

    // Context-specific limitations
    if (input.analysis_context === 'trading' && input.trading_timeframe === '1D') {
      limitations.push('Very short-term analysis may be subject to market noise and volatility');
    }

    // Component-specific limitations
    if (input.fundamental_result.confidence < 0.7) {
      limitations.push('Fundamental analysis confidence is limited by data availability or quality');
    }

    if (input.technical_result.confidence < 0.7) {
      limitations.push('Technical analysis confidence is limited by historical data depth or quality');
    }

    if (input.esg_result.confidence < 0.7) {
      limitations.push('ESG analysis confidence is limited by sustainability data availability');
    }

    // General limitations
    limitations.push('Analysis reflects point-in-time data and market conditions');
    limitations.push('Past performance and current metrics do not guarantee future results');

    return limitations;
  }

  /**
   * Calculate comprehensive trade parameters based on technical analysis
   * @param input Trade parameters input data
   * @returns Promise<TradeParametersOutput> Calculated trade parameters
   */
  async calculateTradeParameters(input: TradeParametersInput): Promise<TradeParametersOutput> {
    try {
      console.log(`Calculating trade parameters for ${input.ticker_symbol} (${input.analysis_context})`);

      // Validate input
      this.validateTradeParametersInput(input);

      // Extract technical data
      const technicalDetails = input.technical_result.details;
      const currentPrice = input.current_price;

      // Calculate volatility from ATR
      const volatility = this.calculateVolatility(technicalDetails, currentPrice);

      // Get support and resistance levels
      const supportResistance = this.extractSupportResistanceLevels(technicalDetails);

      // Calculate entry price based on context and analysis
      const entryPrice = this.calculateEntryPrice(
        currentPrice,
        input.synthesis_score,
        supportResistance,
        volatility,
        input.analysis_context
      );

      // Calculate stop loss based on volatility and support/resistance
      const stopLoss = this.calculateStopLoss(
        entryPrice,
        currentPrice,
        supportResistance,
        volatility,
        input.analysis_context,
        input.synthesis_score
      );

      // Calculate multiple take profit levels
      const takeProfitLevels = this.calculateTakeProfitLevels(
        entryPrice,
        currentPrice,
        supportResistance,
        volatility,
        input.analysis_context,
        input.synthesis_score
      );

      // Calculate risk metrics
      const riskRewardRatio = this.calculateRiskRewardRatio(entryPrice, stopLoss, takeProfitLevels);
      const positionSizeRecommendation = this.calculatePositionSize(
        entryPrice,
        stopLoss,
        input.synthesis_score,
        volatility
      );

      // Calculate confidence based on data quality and market conditions
      const confidence = this.calculateTradeConfidence(
        input.technical_result,
        supportResistance,
        volatility,
        input.synthesis_score
      );

      // Generate methodology explanation
      const methodology = this.generateTradeMethodologyExplanation(
        input.analysis_context,
        input.trading_timeframe,
        volatility,
        supportResistance
      );

      // Calculate risk metrics
      const riskMetrics = this.calculateRiskMetrics(
        entryPrice,
        stopLoss,
        takeProfitLevels,
        volatility,
        input.synthesis_score
      );

      console.log(`Trade parameters calculated for ${input.ticker_symbol}: Entry=${entryPrice.toFixed(2)}, Stop=${stopLoss.toFixed(2)}, R/R=${riskRewardRatio.toFixed(2)}`);

      return {
        entry_price: entryPrice,
        stop_loss: stopLoss,
        take_profit_levels: takeProfitLevels,
        risk_reward_ratio: riskRewardRatio,
        position_size_recommendation: positionSizeRecommendation,
        confidence,
        methodology,
        metadata: {
          calculation_timestamp: new Date().toISOString(),
          volatility_used: volatility,
          support_resistance_levels: supportResistance,
          risk_metrics: riskMetrics
        }
      };

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError(
        ERROR_CODES.PROCESSING_ERROR,
        'Failed to calculate trade parameters',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Validate trade parameters input
   */
  private validateTradeParametersInput(input: TradeParametersInput): void {
    if (!input.ticker_symbol || typeof input.ticker_symbol !== 'string') {
      throw new AppError(ERROR_CODES.INVALID_PARAMETER, 'Invalid ticker symbol');
    }

    if (!['investment', 'trading'].includes(input.analysis_context)) {
      throw new AppError(ERROR_CODES.INVALID_PARAMETER, 'Invalid analysis context');
    }

    if (!input.technical_result || typeof input.technical_result.score !== 'number') {
      throw new AppError(ERROR_CODES.INVALID_PARAMETER, 'Invalid technical analysis result');
    }

    if (typeof input.current_price !== 'number' || input.current_price <= 0) {
      throw new AppError(ERROR_CODES.INVALID_PARAMETER, 'Invalid current price');
    }

    if (typeof input.synthesis_score !== 'number' || input.synthesis_score < 0 || input.synthesis_score > 100) {
      throw new AppError(ERROR_CODES.INVALID_PARAMETER, 'Invalid synthesis score');
    }
  }

  /**
   * Calculate volatility from technical analysis data
   */
  private calculateVolatility(technicalDetails: any, currentPrice: number): number {
    // Use ATR (Average True Range) as primary volatility measure
    const atr = technicalDetails.trend_indicators?.atr || 
                technicalDetails.momentum_indicators?.atr || 
                currentPrice * 0.02; // Fallback to 2% of price

    // Convert ATR to percentage volatility
    const volatility = atr / currentPrice;

    // Ensure reasonable bounds
    return Math.max(0.005, Math.min(0.15, volatility)); // 0.5% to 15%
  }

  /**
   * Extract support and resistance levels from technical analysis
   */
  private extractSupportResistanceLevels(technicalDetails: any): {
    support: number[];
    resistance: number[];
  } {
    const supportResistance = technicalDetails.support_resistance || {};
    
    return {
      support: supportResistance.support_levels || [],
      resistance: supportResistance.resistance_levels || []
    };
  }
}

/**
 * Main request handler for synthesis engine with enhanced error handling
 */
const handleSynthesis = async (request: Request, requestId: string): Promise<Response> => {
  const logger = createLogger('synthesis-engine', requestId);
  const requestMonitor = createRequestMonitor('synthesis-engine', requestId, request.method, logger);
  let pipelineMonitor: AnalysisPipelineMonitor | undefined;
  const startTime = Date.now();

  try {
    logger.info('Starting synthesis engine request');
    requestMonitor.addMetadata({ stage: 'initialization' });

    // Parse and validate request body
    const body = await parseJsonBody(request);
    
    // Check if this is fundamental-only synthesis (Phase 1) or full synthesis
    const isFundamentalOnly = !body.technical_result || !body.esg_result;
    
    if (isFundamentalOnly) {
      // Validate required fields for fundamental-only synthesis
      const requiredFields = ['ticker_symbol', 'analysis_context', 'fundamental_result'];
      
      for (const field of requiredFields) {
        if (!body[field]) {
          const error = new AnalysisError(
            ANALYSIS_ERROR_CODES.MISSING_PARAMETER,
            `Missing required parameter for fundamental-only synthesis: ${field}`,
            AnalysisStage.VALIDATION,
            `Required field '${field}' is missing from request body`
          );
          logger.error('Validation failed', error);
          requestMonitor.end(400, error.code);
          throw error;
        }
      }
    } else {
      // Validate required fields for full synthesis
      const requiredFields = [
        'ticker_symbol',
        'analysis_context',
        'fundamental_result',
        'technical_result',
        'esg_result'
      ];

      for (const field of requiredFields) {
        if (!body[field]) {
          const error = new AnalysisError(
            ANALYSIS_ERROR_CODES.MISSING_PARAMETER,
            `Missing required parameter: ${field}`,
            AnalysisStage.VALIDATION,
            `Required field '${field}' is missing from request body`
          );
          logger.error('Validation failed', error);
          requestMonitor.end(400, error.code);
          throw error;
        }
      }
    }

    // Initialize pipeline monitoring
    pipelineMonitor = new AnalysisPipelineMonitor(
      requestId,
      body.ticker_symbol,
      body.analysis_context,
      logger
    );

    logger.info(`Starting ${isFundamentalOnly ? 'fundamental-only' : 'full'} synthesis`, {
      ticker: body.ticker_symbol,
      context: body.analysis_context,
      timeframe: body.trading_timeframe,
      mode: isFundamentalOnly ? 'fundamental-only' : 'full'
    });

    requestMonitor.addMetadata({
      ticker: body.ticker_symbol,
      context: body.analysis_context,
      timeframe: body.trading_timeframe,
      synthesis_mode: isFundamentalOnly ? 'fundamental-only' : 'full'
    });

    pipelineMonitor.startStage(AnalysisStage.SYNTHESIS);

    // Perform synthesis with enhanced error handling
    const synthesisEngine = new SynthesisEngine();
    let result: SynthesisOutput;

    if (isFundamentalOnly) {
      // Phase 1: Fundamental-only synthesis
      result = await synthesisEngine.synthesizeFundamentalOnly(
        body.fundamental_result,
        body.ticker_symbol,
        body.analysis_context
      );
    } else {
      // Full synthesis with all analysis types
      const synthesisInput: SynthesisInput = {
        ticker_symbol: body.ticker_symbol,
        analysis_context: body.analysis_context,
        trading_timeframe: body.trading_timeframe,
        fundamental_result: body.fundamental_result,
        technical_result: body.technical_result,
        esg_result: body.esg_result
      };
      
      result = await synthesisEngine.synthesize(synthesisInput);
    }

    pipelineMonitor.endStage(AnalysisStage.SYNTHESIS, result);

    const duration = Date.now() - startTime;
    const summary = pipelineMonitor.getSummary();

    // Record performance metrics
    AnalysisPerformanceMonitor.recordAnalysis(
      body.ticker_symbol,
      body.analysis_context,
      duration,
      true,
      summary.stageTimings
    );

    logger.info('Synthesis completed successfully', {
      ticker: synthesisInput.ticker_symbol,
      score: result.synthesis_score,
      confidence: result.confidence,
      duration
    });

    requestMonitor.end(200, undefined, {
      synthesis_score: result.synthesis_score,
      confidence: result.confidence,
      duration
    });

    return createSuccessHttpResponse(result, requestId);

  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Handle different types of errors
    let analysisError: AnalysisError;
    
    if (error instanceof AnalysisError) {
      analysisError = error;
    } else if (error instanceof AppError) {
      analysisError = new AnalysisError(
        error.code,
        error.message,
        AnalysisStage.SYNTHESIS,
        error.details,
        error.retryAfter,
        body?.ticker_symbol,
        body?.analysis_context
      );
    } else {
      analysisError = new AnalysisError(
        ANALYSIS_ERROR_CODES.SYNTHESIS_FAILED,
        'Synthesis engine failed',
        AnalysisStage.SYNTHESIS,
        error instanceof Error ? error.message : String(error),
        undefined,
        body?.ticker_symbol,
        body?.analysis_context
      );
    }

    // End pipeline monitoring with error
    if (pipelineMonitor) {
      pipelineMonitor.endStage(AnalysisStage.SYNTHESIS, undefined, analysisError);
      
      // Record performance metrics for failed analysis
      const summary = pipelineMonitor.getSummary();
      AnalysisPerformanceMonitor.recordAnalysis(
        analysisError.ticker || 'unknown',
        analysisError.analysisContext || 'investment',
        duration,
        false,
        summary.stageTimings
      );
    }

    logger.error('Synthesis failed', analysisError, {
      ticker: analysisError.ticker,
      context: analysisError.analysisContext,
      stage: analysisError.stage,
      duration
    });

    requestMonitor.end(
      analysisError.statusCode || 500,
      analysisError.code,
      { duration, stage: analysisError.stage }
    );

    return createErrorHttpResponse(analysisError, requestId);
  }
};

// Create and serve the request handler
const handler = createRequestHandler(handleSynthesis, ['POST']);

serve(handler);  /*
*
   * Calculate optimal entry price based on analysis and context
   */
  private calculateEntryPrice(
    currentPrice: number,
    synthesisScore: number,
    supportResistance: { support: number[]; resistance: number[] },
    volatility: number,
    analysisContext: 'investment' | 'trading'
  ): number {
    let entryPrice = currentPrice;

    // Determine if this is a buy or sell signal
    const isBuySignal = synthesisScore > 50;

    if (isBuySignal) {
      // For buy signals, look for optimal entry points
      if (analysisContext === 'trading') {
        // For trading, be more aggressive with entries
        if (synthesisScore > 75) {
          // Strong signal - enter at market or slight premium
          entryPrice = currentPrice * (1 + volatility * 0.1);
        } else if (synthesisScore > 60) {
          // Moderate signal - wait for slight pullback
          entryPrice = currentPrice * (1 - volatility * 0.2);
        } else {
          // Weak signal - wait for better entry
          entryPrice = currentPrice * (1 - volatility * 0.5);
        }
      } else {
        // For investment, be more patient with entries
        if (synthesisScore > 80) {
          // Very strong signal - enter at market
          entryPrice = currentPrice;
        } else if (synthesisScore > 65) {
          // Good signal - wait for small pullback
          entryPrice = currentPrice * (1 - volatility * 0.3);
        } else {
          // Moderate signal - wait for better entry
          entryPrice = currentPrice * (1 - volatility * 0.6);
        }
      }

      // Adjust based on support levels
      const nearestSupport = this.findNearestLevel(currentPrice, supportResistance.support, 'below');
      if (nearestSupport && nearestSupport > entryPrice * 0.95) {
        // If there's strong support nearby, adjust entry to just above it
        entryPrice = Math.max(entryPrice, nearestSupport * 1.005);
      }

    } else {
      // For sell signals (short positions or exit signals)
      if (analysisContext === 'trading') {
        // For trading, consider short entries
        if (synthesisScore < 25) {
          // Strong sell signal
          entryPrice = currentPrice * (1 - volatility * 0.1);
        } else if (synthesisScore < 40) {
          // Moderate sell signal
          entryPrice = currentPrice * (1 + volatility * 0.2);
        } else {
          // Weak sell signal
          entryPrice = currentPrice * (1 + volatility * 0.5);
        }
      } else {
        // For investment, focus on exit prices rather than short entries
        entryPrice = currentPrice; // Exit at market for long positions
      }

      // Adjust based on resistance levels
      const nearestResistance = this.findNearestLevel(currentPrice, supportResistance.resistance, 'above');
      if (nearestResistance && nearestResistance < entryPrice * 1.05) {
        // If there's strong resistance nearby, adjust entry to just below it
        entryPrice = Math.min(entryPrice, nearestResistance * 0.995);
      }
    }

    // Ensure entry price is reasonable (within 10% of current price for safety)
    const maxDeviation = currentPrice * 0.1;
    entryPrice = Math.max(currentPrice - maxDeviation, Math.min(currentPrice + maxDeviation, entryPrice));

    return Math.round(entryPrice * 100) / 100; // Round to cents
  }

  /**
   * Calculate stop loss based on volatility and support/resistance
   */
  private calculateStopLoss(
    entryPrice: number,
    currentPrice: number,
    supportResistance: { support: number[]; resistance: number[] },
    volatility: number,
    analysisContext: 'investment' | 'trading',
    synthesisScore: number
  ): number {
    const isBuySignal = synthesisScore > 50;
    let stopLoss: number;

    if (isBuySignal) {
      // For buy positions, stop loss is below entry
      if (analysisContext === 'trading') {
        // Tighter stops for trading
        const baseStopDistance = volatility * 2.0; // Simplified since we don't have tradingTimeframe
        stopLoss = entryPrice * (1 - baseStopDistance);
      } else {
        // Wider stops for investment
        const baseStopDistance = volatility * 3.0;
        stopLoss = entryPrice * (1 - baseStopDistance);
      }

      // Adjust based on support levels
      const nearestSupport = this.findNearestLevel(entryPrice, supportResistance.support, 'below');
      if (nearestSupport && nearestSupport > stopLoss) {
        // Place stop just below nearest support
        stopLoss = nearestSupport * 0.995;
      }

      // Ensure stop loss is not too close to entry (minimum 1% for trading, 2% for investment)
      const minStopDistance = analysisContext === 'trading' ? 0.01 : 0.02;
      stopLoss = Math.min(stopLoss, entryPrice * (1 - minStopDistance));

    } else {
      // For sell positions (short), stop loss is above entry
      if (analysisContext === 'trading') {
        const baseStopDistance = volatility * 2.0;
        stopLoss = entryPrice * (1 + baseStopDistance);
      } else {
        // For investment context, this would be an exit signal, so no traditional stop loss
        stopLoss = entryPrice * 1.05; // 5% above as a safety measure
      }

      // Adjust based on resistance levels
      const nearestResistance = this.findNearestLevel(entryPrice, supportResistance.resistance, 'above');
      if (nearestResistance && nearestResistance < stopLoss) {
        // Place stop just above nearest resistance
        stopLoss = nearestResistance * 1.005;
      }
    }

    return Math.round(stopLoss * 100) / 100; // Round to cents
  }  /**
  
 * Calculate multiple take profit levels
   */
  private calculateTakeProfitLevels(
    entryPrice: number,
    currentPrice: number,
    supportResistance: { support: number[]; resistance: number[] },
    volatility: number,
    analysisContext: 'investment' | 'trading',
    synthesisScore: number
  ): number[] {
    const isBuySignal = synthesisScore > 50;
    const takeProfitLevels: number[] = [];

    if (isBuySignal) {
      // For buy positions, take profits above entry
      if (analysisContext === 'trading') {
        // Multiple quick profit levels for trading
        const baseTargets = [
          entryPrice * (1 + volatility * 2), // First target: 2x volatility
          entryPrice * (1 + volatility * 4), // Second target: 4x volatility
          entryPrice * (1 + volatility * 6)  // Third target: 6x volatility
        ];
        takeProfitLevels.push(...baseTargets);
      } else {
        // Longer-term targets for investment
        const baseTargets = [
          entryPrice * (1 + volatility * 5),  // First target: 5x volatility
          entryPrice * (1 + volatility * 10), // Second target: 10x volatility
          entryPrice * (1 + volatility * 15)  // Third target: 15x volatility
        ];
        takeProfitLevels.push(...baseTargets);
      }

      // Adjust based on resistance levels
      supportResistance.resistance.forEach((resistance, index) => {
        if (resistance > entryPrice && index < takeProfitLevels.length) {
          // Adjust take profit to just below resistance
          takeProfitLevels[index] = Math.min(takeProfitLevels[index], resistance * 0.995);
        }
      });

    } else {
      // For sell positions (short), take profits below entry
      if (analysisContext === 'trading') {
        const baseTargets = [
          entryPrice * (1 - volatility * 2), // First target
          entryPrice * (1 - volatility * 4), // Second target
          entryPrice * (1 - volatility * 6)  // Third target
        ];
        takeProfitLevels.push(...baseTargets);
      } else {
        // For investment, these would be exit levels
        takeProfitLevels.push(entryPrice * 0.95); // Single exit at 5% below
      }

      // Adjust based on support levels
      supportResistance.support.forEach((support, index) => {
        if (support < entryPrice && index < takeProfitLevels.length) {
          // Adjust take profit to just above support
          takeProfitLevels[index] = Math.max(takeProfitLevels[index], support * 1.005);
        }
      });
    }

    // Ensure take profit levels are reasonable and properly ordered
    return takeProfitLevels
      .filter(level => level > 0)
      .map(level => Math.round(level * 100) / 100)
      .sort((a, b) => isBuySignal ? a - b : b - a) // Ascending for buy, descending for sell
      .slice(0, 3); // Maximum 3 levels
  }

  /**
   * Find the nearest support or resistance level
   */
  private findNearestLevel(
    price: number, 
    levels: number[], 
    direction: 'above' | 'below'
  ): number | null {
    const filteredLevels = levels.filter(level => 
      direction === 'above' ? level > price : level < price
    );

    if (filteredLevels.length === 0) return null;

    return filteredLevels.reduce((nearest, current) => {
      const nearestDistance = Math.abs(price - nearest);
      const currentDistance = Math.abs(price - current);
      return currentDistance < nearestDistance ? current : nearest;
    });
  }

  /**
   * Calculate risk-reward ratio
   */
  private calculateRiskRewardRatio(
    entryPrice: number,
    stopLoss: number,
    takeProfitLevels: number[]
  ): number {
    if (takeProfitLevels.length === 0) return 0;

    const risk = Math.abs(entryPrice - stopLoss);
    const reward = Math.abs(takeProfitLevels[0] - entryPrice); // Use first take profit level

    return risk > 0 ? reward / risk : 0;
  }

  /**
   * Calculate recommended position size as percentage of portfolio
   */
  private calculatePositionSize(
    entryPrice: number,
    stopLoss: number,
    synthesisScore: number,
    volatility: number
  ): number {
    // Base position size on Kelly Criterion principles
    const risk = Math.abs(entryPrice - stopLoss) / entryPrice;
    
    // Convert synthesis score to win probability (50-95% range)
    const winProbability = 0.5 + (synthesisScore / 100) * 0.45;
    
    // Estimate average win/loss ratio based on volatility
    const avgWinLossRatio = 1 + (volatility * 10); // Higher volatility = higher potential returns
    
    // Kelly formula: f = (bp - q) / b
    // where b = odds received on the wager, p = probability of winning, q = probability of losing
    const kellyFraction = (avgWinLossRatio * winProbability - (1 - winProbability)) / avgWinLossRatio;
    
    // Apply conservative scaling (use 25% of Kelly recommendation)
    let positionSize = Math.max(0, kellyFraction * 0.25);
    
    // Cap position size based on risk level
    if (risk > 0.05) positionSize *= 0.5; // Reduce size for high-risk trades
    if (risk > 0.1) positionSize *= 0.5;  // Further reduce for very high-risk trades
    
    // Ensure reasonable bounds (1% to 15% of portfolio)
    return Math.max(0.01, Math.min(0.15, positionSize));
  }  /**

   * Calculate trade confidence based on multiple factors
   */
  private calculateTradeConfidence(
    technicalResult: TechnicalAnalysisOutput,
    supportResistance: { support: number[]; resistance: number[] },
    volatility: number,
    synthesisScore: number
  ): number {
    let confidence = technicalResult.confidence || 0.8;

    // Adjust based on synthesis score strength
    if (synthesisScore > 80 || synthesisScore < 20) {
      confidence += 0.1; // Strong directional signal
    } else if (synthesisScore > 60 || synthesisScore < 40) {
      confidence += 0.05; // Moderate directional signal
    } else {
      confidence -= 0.1; // Weak/neutral signal
    }

    // Adjust based on support/resistance clarity
    const totalLevels = supportResistance.support.length + supportResistance.resistance.length;
    if (totalLevels >= 5) {
      confidence += 0.05; // Clear support/resistance structure
    } else if (totalLevels < 2) {
      confidence -= 0.1; // Unclear support/resistance
    }

    // Adjust based on volatility
    // For trading, moderate volatility is good
    if (volatility > 0.01 && volatility < 0.05) {
      confidence += 0.05;
    } else if (volatility > 0.1) {
      confidence -= 0.15; // Too volatile
    }

    // Ensure confidence is within bounds
    return Math.max(0.1, Math.min(0.95, confidence));
  }

  /**
   * Generate methodology explanation
   */
  private generateTradeMethodologyExplanation(
    analysisContext: 'investment' | 'trading',
    tradingTimeframe?: string,
    volatility?: number,
    supportResistance?: { support: number[]; resistance: number[] }
  ): string {
    let methodology = `Trade parameters calculated using ${analysisContext}-optimized algorithms. `;
    
    if (analysisContext === 'trading' && tradingTimeframe) {
      methodology += `Timeframe-specific adjustments applied for ${tradingTimeframe} trading. `;
    }

    methodology += `Entry price determined using synthesis score strength and market structure analysis. `;
    methodology += `Stop loss calculated using ATR-based volatility (${(volatility! * 100).toFixed(1)}%) `;
    
    if (supportResistance && (supportResistance.support.length > 0 || supportResistance.resistance.length > 0)) {
      methodology += `and ${supportResistance.support.length} support + ${supportResistance.resistance.length} resistance levels. `;
    }
    
    methodology += `Take profit levels set using risk-reward optimization and technical resistance analysis. `;
    methodology += `Position sizing based on Kelly Criterion with conservative scaling for risk management.`;

    return methodology;
  }

  /**
   * Calculate comprehensive risk metrics
   */
  private calculateRiskMetrics(
    entryPrice: number,
    stopLoss: number,
    takeProfitLevels: number[],
    volatility: number,
    synthesisScore: number
  ): {
    max_drawdown_risk: number;
    expected_return: number;
    sharpe_estimate: number;
  } {
    const risk = Math.abs(entryPrice - stopLoss) / entryPrice;
    const maxDrawdownRisk = risk * 1.5; // Estimate maximum potential drawdown

    // Calculate expected return based on take profit levels and probabilities
    const avgTakeProfit = takeProfitLevels.length > 0 
      ? takeProfitLevels.reduce((sum, level) => sum + level, 0) / takeProfitLevels.length
      : entryPrice;
    
    const potentialReturn = Math.abs(avgTakeProfit - entryPrice) / entryPrice;
    const winProbability = 0.5 + (synthesisScore / 100) * 0.45;
    const expectedReturn = (potentialReturn * winProbability) - (risk * (1 - winProbability));

    // Estimate Sharpe ratio (assuming risk-free rate of 3%)
    const riskFreeRate = 0.03;
    const excessReturn = expectedReturn - riskFreeRate;
    const sharpeEstimate = volatility > 0 ? excessReturn / volatility : 0;

    return {
      max_drawdown_risk: maxDrawdownRisk,
      expected_return: expectedReturn,
      sharpe_estimate: sharpeEstimate
    };
  }

  /**
   * Extract current price from technical analysis data
   */
  private extractCurrentPrice(technicalResult: TechnicalAnalysisOutput): number {
    const trendIndicators = technicalResult.details?.trend_indicators || {};
    
    // Try to get current price from various technical indicators
    if (trendIndicators.sma_20) {
      return trendIndicators.sma_20;
    }
    
    if (trendIndicators.sma_50) {
      return trendIndicators.sma_50;
    }
    
    if (trendIndicators.ema_20) {
      return trendIndicators.ema_20;
    }
    
    // Fallback to a reasonable default (this would be replaced with actual current price in real implementation)
    return 100;
  }

  /**
   * Validate fundamental-only synthesis input
   */
  private validateFundamentalInput(
    fundamentalResult: FundamentalAnalysisOutput,
    ticker: string,
    analysisContext: 'investment' | 'trading'
  ): void {
    if (!ticker || typeof ticker !== 'string') {
      throw new AppError(ERROR_CODES.INVALID_PARAMETER, 'Invalid ticker symbol');
    }

    if (!['investment', 'trading'].includes(analysisContext)) {
      throw new AppError(ERROR_CODES.INVALID_PARAMETER, 'Invalid analysis context');
    }

    if (!fundamentalResult || typeof fundamentalResult.score !== 'number') {
      throw new AppError(ERROR_CODES.INVALID_PARAMETER, 'Invalid fundamental analysis result');
    }

    if (fundamentalResult.score < 0 || fundamentalResult.score > 100) {
      throw new AppError(ERROR_CODES.INVALID_PARAMETER, 'Fundamental analysis score must be between 0 and 100');
    }

    if (!fundamentalResult.factors || !Array.isArray(fundamentalResult.factors)) {
      throw new AppError(ERROR_CODES.INVALID_PARAMETER, 'Fundamental analysis factors are required');
    }
  }

  /**
   * Generate factor analysis from fundamental analysis only
   */
  private generateFundamentalFactorAnalysis(
    fundamentalResult: FundamentalAnalysisOutput,
    analysisContext: 'investment' | 'trading'
  ): FactorAnalysis {
    const factors = fundamentalResult.factors;
    const convergenceFactors: ConvergenceFactor[] = [];
    const divergenceFactors: DivergenceFactor[] = [];

    console.log(`Analyzing ${factors.length} fundamental factors`);

    // Group factors by sentiment
    const positiveFactors = factors.filter(f => f.type === 'positive');
    const negativeFactors = factors.filter(f => f.type === 'negative');

    // Generate convergence factors from positive signals
    if (positiveFactors.length >= 2) {
      const strongPositive = positiveFactors.filter(f => f.impact === 'high');
      const mediumPositive = positiveFactors.filter(f => f.impact === 'medium');

      if (strongPositive.length >= 2) {
        convergenceFactors.push({
          category: 'fundamental_strength',
          description: `Multiple strong positive fundamental indicators (${strongPositive.length} factors)`,
          weight: 0.8,
          supporting_analyses: ['fundamental'],
          metadata: {
            factor_count: strongPositive.length,
            categories: [...new Set(strongPositive.map(f => f.category))],
            confidence: 0.9
          }
        });
      }

      if (positiveFactors.length >= 3) {
        const categories = [...new Set(positiveFactors.map(f => f.category))];
        if (categories.length >= 2) {
          convergenceFactors.push({
            category: 'broad_fundamental_support',
            description: `Positive signals across multiple fundamental categories (${categories.join(', ')})`,
            weight: 0.7,
            supporting_analyses: ['fundamental'],
            metadata: {
              categories,
              factor_count: positiveFactors.length,
              confidence: 0.8
            }
          });
        }
      }
    }

    // Generate convergence factors from negative signals
    if (negativeFactors.length >= 2) {
      const strongNegative = negativeFactors.filter(f => f.impact === 'high');

      if (strongNegative.length >= 2) {
        convergenceFactors.push({
          category: 'fundamental_weakness',
          description: `Multiple strong negative fundamental indicators (${strongNegative.length} factors)`,
          weight: 0.8,
          supporting_analyses: ['fundamental'],
          metadata: {
            factor_count: strongNegative.length,
            categories: [...new Set(strongNegative.map(f => f.category))],
            confidence: 0.9
          }
        });
      }
    }

    // Generate divergence factors from mixed signals
    if (positiveFactors.length > 0 && negativeFactors.length > 0) {
      const positiveWeight = positiveFactors.reduce((sum, f) => sum + f.weight, 0);
      const negativeWeight = negativeFactors.reduce((sum, f) => sum + f.weight, 0);
      const weightDifference = Math.abs(positiveWeight - negativeWeight);

      if (weightDifference < 0.3) {
        divergenceFactors.push({
          category: 'mixed_signals',
          description: `Conflicting fundamental signals with similar weights`,
          weight: 0.6,
          conflicting_analyses: ['fundamental'],
          metadata: {
            positive_factors: positiveFactors.length,
            negative_factors: negativeFactors.length,
            weight_difference: weightDifference,
            confidence: 0.7
          }
        });
      }
    }

    // Context-specific factor analysis
    if (analysisContext === 'investment') {
      // For investment, look for quality and growth convergence
      const qualityFactors = factors.filter(f => f.category === 'quality' && f.type === 'positive');
      const growthFactors = factors.filter(f => f.category === 'growth' && f.type === 'positive');

      if (qualityFactors.length > 0 && growthFactors.length > 0) {
        convergenceFactors.push({
          category: 'quality_growth_alignment',
          description: `Quality and growth factors align for long-term investment potential`,
          weight: 0.7,
          supporting_analyses: ['fundamental'],
          metadata: {
            quality_factors: qualityFactors.length,
            growth_factors: growthFactors.length,
            confidence: 0.8
          }
        });
      }
    } else {
      // For trading, look for momentum and valuation convergence
      const valuationFactors = factors.filter(f => f.category === 'valuation' && f.type === 'positive');
      const profitabilityFactors = factors.filter(f => f.category === 'profitability' && f.type === 'positive');

      if (valuationFactors.length > 0 && profitabilityFactors.length > 0) {
        convergenceFactors.push({
          category: 'value_profitability_alignment',
          description: `Valuation and profitability factors support trading opportunity`,
          weight: 0.6,
          supporting_analyses: ['fundamental'],
          metadata: {
            valuation_factors: valuationFactors.length,
            profitability_factors: profitabilityFactors.length,
            confidence: 0.7
          }
        });
      }
    }

    // Calculate weights
    const totalConvergenceWeight = convergenceFactors.reduce((sum, f) => sum + (f.weight * (f.metadata?.confidence || 1)), 0);
    const totalDivergenceWeight = divergenceFactors.reduce((sum, f) => sum + (f.weight * (f.metadata?.confidence || 1)), 0);
    const netSentiment = totalConvergenceWeight - totalDivergenceWeight;

    console.log(`Fundamental factor analysis: ${convergenceFactors.length} convergence, ${divergenceFactors.length} divergence factors`);

    return {
      convergenceFactors,
      divergenceFactors,
      totalConvergenceWeight,
      totalDivergenceWeight,
      netSentiment
    };
  }

  /**
   * Calculate synthesis score based only on fundamental analysis
   */
  private calculateFundamentalSynthesisScore(
    fundamentalResult: FundamentalAnalysisOutput,
    factorAnalysis: FactorAnalysis,
    analysisContext: 'investment' | 'trading'
  ): number {
    // Base score from fundamental analysis
    let baseScore = fundamentalResult.score;

    // Apply factor analysis adjustments
    const factorAdjustment = this.calculateFactorAdjustment(factorAnalysis);
    
    // Apply context-specific adjustments
    let contextAdjustment = 0;
    if (analysisContext === 'investment') {
      // For investment, boost score if quality and growth factors are strong
      const qualityFactors = fundamentalResult.factors.filter(f => f.category === 'quality' && f.type === 'positive');
      const growthFactors = fundamentalResult.factors.filter(f => f.category === 'growth' && f.type === 'positive');
      
      if (qualityFactors.length >= 1 && growthFactors.length >= 1) {
        contextAdjustment += 5;
      }
      
      // Penalize high risk factors for investment
      const riskFactors = fundamentalResult.factors.filter(f => f.category === 'leverage' && f.type === 'negative');
      if (riskFactors.length >= 2) {
        contextAdjustment -= 3;
      }
    } else {
      // For trading, boost score if valuation is attractive
      const valuationFactors = fundamentalResult.factors.filter(f => f.category === 'valuation' && f.type === 'positive');
      if (valuationFactors.length >= 1) {
        contextAdjustment += 3;
      }
      
      // Boost for strong profitability in trading
      const profitabilityFactors = fundamentalResult.factors.filter(f => f.category === 'profitability' && f.type === 'positive');
      if (profitabilityFactors.length >= 2) {
        contextAdjustment += 4;
      }
    }

    // Apply confidence adjustment
    const confidence = fundamentalResult.confidence || 0.8;
    const confidenceAdjustment = (confidence - 0.8) * 10; // -2 to +2 adjustment

    const finalScore = baseScore + factorAdjustment + contextAdjustment + confidenceAdjustment;
    
    return Math.max(0, Math.min(100, Math.round(finalScore)));
  }

  /**
   * Calculate factor adjustment for synthesis score
   */
  private calculateFactorAdjustment(factorAnalysis: FactorAnalysis): number {
    const netSentiment = factorAnalysis.netSentiment;
    
    // Convert net sentiment to score adjustment (-10 to +10)
    const maxAdjustment = 10;
    const sentimentRange = 2; // Assuming net sentiment typically ranges from -2 to +2
    
    const adjustment = Math.max(-maxAdjustment, Math.min(maxAdjustment, (netSentiment / sentimentRange) * maxAdjustment));
    
    return adjustment;
  }

  /**
   * Calculate confidence for fundamental-only synthesis
   */
  private calculateFundamentalConfidence(
    fundamentalResult: FundamentalAnalysisOutput,
    factorAnalysis: FactorAnalysis
  ): number {
    let confidence = fundamentalResult.confidence || 0.8;

    // Adjust based on data sources
    if (fundamentalResult.data_sources) {
      const realDataSources = fundamentalResult.data_sources.filter(source => 
        !source.includes('Generated') && !source.includes('Mock')
      );
      
      if (realDataSources.length >= 2) {
        confidence += 0.1;
      } else if (realDataSources.length === 0) {
        confidence -= 0.2;
      }
    }

    // Adjust based on factor analysis depth
    const totalFactors = factorAnalysis.convergenceFactors.length + factorAnalysis.divergenceFactors.length;
    if (totalFactors >= 3) {
      confidence += 0.05;
    } else if (totalFactors < 2) {
      confidence -= 0.1;
    }

    // Adjust based on factor consistency
    if (factorAnalysis.convergenceFactors.length > 0 && factorAnalysis.divergenceFactors.length === 0) {
      confidence += 0.05; // Consistent signals
    } else if (factorAnalysis.divergenceFactors.length > factorAnalysis.convergenceFactors.length) {
      confidence -= 0.05; // Conflicting signals
    }

    return Math.max(0.3, Math.min(0.95, confidence));
  }

  /**
   * Generate analysis report for fundamental-only synthesis
   */
  private generateFundamentalAnalysisReport(
    fundamentalResult: FundamentalAnalysisOutput,
    factorAnalysis: FactorAnalysis,
    synthesisScore: number,
    confidence: number,
    ticker: string,
    analysisContext: 'investment' | 'trading'
  ): AnalysisReport {
    const recommendation = getRecommendation(synthesisScore, analysisContext);
    
    return {
      ticker_symbol: ticker,
      analysis_timestamp: new Date().toISOString(),
      synthesis_score: synthesisScore,
      recommendation,
      confidence_level: confidence,
      analysis_context: analysisContext,
      key_insights: this.generateFundamentalKeyInsights(fundamentalResult, factorAnalysis),
      risk_factors: this.extractRiskFactors(fundamentalResult.factors),
      opportunities: this.extractOpportunities(fundamentalResult.factors),
      data_quality: {
        sources_used: fundamentalResult.data_sources || ['fundamental'],
        completeness_score: this.calculateDataCompleteness(fundamentalResult),
        reliability_assessment: confidence > 0.8 ? 'High' : confidence > 0.6 ? 'Medium' : 'Low'
      },
      methodology_notes: `Analysis based on fundamental data only. ${analysisContext === 'investment' ? 'Long-term investment focus with emphasis on quality and growth metrics.' : 'Trading focus with emphasis on valuation and profitability metrics.'}`
    };
  }

  /**
   * Generate key insights from fundamental analysis
   */
  private generateFundamentalKeyInsights(
    fundamentalResult: FundamentalAnalysisOutput,
    factorAnalysis: FactorAnalysis
  ): string[] {
    const insights: string[] = [];

    // Score-based insights
    if (fundamentalResult.score >= 75) {
      insights.push('Strong fundamental performance across multiple metrics');
    } else if (fundamentalResult.score <= 25) {
      insights.push('Weak fundamental performance requires careful consideration');
    } else if (fundamentalResult.score >= 50) {
      insights.push('Mixed fundamental signals with some positive indicators');
    }

    // Factor-based insights
    if (factorAnalysis.convergenceFactors.length > 0) {
      const topConvergence = factorAnalysis.convergenceFactors[0];
      insights.push(`Key strength: ${topConvergence.description}`);
    }

    if (factorAnalysis.divergenceFactors.length > 0) {
      const topDivergence = factorAnalysis.divergenceFactors[0];
      insights.push(`Key concern: ${topDivergence.description}`);
    }

    // Data quality insights
    if (fundamentalResult.data_sources) {
      const realSources = fundamentalResult.data_sources.filter(s => !s.includes('Generated'));
      if (realSources.length > 0) {
        insights.push(`Analysis based on real market data from ${realSources.join(', ')}`);
      }
    }

    return insights;
  }

  /**
   * Generate basic trade parameters for fundamental-only analysis
   */
  private generateBasicTradeParameters(
    fundamentalResult: FundamentalAnalysisOutput,
    synthesisScore: number,
    ticker: string,
    analysisContext: 'investment' | 'trading'
  ): TradeParametersOutput {
    // Extract current price from fundamental data if available
    const currentPrice = this.extractPriceFromFundamental(fundamentalResult) || 100; // Default fallback

    // Basic entry price calculation
    const entryPrice = currentPrice;

    // Basic stop loss (5-10% based on context)
    const stopLossPercent = analysisContext === 'investment' ? 0.1 : 0.05;
    const stopLoss = entryPrice * (1 - stopLossPercent);

    // Basic take profit levels
    const takeProfitPercent1 = analysisContext === 'investment' ? 0.15 : 0.08;
    const takeProfitPercent2 = analysisContext === 'investment' ? 0.25 : 0.12;
    const takeProfitLevels = [
      entryPrice * (1 + takeProfitPercent1),
      entryPrice * (1 + takeProfitPercent2)
    ];

    // Risk-reward ratio
    const riskRewardRatio = (takeProfitLevels[0] - entryPrice) / (entryPrice - stopLoss);

    // Position size recommendation based on synthesis score and confidence
    const basePositionSize = analysisContext === 'investment' ? 0.05 : 0.02; // 5% for investment, 2% for trading
    const scoreMultiplier = synthesisScore / 100;
    const confidenceMultiplier = fundamentalResult.confidence || 0.8;
    const positionSize = basePositionSize * scoreMultiplier * confidenceMultiplier;

    return {
      entry_price: Math.round(entryPrice * 100) / 100,
      stop_loss: Math.round(stopLoss * 100) / 100,
      take_profit_levels: takeProfitLevels.map(level => Math.round(level * 100) / 100),
      risk_reward_ratio: Math.round(riskRewardRatio * 100) / 100,
      position_size_recommendation: Math.round(positionSize * 1000) / 10, // As percentage
      confidence: fundamentalResult.confidence || 0.8,
      methodology: `Fundamental-only analysis for ${analysisContext}. Entry at current price with ${stopLossPercent * 100}% stop loss.`,
      metadata: {
        calculation_timestamp: new Date().toISOString(),
        volatility_used: 0.02, // Default volatility assumption
        support_resistance_levels: {
          support: [stopLoss],
          resistance: takeProfitLevels
        },
        risk_metrics: {
          max_drawdown_risk: stopLossPercent,
          expected_return: takeProfitPercent1,
          sharpe_estimate: 1.0 // Basic estimate
        }
      }
    };
  }

  /**
   * Extract current price from fundamental analysis data
   */
  private extractPriceFromFundamental(fundamentalResult: FundamentalAnalysisOutput): number | null {
    // Try to extract price from company info in details
    if (fundamentalResult.details?.company_info?.currentPrice) {
      return fundamentalResult.details.company_info.currentPrice;
    }

    // Try to extract from valuation metrics
    if (fundamentalResult.details?.valuation_metrics?.market_cap && 
        fundamentalResult.details?.company_info?.sharesOutstanding) {
      const marketCap = fundamentalResult.details.valuation_metrics.market_cap;
      const shares = fundamentalResult.details.company_info.sharesOutstanding;
      if (marketCap > 0 && shares > 0) {
        return marketCap / shares;
      }
    }

    return null;
  }

  /**
   * Calculate data completeness score
   */
  private calculateDataCompleteness(fundamentalResult: FundamentalAnalysisOutput): number {
    let completeness = 0.5; // Base score

    // Check for financial statements
    if (fundamentalResult.details?.financial_statements?.length > 0) {
      completeness += 0.2;
    }

    // Check for company info
    if (fundamentalResult.details?.company_info) {
      completeness += 0.1;
    }

    // Check for ratios
    if (fundamentalResult.details?.financial_ratios) {
      completeness += 0.1;
    }

    // Check for growth metrics
    if (fundamentalResult.details?.growth_metrics) {
      completeness += 0.1;
    }

    return Math.min(1.0, completeness);
  }
}