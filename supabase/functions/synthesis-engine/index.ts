// Edge Function for synthesis engine
// Combines fundamental, technical, and ESG analysis results with context-aware weighting

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
  AnalysisReport
} from '../_shared/index.ts';

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
 * Synthesis engine for combining analysis results
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
   * Perform comprehensive synthesis of all analysis results
   * @param input Synthesis input with all analysis results
   * @returns Promise<SynthesisOutput> Combined analysis results
   */
  async synthesize(input: SynthesisInput): Promise<SynthesisOutput> {
    try {
      // Validate input data
      this.validateInput(input);

      // Calculate weighted scores
      const weightedScores = this.calculateWeightedScores(input);

      // Analyze factors for convergence and divergence
      const factorAnalysis = this.analyzeFactors(input);

      // Calculate final synthesis score
      const synthesisScore = this.calculateSynthesisScore(
        weightedScores,
        factorAnalysis,
        input.analysis_context,
        input.trading_timeframe
      );

      // Calculate overall confidence
      const confidence = this.calculateOverallConfidence(input);

      // Generate comprehensive analysis report
      const fullReport = this.generateAnalysisReport(
        input,
        weightedScores,
        factorAnalysis,
        synthesisScore,
        confidence
      );

      return {
        synthesis_score: synthesisScore,
        convergence_factors: factorAnalysis.convergenceFactors,
        divergence_factors: factorAnalysis.divergenceFactors,
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
   * Calculate weighted scores based on analysis context
   */
  private calculateWeightedScores(input: SynthesisInput): WeightedScores {
    const weights = this.config[input.analysis_context];
    
    // Apply timeframe adjustments for trading context
    let adjustedWeights = { ...weights };
    
    if (input.analysis_context === 'trading' && input.trading_timeframe) {
      adjustedWeights = this.adjustWeightsForTimeframe(weights, input.trading_timeframe);
    }

    const fundamentalWeighted = input.fundamental_result.score * adjustedWeights.fundamental;
    const technicalWeighted = input.technical_result.score * adjustedWeights.technical;
    const esgWeighted = input.esg_result.score * adjustedWeights.esg;
    
    const totalWeight = adjustedWeights.fundamental + adjustedWeights.technical + adjustedWeights.esg;
    const rawScore = (fundamentalWeighted + technicalWeighted + esgWeighted) / totalWeight;

    return {
      fundamentalWeighted,
      technicalWeighted,
      esgWeighted,
      totalWeight,
      rawScore
    };
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
   * Analyze factors for convergence and divergence
   */
  private analyzeFactors(input: SynthesisInput): FactorAnalysis {
    const allFactors = [
      ...input.fundamental_result.factors,
      ...input.technical_result.factors,
      ...input.esg_result.factors
    ];

    const convergenceFactors: ConvergenceFactor[] = [];
    const divergenceFactors: DivergenceFactor[] = [];

    // Group factors by sentiment and category
    const positiveFactors = allFactors.filter(f => f.type === 'positive');
    const negativeFactors = allFactors.filter(f => f.type === 'negative');

    // Identify convergence (agreement between analyses)
    const convergenceGroups = this.identifyConvergence(positiveFactors, negativeFactors, input);
    convergenceFactors.push(...convergenceGroups);

    // Identify divergence (disagreement between analyses)
    const divergenceGroups = this.identifyDivergence(input);
    divergenceFactors.push(...divergenceGroups);

    // Calculate weights
    const totalConvergenceWeight = convergenceFactors.reduce((sum, f) => sum + f.weight, 0);
    const totalDivergenceWeight = divergenceFactors.reduce((sum, f) => sum + f.weight, 0);
    
    // Calculate net sentiment
    const netSentiment = totalConvergenceWeight - totalDivergenceWeight;

    return {
      convergenceFactors,
      divergenceFactors,
      totalConvergenceWeight,
      totalDivergenceWeight,
      netSentiment
    };
  }

  /**
   * Identify convergence factors (agreement between analyses)
   */
  private identifyConvergence(
    positiveFactors: AnalysisFactor[],
    negativeFactors: AnalysisFactor[],
    input: SynthesisInput
  ): ConvergenceFactor[] {
    const convergenceFactors: ConvergenceFactor[] = [];

    // Check for strong positive convergence
    const strongPositive = this.checkStrongPositiveConvergence(input);
    if (strongPositive) {
      convergenceFactors.push(strongPositive);
    }

    // Check for strong negative convergence
    const strongNegative = this.checkStrongNegativeConvergence(input);
    if (strongNegative) {
      convergenceFactors.push(strongNegative);
    }

    // Check for thematic convergence
    const thematicConvergence = this.identifyThematicConvergence(positiveFactors, negativeFactors);
    convergenceFactors.push(...thematicConvergence);

    // Check for score alignment
    const scoreAlignment = this.checkScoreAlignment(input);
    if (scoreAlignment) {
      convergenceFactors.push(scoreAlignment);
    }

    return convergenceFactors;
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
   * Identify divergence factors (disagreement between analyses)
   */
  private identifyDivergence(input: SynthesisInput): DivergenceFactor[] {
    const divergenceFactors: DivergenceFactor[] = [];

    // Check for score divergence
    const scoreDivergence = this.checkScoreDivergence(input);
    if (scoreDivergence) {
      divergenceFactors.push(scoreDivergence);
    }

    // Check for conflicting signals
    const conflictingSignals = this.identifyConflictingSignals(input);
    divergenceFactors.push(...conflictingSignals);

    // Check for confidence conflicts
    const confidenceConflicts = this.checkConfidenceConflicts(input);
    if (confidenceConflicts) {
      divergenceFactors.push(confidenceConflicts);
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
   * Calculate final synthesis score
   */
  private calculateSynthesisScore(
    weightedScores: WeightedScores,
    factorAnalysis: FactorAnalysis,
    analysisContext: 'investment' | 'trading',
    tradingTimeframe?: string
  ): number {
    let score = weightedScores.rawScore;

    // Apply convergence/divergence adjustments
    const netSentimentImpact = factorAnalysis.netSentiment * 5; // Scale factor
    score += netSentimentImpact;

    // Apply context-specific adjustments
    if (analysisContext === 'trading') {
      // For trading, apply timeframe-specific adjustments
      if (tradingTimeframe) {
        const timeframeAdjustment = this.getTimeframeAdjustment(tradingTimeframe);
        score *= timeframeAdjustment;
      }
    }

    // Ensure score is within valid range
    return Math.round(Math.max(0, Math.min(100, score)));
  }

  /**
   * Get timeframe-specific score adjustment
   */
  private getTimeframeAdjustment(timeframe: string): number {
    const adjustments: Record<string, number> = {
      '1D': 0.95, // Slightly conservative for very short-term
      '1W': 0.98,
      '1M': 1.0,
      '3M': 1.02,
      '6M': 1.03,
      '1Y': 1.05  // Slightly optimistic for longer-term
    };

    return adjustments[timeframe] || 1.0;
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
}

/**
 * Main request handler for synthesis engine
 */
const handleSynthesis = async (request: Request, requestId: string): Promise<Response> => {
  try {
    // Parse and validate request body
    const body = await parseJsonBody(request);
    
    // Validate required fields
    const requiredFields = [
      'ticker_symbol',
      'analysis_context',
      'fundamental_result',
      'technical_result',
      'esg_result'
    ];

    for (const field of requiredFields) {
      if (!body[field]) {
        throw new AppError(
          ERROR_CODES.MISSING_PARAMETER,
          `Missing required parameter: ${field}`
        );
      }
    }

    const synthesisInput: SynthesisInput = {
      ticker_symbol: body.ticker_symbol,
      analysis_context: body.analysis_context,
      trading_timeframe: body.trading_timeframe,
      fundamental_result: body.fundamental_result,
      technical_result: body.technical_result,
      esg_result: body.esg_result
    };

    console.log(`Starting synthesis for ${synthesisInput.ticker_symbol} (${synthesisInput.analysis_context}) - Request ${requestId}`);

    // Perform synthesis
    const synthesisEngine = new SynthesisEngine();
    const result = await synthesisEngine.synthesize(synthesisInput);

    console.log(`Synthesis completed for ${synthesisInput.ticker_symbol} - Score: ${result.synthesis_score} - Request ${requestId}`);

    return createSuccessHttpResponse(result, requestId);

  } catch (error) {
    console.error(`Synthesis failed for request ${requestId}:`, error);
    return createErrorHttpResponse(error, requestId);
  }
};

// Create and serve the request handler
const handler = createRequestHandler(handleSynthesis, ['POST']);

serve(handler);