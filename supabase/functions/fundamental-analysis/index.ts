// Edge Function for fundamental analysis of stocks
// Enhanced with real data integration via Google API Client
// Analyzes financial statements, ratios, and company fundamentals

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  createRequestHandler,
  parseJsonBody,
  createSuccessHttpResponse,
  createErrorHttpResponse,
  AppError,
  ERROR_CODES,
  FundamentalAnalysisInput,
  FundamentalAnalysisOutput,
  AnalysisFactor,
  createLogger
} from '../_shared/index.ts';

/**
 * Fundamental analysis engine with real data integration
 */
class FundamentalAnalysisEngine {
  /**
   * Perform enhanced comprehensive fundamental analysis with real data
   * @param ticker Stock ticker symbol
   * @param apiKey Google API key for external calls
   * @param analysisContext Investment or trading context
   * @returns Promise<FundamentalAnalysisOutput> Analysis results
   */
  static async analyze(
    ticker: string,
    apiKey: string,
    analysisContext: 'investment' | 'trading'
  ): Promise<FundamentalAnalysisOutput> {
    const logger = createLogger('fundamental-analysis-engine');

    try {
      logger.info(`Starting enhanced fundamental analysis for ${ticker} (${analysisContext})`);
      
      // Create Google API client for real data fetching
      const { createGoogleApiClient } = await import('../_shared/services/googleApiService.ts');
      const googleApiClient = createGoogleApiClient(apiKey, logger);

      // Fetch comprehensive fundamental data using Google API client
      const fundamentalData = await googleApiClient.getFundamentalData(ticker);

      logger.info(`Real fundamental data retrieved for ${ticker}`, {
        dataSources: fundamentalData.dataSources,
        statementsCount: fundamentalData.financialStatements.length,
        hasCompanyInfo: !!fundamentalData.companyInfo
      });

      // Use the real data from Google API client
      const company = fundamentalData.companyInfo;
      const statements = fundamentalData.financialStatements;
      const ratios = fundamentalData.financialRatios;
      const growth = fundamentalData.growthMetrics;
      const quality = fundamentalData.qualityIndicators;

      // Generate comprehensive analysis factors using real data
      const factors = this.generateRealDataAnalysisFactors(
        ratios,
        growth,
        quality,
        company,
        statements,
        analysisContext,
        ticker
      );

      // Calculate sophisticated overall score based on real data
      const score = this.calculateRealDataScore(factors, ratios, growth, analysisContext);
      
      // Calculate enhanced confidence based on real data quality
      const confidence = this.calculateDataQualityConfidence(
        fundamentalData.dataSources,
        statements.length,
        company,
        factors
      );

      logger.info(`Fundamental analysis completed for ${ticker}`, {
        score,
        confidence: confidence.toFixed(2),
        dataSources: fundamentalData.dataSources,
        factorsCount: factors.length
      });

      return {
        score,
        factors,
        details: {
          financial_ratios: ratios,
          growth_metrics: growth,
          quality_indicators: quality,
          company_info: company,
          financial_statements: statements,
          valuation_metrics: this.calculateValuationMetrics(ratios, company, statements),
          competitive_position: this.calculateCompetitivePosition(company, ratios, growth)
        },
        confidence,
        data_sources: fundamentalData.dataSources
      };

    } catch (error) {
      console.error(`Fundamental analysis failed for ${ticker}:`, error);
      
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError(
        ERROR_CODES.PROCESSING_ERROR,
        'Failed to perform fundamental analysis',
        error instanceof Error ? error.message : String(error)
      );
    }
  }
  /**
  
 * Generate analysis factors using real financial data
   */
  private static generateRealDataAnalysisFactors(
    ratios: any,
    growth: any,
    quality: any,
    company: any,
    statements: any[],
    analysisContext: 'investment' | 'trading',
    ticker: string
  ): AnalysisFactor[] {
    const factors: AnalysisFactor[] = [];

    // Profitability factors based on real data
    if (ratios.profitability.roe > 15) {
      factors.push({
        type: 'positive',
        category: 'profitability',
        description: `Strong ROE of ${ratios.profitability.roe.toFixed(1)}% indicates efficient use of shareholder equity`,
        impact: ratios.profitability.roe > 20 ? 'high' : 'medium',
        confidence: 0.9,
        weight: analysisContext === 'investment' ? 0.8 : 0.6
      });
    } else if (ratios.profitability.roe < 5) {
      factors.push({
        type: 'negative',
        category: 'profitability',
        description: `Low ROE of ${ratios.profitability.roe.toFixed(1)}% suggests poor equity utilization`,
        impact: 'high',
        confidence: 0.9,
        weight: analysisContext === 'investment' ? 0.8 : 0.6
      });
    }

    // Growth factors based on real data
    if (growth.revenueGrowth > 10) {
      factors.push({
        type: 'positive',
        category: 'growth',
        description: `Strong revenue growth of ${growth.revenueGrowth.toFixed(1)}% year-over-year`,
        impact: growth.revenueGrowth > 20 ? 'high' : 'medium',
        confidence: 0.85,
        weight: analysisContext === 'trading' ? 0.9 : 0.7
      });
    } else if (growth.revenueGrowth < -5) {
      factors.push({
        type: 'negative',
        category: 'growth',
        description: `Revenue decline of ${Math.abs(growth.revenueGrowth).toFixed(1)}% indicates business challenges`,
        impact: 'high',
        confidence: 0.9,
        weight: 0.8
      });
    }

    // Liquidity factors based on real data
    if (ratios.liquidity.currentRatio > 2) {
      factors.push({
        type: 'positive',
        category: 'liquidity',
        description: `Strong current ratio of ${ratios.liquidity.currentRatio.toFixed(2)} indicates good short-term liquidity`,
        impact: 'medium',
        confidence: 0.8,
        weight: 0.6
      });
    } else if (ratios.liquidity.currentRatio < 1) {
      factors.push({
        type: 'negative',
        category: 'liquidity',
        description: `Low current ratio of ${ratios.liquidity.currentRatio.toFixed(2)} suggests liquidity concerns`,
        impact: 'high',
        confidence: 0.9,
        weight: 0.7
      });
    }

    // Leverage factors based on real data
    if (ratios.leverage.debtToEquity > 2) {
      factors.push({
        type: 'negative',
        category: 'leverage',
        description: `High debt-to-equity ratio of ${ratios.leverage.debtToEquity.toFixed(2)} indicates high financial risk`,
        impact: 'high',
        confidence: 0.85,
        weight: analysisContext === 'investment' ? 0.8 : 0.6
      });
    } else if (ratios.leverage.debtToEquity < 0.5) {
      factors.push({
        type: 'positive',
        category: 'leverage',
        description: `Conservative debt-to-equity ratio of ${ratios.leverage.debtToEquity.toFixed(2)} indicates financial stability`,
        impact: 'medium',
        confidence: 0.8,
        weight: analysisContext === 'investment' ? 0.7 : 0.5
      });
    }

    // Valuation factors based on real data
    if (ratios.valuation.peRatio > 0 && ratios.valuation.peRatio < 15) {
      factors.push({
        type: 'positive',
        category: 'valuation',
        description: `Attractive P/E ratio of ${ratios.valuation.peRatio.toFixed(1)} suggests potential undervaluation`,
        impact: 'medium',
        confidence: 0.7,
        weight: analysisContext === 'investment' ? 0.8 : 0.5
      });
    } else if (ratios.valuation.peRatio > 30) {
      factors.push({
        type: 'negative',
        category: 'valuation',
        description: `High P/E ratio of ${ratios.valuation.peRatio.toFixed(1)} suggests potential overvaluation`,
        impact: 'medium',
        confidence: 0.7,
        weight: analysisContext === 'investment' ? 0.7 : 0.4
      });
    }

    // Quality factors based on real data
    if (quality.fcfConsistency > 75) {
      factors.push({
        type: 'positive',
        category: 'quality',
        description: `High free cash flow consistency of ${quality.fcfConsistency.toFixed(0)}% indicates reliable cash generation`,
        impact: 'high',
        confidence: 0.9,
        weight: analysisContext === 'investment' ? 0.9 : 0.6
      });
    }

    // Efficiency factors based on real data
    if (ratios.efficiency.assetTurnover > 1) {
      factors.push({
        type: 'positive',
        category: 'efficiency',
        description: `Good asset turnover of ${ratios.efficiency.assetTurnover.toFixed(2)} indicates efficient asset utilization`,
        impact: 'medium',
        confidence: 0.8,
        weight: 0.6
      });
    }

    // Market position factors based on company data
    if (company.marketCap > 10000000000) { // $10B+
      factors.push({
        type: 'positive',
        category: 'market_position',
        description: `Large market cap of $${(company.marketCap / 1000000000).toFixed(1)}B indicates market leadership`,
        impact: 'medium',
        confidence: 0.9,
        weight: analysisContext === 'investment' ? 0.6 : 0.4
      });
    }

    return factors;
  }  /
**
   * Calculate overall score based on real data analysis
   */
  private static calculateRealDataScore(
    factors: AnalysisFactor[],
    ratios: any,
    growth: any,
    analysisContext: 'investment' | 'trading'
  ): number {
    if (factors.length === 0) return 50; // Neutral score if no factors

    let weightedScore = 0;
    let totalWeight = 0;

    factors.forEach(factor => {
      const factorScore = factor.type === 'positive' ? 
        (factor.impact === 'high' ? 80 : factor.impact === 'medium' ? 65 : 55) :
        (factor.impact === 'high' ? 20 : factor.impact === 'medium' ? 35 : 45);
      
      const adjustedWeight = factor.weight * factor.confidence;
      weightedScore += factorScore * adjustedWeight;
      totalWeight += adjustedWeight;
    });

    const baseScore = totalWeight > 0 ? weightedScore / totalWeight : 50;

    // Apply context-specific adjustments
    let contextAdjustment = 0;
    if (analysisContext === 'investment') {
      // For investment, prioritize stability and long-term metrics
      if (ratios.profitability.roe > 15 && ratios.leverage.debtToEquity < 1) {
        contextAdjustment += 5;
      }
      if (growth.revenueCAGR3Y > 10) {
        contextAdjustment += 3;
      }
    } else {
      // For trading, prioritize momentum and short-term indicators
      if (growth.revenueGrowth > 15) {
        contextAdjustment += 5;
      }
      if (ratios.liquidity.currentRatio > 1.5) {
        contextAdjustment += 2;
      }
    }

    return Math.max(0, Math.min(100, Math.round(baseScore + contextAdjustment)));
  }

  /**
   * Calculate confidence based on data quality and completeness
   */
  private static calculateDataQualityConfidence(
    dataSources: string[],
    statementsCount: number,
    company: any,
    factors: AnalysisFactor[]
  ): number {
    let confidence = 0.5; // Base confidence

    // Data source quality
    if (dataSources.includes('Alpha Vantage')) confidence += 0.2;
    if (dataSources.includes('Google Custom Search')) confidence += 0.1;
    if (dataSources.includes('Financial Modeling Prep')) confidence += 0.15;
    if (dataSources.includes('Generated Data')) confidence -= 0.2;

    // Data completeness
    if (statementsCount >= 4) confidence += 0.15;
    else if (statementsCount >= 2) confidence += 0.1;
    else confidence -= 0.1;

    // Company data quality
    if (company.marketCap > 0 && company.peRatio > 0) confidence += 0.1;
    if (company.sector && company.industry) confidence += 0.05;

    // Analysis depth
    if (factors.length >= 5) confidence += 0.1;
    else if (factors.length >= 3) confidence += 0.05;

    return Math.max(0.3, Math.min(0.95, confidence));
  }  /**

   * Calculate valuation metrics from real data
   */
  private static calculateValuationMetrics(ratios: any, company: any, statements: any[]): any {
    const latest = statements[0] || {};
    
    return {
      pe_ratio: ratios.valuation.peRatio,
      pb_ratio: ratios.valuation.pbRatio,
      ps_ratio: ratios.valuation.psRatio,
      peg_ratio: ratios.valuation.pegRatio,
      ev_ebitda: ratios.valuation.evToEbitda,
      price_to_fcf: company.marketCap > 0 && latest.freeCashFlow > 0 ? 
        company.marketCap / latest.freeCashFlow : 0,
      enterprise_value: company.marketCap + (latest.totalDebt || 0),
      market_cap: company.marketCap
    };
  }

  /**
   * Calculate competitive position from real data
   */
  private static calculateCompetitivePosition(company: any, ratios: any, growth: any): any {
    return {
      market_cap_rank: company.marketCap > 50000000000 ? 'Large Cap' :
                      company.marketCap > 2000000000 ? 'Mid Cap' : 'Small Cap',
      sector: company.sector,
      industry: company.industry,
      competitive_advantages: this.identifyCompetitiveAdvantages(ratios, growth, company),
      market_position: company.marketCap > 10000000000 ? 'Market Leader' :
                      company.marketCap > 1000000000 ? 'Established Player' : 'Emerging Company'
    };
  }

  /**
   * Identify competitive advantages from financial metrics
   */
  private static identifyCompetitiveAdvantages(ratios: any, growth: any, company: any): string[] {
    const advantages: string[] = [];

    if (ratios.profitability.roe > 20) advantages.push('High Return on Equity');
    if (ratios.profitability.netMargin > 15) advantages.push('Strong Profit Margins');
    if (growth.revenueCAGR3Y > 15) advantages.push('Consistent Growth');
    if (ratios.liquidity.currentRatio > 2) advantages.push('Strong Liquidity Position');
    if (ratios.leverage.debtToEquity < 0.5) advantages.push('Conservative Debt Management');
    if (company.marketCap > 10000000000) advantages.push('Market Leadership');

    return advantages;
  }
}

/**
 * Main handler function for the fundamental analysis edge function
 */
const handler = createRequestHandler(async (request: Request) => {
  const input = await parseJsonBody<FundamentalAnalysisInput>(request);
  
  if (!input.ticker) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Ticker symbol is required');
  }

  if (!input.apiKey) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'API key is required for real data analysis');
  }

  const result = await FundamentalAnalysisEngine.analyze(
    input.ticker,
    input.apiKey,
    input.context || 'investment'
  );

  return createSuccessHttpResponse(result);
});

// Start the server
serve(handler);