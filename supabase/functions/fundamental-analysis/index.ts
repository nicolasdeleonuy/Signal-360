// Edge Function for fundamental analysis of stocks
// Analyzes financial statements, ratios, and company fundamentals

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  createRequestHandler,
  parseJsonBody,
  createSuccessHttpResponse,
  createErrorHttpResponse,
  AppError,
  ERROR_CODES,
  getConfig,
  withTimeout,
  retryWithBackoff,
  FundamentalAnalysisInput,
  FundamentalAnalysisOutput,
  AnalysisFactor
} from '../_shared/index.ts';

/**
 * Financial data interfaces for external API responses
 */
interface FinancialStatement {
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
}

interface CompanyInfo {
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
}

interface MarketData {
  price: number;
  volume: number;
  marketCap: number;
  peRatio: number;
  pbRatio: number;
  psRatio: number;
  pegRatio: number;
  dividendYield: number;
  beta: number;
  eps: number;
  bookValue: number;
}

/**
 * External API service for fetching financial data
 */
class FinancialDataService {
  private apiKey: string;
  private config: any;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.config = getConfig();
  }

  /**
   * Fetch company information
   * @param ticker Stock ticker symbol
   * @returns Promise<CompanyInfo> Company information
   */
  async getCompanyInfo(ticker: string): Promise<CompanyInfo> {
    const url = `https://financialmodelingprep.com/api/v3/profile/${ticker}?apikey=${this.apiKey}`;
    
    return await this.makeApiCall(url, (data) => {
      if (!data || data.length === 0) {
        throw new Error('No company data found');
      }
      
      const company = data[0];
      return {
        name: company.companyName || 'Unknown',
        sector: company.sector || 'Unknown',
        industry: company.industry || 'Unknown',
        marketCap: company.mktCap || 0,
        sharesOutstanding: company.volAvg || 0,
        currentPrice: company.price || 0,
        peRatio: company.pe || 0,
        pbRatio: company.pb || 0,
        dividendYield: company.lastDiv || 0,
        beta: company.beta || 1
      };
    });
  }

  /**
   * Fetch financial statements
   * @param ticker Stock ticker symbol
   * @returns Promise<FinancialStatement[]> Array of financial statements
   */
  async getFinancialStatements(ticker: string): Promise<FinancialStatement[]> {
    const incomeUrl = `https://financialmodelingprep.com/api/v3/income-statement/${ticker}?limit=4&apikey=${this.apiKey}`;
    const balanceUrl = `https://financialmodelingprep.com/api/v3/balance-sheet-statement/${ticker}?limit=4&apikey=${this.apiKey}`;
    const cashFlowUrl = `https://financialmodelingprep.com/api/v3/cash-flow-statement/${ticker}?limit=4&apikey=${this.apiKey}`;

    const [incomeData, balanceData, cashFlowData] = await Promise.all([
      this.makeApiCall(incomeUrl, (data) => data),
      this.makeApiCall(balanceUrl, (data) => data),
      this.makeApiCall(cashFlowUrl, (data) => data)
    ]);

    // Combine data from all three statements
    const statements: FinancialStatement[] = [];
    
    for (let i = 0; i < Math.min(4, incomeData.length); i++) {
      const income = incomeData[i] || {};
      const balance = balanceData[i] || {};
      const cashFlow = cashFlowData[i] || {};

      statements.push({
        revenue: income.revenue || 0,
        netIncome: income.netIncome || 0,
        totalAssets: balance.totalAssets || 0,
        totalLiabilities: balance.totalLiabilities || 0,
        shareholderEquity: balance.totalStockholdersEquity || 0,
        operatingCashFlow: cashFlow.operatingCashFlow || 0,
        freeCashFlow: cashFlow.freeCashFlow || 0,
        totalDebt: balance.totalDebt || 0,
        currentAssets: balance.totalCurrentAssets || 0,
        currentLiabilities: balance.totalCurrentLiabilities || 0,
        period: income.date || cashFlow.date || balance.date || 'Unknown'
      });
    }

    return statements;
  }

  /**
   * Fetch current market data
   * @param ticker Stock ticker symbol
   * @returns Promise<MarketData> Current market data
   */
  async getMarketData(ticker: string): Promise<MarketData> {
    const url = `https://financialmodelingprep.com/api/v3/quote/${ticker}?apikey=${this.apiKey}`;
    
    return await this.makeApiCall(url, (data) => {
      if (!data || data.length === 0) {
        throw new Error('No market data found');
      }
      
      const quote = data[0];
      return {
        price: quote.price || 0,
        volume: quote.volume || 0,
        marketCap: quote.marketCap || 0,
        peRatio: quote.pe || 0,
        pbRatio: quote.priceToBook || 0,
        psRatio: quote.priceToSales || 0,
        pegRatio: quote.peg || 0,
        dividendYield: quote.dividendYield || 0,
        beta: quote.beta || 1,
        eps: quote.eps || 0,
        bookValue: quote.bookValue || 0
      };
    });
  }

  /**
   * Make API call with retry logic and error handling
   * @param url API endpoint URL
   * @param transformer Function to transform response data
   * @returns Promise<T> Transformed response data
   */
  private async makeApiCall<T>(url: string, transformer: (data: any) => T): Promise<T> {
    return await retryWithBackoff(async () => {
      const response = await withTimeout(
        fetch(url, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Signal-360/1.0'
          }
        }),
        this.config.external.apiTimeout,
        'External API request timed out'
      );

      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
          throw new AppError(
            ERROR_CODES.RATE_LIMIT_EXCEEDED,
            'API rate limit exceeded',
            `Retry after ${retryAfter} seconds`,
            retryAfter
          );
        }
        
        throw new AppError(
          ERROR_CODES.EXTERNAL_API_ERROR,
          `External API error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      return transformer(data);
    }, this.config.external.maxRetries);
  }
}

/**
 * Fundamental analysis engine
 */
class FundamentalAnalysisEngine {
  /**
   * Perform comprehensive fundamental analysis
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
    const dataService = new FinancialDataService(apiKey);

    try {
      // Fetch all required data in parallel
      const [companyInfo, financialStatements, marketData] = await Promise.all([
        dataService.getCompanyInfo(ticker),
        dataService.getFinancialStatements(ticker),
        dataService.getMarketData(ticker)
      ]);

      // Calculate financial ratios
      const ratios = this.calculateFinancialRatios(financialStatements, marketData);
      
      // Calculate growth metrics
      const growth = this.calculateGrowthMetrics(financialStatements);
      
      // Calculate valuation metrics
      const valuation = this.calculateValuationMetrics(marketData, financialStatements);
      
      // Calculate quality indicators
      const quality = this.calculateQualityIndicators(financialStatements, companyInfo);

      // Generate analysis factors
      const factors = this.generateAnalysisFactors(
        ratios,
        growth,
        valuation,
        quality,
        analysisContext
      );

      // Calculate overall score
      const score = this.calculateOverallScore(factors, analysisContext);
      
      // Calculate confidence based on data quality
      const confidence = this.calculateConfidence(financialStatements, marketData);

      return {
        score,
        factors,
        details: {
          financial_ratios: ratios,
          growth_metrics: growth,
          valuation_metrics: valuation,
          quality_indicators: quality
        },
        confidence
      };

    } catch (error) {
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
   * Calculate key financial ratios
   */
  private static calculateFinancialRatios(
    statements: FinancialStatement[],
    marketData: MarketData
  ): Record<string, number> {
    const latest = statements[0] || {};
    
    return {
      // Profitability ratios
      roe: latest.shareholderEquity > 0 ? (latest.netIncome / latest.shareholderEquity) * 100 : 0,
      roa: latest.totalAssets > 0 ? (latest.netIncome / latest.totalAssets) * 100 : 0,
      net_margin: latest.revenue > 0 ? (latest.netIncome / latest.revenue) * 100 : 0,
      
      // Liquidity ratios
      current_ratio: latest.currentLiabilities > 0 ? latest.currentAssets / latest.currentLiabilities : 0,
      quick_ratio: latest.currentLiabilities > 0 ? (latest.currentAssets - latest.currentAssets * 0.3) / latest.currentLiabilities : 0,
      
      // Leverage ratios
      debt_to_equity: latest.shareholderEquity > 0 ? latest.totalDebt / latest.shareholderEquity : 0,
      debt_ratio: latest.totalAssets > 0 ? latest.totalDebt / latest.totalAssets : 0,
      
      // Efficiency ratios
      asset_turnover: latest.totalAssets > 0 ? latest.revenue / latest.totalAssets : 0,
      
      // Market ratios
      pe_ratio: marketData.peRatio || 0,
      pb_ratio: marketData.pbRatio || 0,
      ps_ratio: marketData.psRatio || 0
    };
  }

  /**
   * Calculate growth metrics
   */
  private static calculateGrowthMetrics(statements: FinancialStatement[]): Record<string, number> {
    if (statements.length < 2) {
      return {
        revenue_growth: 0,
        earnings_growth: 0,
        fcf_growth: 0,
        revenue_cagr_3y: 0,
        earnings_cagr_3y: 0
      };
    }

    const latest = statements[0];
    const previous = statements[1];
    const threeYearAgo = statements[3] || statements[statements.length - 1];

    return {
      revenue_growth: previous.revenue > 0 ? ((latest.revenue - previous.revenue) / previous.revenue) * 100 : 0,
      earnings_growth: previous.netIncome > 0 ? ((latest.netIncome - previous.netIncome) / previous.netIncome) * 100 : 0,
      fcf_growth: previous.freeCashFlow > 0 ? ((latest.freeCashFlow - previous.freeCashFlow) / previous.freeCashFlow) * 100 : 0,
      revenue_cagr_3y: this.calculateCAGR(threeYearAgo.revenue, latest.revenue, 3),
      earnings_cagr_3y: this.calculateCAGR(threeYearAgo.netIncome, latest.netIncome, 3)
    };
  }

  /**
   * Calculate valuation metrics
   */
  private static calculateValuationMetrics(
    marketData: MarketData,
    statements: FinancialStatement[]
  ): Record<string, number> {
    const latest = statements[0] || {};
    
    return {
      pe_ratio: marketData.peRatio || 0,
      pb_ratio: marketData.pbRatio || 0,
      ps_ratio: marketData.psRatio || 0,
      peg_ratio: marketData.pegRatio || 0,
      ev_revenue: 0, // Would need enterprise value calculation
      ev_ebitda: 0, // Would need EBITDA calculation
      dividend_yield: marketData.dividendYield || 0,
      fcf_yield: marketData.marketCap > 0 ? (latest.freeCashFlow / marketData.marketCap) * 100 : 0
    };
  }

  /**
   * Calculate quality indicators
   */
  private static calculateQualityIndicators(
    statements: FinancialStatement[],
    companyInfo: CompanyInfo
  ): Record<string, number> {
    const latest = statements[0] || {};
    
    return {
      // Financial strength
      interest_coverage: 0, // Would need interest expense data
      debt_service_coverage: latest.operatingCashFlow > 0 ? latest.operatingCashFlow / (latest.totalDebt * 0.05) : 0,
      
      // Operational efficiency
      working_capital: latest.currentAssets - latest.currentLiabilities,
      cash_conversion_cycle: 0, // Would need inventory and receivables data
      
      // Management effectiveness
      roic: latest.totalAssets > 0 ? (latest.netIncome / (latest.totalAssets - latest.currentLiabilities)) * 100 : 0,
      
      // Market position
      market_cap_rank: this.getMarketCapRank(companyInfo.marketCap),
      beta: companyInfo.beta || 1,
      
      // Consistency metrics
      earnings_consistency: this.calculateEarningsConsistency(statements),
      revenue_consistency: this.calculateRevenueConsistency(statements)
    };
  }

  /**
   * Generate analysis factors based on calculated metrics
   */
  private static generateAnalysisFactors(
    ratios: Record<string, number>,
    growth: Record<string, number>,
    valuation: Record<string, number>,
    quality: Record<string, number>,
    analysisContext: 'investment' | 'trading'
  ): AnalysisFactor[] {
    const factors: AnalysisFactor[] = [];

    // Profitability factors
    if (ratios.roe > 15) {
      factors.push({
        category: 'fundamental',
        type: 'positive',
        description: `Strong return on equity of ${ratios.roe.toFixed(1)}%`,
        weight: 0.8,
        confidence: 0.9
      });
    } else if (ratios.roe < 5) {
      factors.push({
        category: 'fundamental',
        type: 'negative',
        description: `Low return on equity of ${ratios.roe.toFixed(1)}%`,
        weight: 0.7,
        confidence: 0.8
      });
    }

    // Growth factors
    if (growth.revenue_growth > 10) {
      factors.push({
        category: 'fundamental',
        type: 'positive',
        description: `Strong revenue growth of ${growth.revenue_growth.toFixed(1)}%`,
        weight: analysisContext === 'investment' ? 0.9 : 0.6,
        confidence: 0.8
      });
    }

    // Valuation factors
    if (valuation.pe_ratio > 0 && valuation.pe_ratio < 15) {
      factors.push({
        category: 'fundamental',
        type: 'positive',
        description: `Attractive P/E ratio of ${valuation.pe_ratio.toFixed(1)}`,
        weight: 0.7,
        confidence: 0.8
      });
    } else if (valuation.pe_ratio > 30) {
      factors.push({
        category: 'fundamental',
        type: 'negative',
        description: `High P/E ratio of ${valuation.pe_ratio.toFixed(1)} suggests overvaluation`,
        weight: 0.6,
        confidence: 0.7
      });
    }

    // Financial strength factors
    if (ratios.current_ratio > 2) {
      factors.push({
        category: 'fundamental',
        type: 'positive',
        description: `Strong liquidity with current ratio of ${ratios.current_ratio.toFixed(1)}`,
        weight: 0.6,
        confidence: 0.9
      });
    } else if (ratios.current_ratio < 1) {
      factors.push({
        category: 'fundamental',
        type: 'negative',
        description: `Poor liquidity with current ratio of ${ratios.current_ratio.toFixed(1)}`,
        weight: 0.8,
        confidence: 0.9
      });
    }

    // Debt factors
    if (ratios.debt_to_equity > 2) {
      factors.push({
        category: 'fundamental',
        type: 'negative',
        description: `High debt-to-equity ratio of ${ratios.debt_to_equity.toFixed(1)}`,
        weight: 0.7,
        confidence: 0.8
      });
    }

    return factors;
  }

  /**
   * Calculate overall fundamental score
   */
  private static calculateOverallScore(
    factors: AnalysisFactor[],
    analysisContext: 'investment' | 'trading'
  ): number {
    if (factors.length === 0) return 50; // Neutral score if no factors

    let totalScore = 0;
    let totalWeight = 0;

    for (const factor of factors) {
      const factorScore = factor.type === 'positive' ? 80 : 20;
      const adjustedWeight = factor.weight * factor.confidence;
      
      totalScore += factorScore * adjustedWeight;
      totalWeight += adjustedWeight;
    }

    const rawScore = totalWeight > 0 ? totalScore / totalWeight : 50;
    
    // Adjust score based on analysis context
    const contextMultiplier = analysisContext === 'investment' ? 1.0 : 0.8;
    
    return Math.round(Math.max(0, Math.min(100, rawScore * contextMultiplier)));
  }

  /**
   * Calculate confidence based on data quality
   */
  private static calculateConfidence(
    statements: FinancialStatement[],
    marketData: MarketData
  ): number {
    let confidence = 1.0;

    // Reduce confidence if we have limited historical data
    if (statements.length < 3) confidence *= 0.8;
    if (statements.length < 2) confidence *= 0.7;

    // Reduce confidence if key data is missing
    const latest = statements[0] || {};
    if (!latest.revenue || !latest.netIncome) confidence *= 0.6;
    if (!marketData.price || !marketData.marketCap) confidence *= 0.7;

    // Reduce confidence for very small or very large companies
    if (marketData.marketCap < 100000000) confidence *= 0.8; // < $100M
    if (marketData.marketCap > 1000000000000) confidence *= 0.9; // > $1T

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  /**
   * Helper methods
   */
  private static calculateCAGR(startValue: number, endValue: number, years: number): number {
    if (startValue <= 0 || endValue <= 0 || years <= 0) return 0;
    return (Math.pow(endValue / startValue, 1 / years) - 1) * 100;
  }

  private static getMarketCapRank(marketCap: number): number {
    if (marketCap > 200000000000) return 1; // Mega cap
    if (marketCap > 10000000000) return 2; // Large cap
    if (marketCap > 2000000000) return 3; // Mid cap
    if (marketCap > 300000000) return 4; // Small cap
    return 5; // Micro cap
  }

  private static calculateEarningsConsistency(statements: FinancialStatement[]): number {
    if (statements.length < 3) return 0.5;
    
    const earnings = statements.map(s => s.netIncome).filter(e => e !== 0);
    if (earnings.length < 3) return 0.3;
    
    const positiveEarnings = earnings.filter(e => e > 0).length;
    return positiveEarnings / earnings.length;
  }

  private static calculateRevenueConsistency(statements: FinancialStatement[]): number {
    if (statements.length < 3) return 0.5;
    
    const revenues = statements.map(s => s.revenue).filter(r => r > 0);
    if (revenues.length < 3) return 0.3;
    
    // Calculate coefficient of variation (lower is more consistent)
    const mean = revenues.reduce((sum, r) => sum + r, 0) / revenues.length;
    const variance = revenues.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / revenues.length;
    const cv = Math.sqrt(variance) / mean;
    
    return Math.max(0, 1 - cv); // Convert to consistency score
  }
}

/**
 * Main request handler for fundamental analysis
 */
const handleFundamentalAnalysis = async (request: Request, requestId: string): Promise<Response> => {
  try {
    // Parse and validate request body
    const body = await parseJsonBody(request);
    
    // Validate required fields
    if (!body.ticker_symbol || !body.api_key || !body.analysis_context) {
      throw new AppError(
        ERROR_CODES.MISSING_PARAMETER,
        'Missing required parameters: ticker_symbol, api_key, analysis_context'
      );
    }

    const { ticker_symbol, api_key, analysis_context } = body;

    // Validate analysis context
    if (!['investment', 'trading'].includes(analysis_context)) {
      throw new AppError(
        ERROR_CODES.INVALID_PARAMETER,
        'analysis_context must be either "investment" or "trading"'
      );
    }

    // Validate ticker format
    if (!/^[A-Z]{1,5}$/.test(ticker_symbol)) {
      throw new AppError(
        ERROR_CODES.INVALID_TICKER,
        'Invalid ticker symbol format'
      );
    }

    // Validate API key format
    if (!/^AIza[0-9A-Za-z-_]{35}$/.test(api_key)) {
      throw new AppError(
        ERROR_CODES.INVALID_API_KEY,
        'Invalid Google API key format'
      );
    }

    console.log(`Starting fundamental analysis for ${ticker_symbol} (${analysis_context}) - Request ${requestId}`);

    // Perform fundamental analysis
    const analysisResult = await FundamentalAnalysisEngine.analyze(
      ticker_symbol,
      api_key,
      analysis_context
    );

    console.log(`Fundamental analysis completed for ${ticker_symbol} - Score: ${analysisResult.score} - Request ${requestId}`);

    return createSuccessHttpResponse(analysisResult, requestId);

  } catch (error) {
    console.error(`Fundamental analysis failed for request ${requestId}:`, error);
    return createErrorHttpResponse(error, requestId);
  }
};

// Create and serve the request handler
const handler = createRequestHandler(handleFundamentalAnalysis, ['POST']);

serve(handler);