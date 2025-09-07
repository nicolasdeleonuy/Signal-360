// Signal-360 Analysis Edge Function v2
// Enhanced master orchestrator for comprehensive financial asset analysis
// Coordinates real data fetching from fundamental, technical, and sentiment/eco analysis with synthesis

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  createRequestHandler,
  parseJsonBody,
  createSuccessHttpResponse,
  createErrorHttpResponse,
  authenticateUser,
  createAuthErrorResponse,
  createServiceClient,
  AppError,
  ERROR_CODES,
  generateRequestId,
  withRetryAndTimeout,
  getConfig,

  globalAnalysisCache,
  globalCachedAnalysisService,
  CacheKeyGenerators,
  CacheTTL,
  PerformanceMetrics,
  ResourceManager,
  optimized,
  initializeAPIConnections,
  globalConnectionPool,
  globalPerformanceMonitor,
  PerformanceTracker,
  createOptimizedResponse
} from '../_shared/index.ts';

import { 
  createGoogleApiClient, 
  GoogleApiClient, 
  FundamentalAnalysisData,
  validateApiKey,
  testApiKey 
} from '../_shared/services/googleApiService.ts';

// Constants for the analysis
const CONSTANTS = {
  TIMEFRAMES: {
    DEFAULT_TRADING: '1D'
  },
  TICKER_PATTERNS: {
    VALID: /^[A-Z]{1,5}$/
  },
  GOOGLE_API_KEY: {
    PATTERN: /^AIza[0-9A-Za-z-_]{35}$/
  }
};

/**
 * Enhanced analysis request interface
 */
interface Signal360AnalysisRequest {
  ticker: string;
  context: 'investment' | 'trading';
}

/**
 * Individual analysis result interfaces
 */
interface AnalysisResult {
  score: number;
  factors: any[];
  details: Record<string, any>;
  confidence: number;
}

interface FundamentalAnalysisResult extends AnalysisResult {
  data_sources: string[];
}

interface TechnicalAnalysisResult extends AnalysisResult {
  timeframe_used: string;
}

interface SentimentEcoAnalysisResult extends AnalysisResult {
  key_ecos: Array<{
    source: string;
    headline: string;
    sentiment: 'positive' | 'negative' | 'neutral';
  }>;
}

/**
 * Final synthesis result interface
 */
interface SynthesisResult {
  synthesis_score: number;
  convergence_factors: string[];
  divergence_factors: string[];
  full_report: {
    fundamental: { score: number; summary: string };
    technical: { score: number; summary: string };
    sentiment_eco: { score: number; summary: string };
  };
  confidence: number;
}

/**
 * Final response interface matching the exact specification
 */
interface Signal360AnalysisResponse {
  synthesis_score: number;
  recommendation: string;
  confidence: number;
  convergence_factors: string[];
  divergence_factors: string[];
  trade_parameters: {
    entry_price: number;
    stop_loss: number;
    take_profit_levels: number[];
  };
  key_ecos: Array<{
    source: string;
    headline: string;
    sentiment: string;
  }>;
  full_report: {
    fundamental: { score: number; summary: string };
    technical: { score: number; summary: string };
    sentiment_eco: { score: number; summary: string };
  };
}

/**
 * API Key Decryption Service
 * Integrates with the existing decrypt-api-key function
 */
class ApiKeyDecryptionService {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly IV_LENGTH = 12;

  /**
   * Generate decryption key from string
   */
  private static async generateKey(keyString: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(keyString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', keyData);
    
    return await crypto.subtle.importKey(
      'raw',
      hashBuffer,
      { name: this.ALGORITHM },
      false,
      ['decrypt']
    );
  }

  /**
   * Decrypt API key using AES-256-GCM
   */
  static async decrypt(encryptedData: string, encryptionKey: string): Promise<string> {
    try {
      const combined = new Uint8Array(
        atob(encryptedData)
          .split('')
          .map(char => char.charCodeAt(0))
      );
      
      const iv = combined.slice(0, this.IV_LENGTH);
      const encryptedBuffer = combined.slice(this.IV_LENGTH);
      const key = await this.generateKey(encryptionKey);
      
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: this.ALGORITHM, iv: iv },
        key,
        encryptedBuffer
      );
      
      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
    } catch (error) {
      throw new AppError(
        ERROR_CODES.DECRYPTION_ERROR,
        'Failed to decrypt API key',
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}

/**
 * Analysis Orchestrator Service
 * Coordinates parallel execution of all three analysis types with caching and performance optimization
 */
class AnalysisOrchestrator {
  private config: any;
  private supabase: any;
  private resourceManager: ResourceManager;

  constructor() {
    this.config = getConfig();
    this.supabase = createServiceClient();
    this.resourceManager = ResourceManager.getInstance();
  }

  /**
   * Validate and decrypt user's API key with caching
   */
  async validateAndDecryptApiKey(userId: string): Promise<string> {
    const startTime = performance.now();
    
    try {
      // Check cache first
      const cachedKey = globalAnalysisCache.getUserApiKey(userId);
      if (cachedKey) {
        PerformanceMetrics.record('api_key_cache_hit', performance.now() - startTime);
        return cachedKey;
      }

      const { data: profileData, error: dbError } = await this.supabase
        .from('profiles')
        .select('encrypted_google_api_key')
        .eq('id', userId)
        .single();

      if (dbError) {
        throw new AppError(
          ERROR_CODES.DATABASE_ERROR,
          'Failed to retrieve user configuration',
          dbError.message
        );
      }

      if (!profileData?.encrypted_google_api_key) {
        throw new AppError(
          ERROR_CODES.MISSING_API_KEY,
          'Google API key not configured. Please add your API key in the profile section to enable analysis.'
        );
      }

      // Decrypt the API key
      const decryptedKey = await ApiKeyDecryptionService.decrypt(
        profileData.encrypted_google_api_key,
        this.config.security.encryptionKey
      );

      // Validate decrypted key format using GoogleApiClient validation
      if (!validateApiKey(decryptedKey)) {
        throw new AppError(
          ERROR_CODES.INVALID_API_KEY,
          'Invalid Google API key format after decryption'
        );
      }

      // Test API key functionality (optional, can be disabled for performance)
      const testConnection = await testApiKey(decryptedKey);
      if (!testConnection) {
        console.warn(`API key test failed for user ${userId}, but proceeding with analysis`);
      }

      // Cache the decrypted key
      globalAnalysisCache.cacheUserApiKey(userId, decryptedKey);
      PerformanceMetrics.record('api_key_cache_miss', performance.now() - startTime);

      return decryptedKey;
    } catch (error) {
      PerformanceMetrics.record('api_key_error', performance.now() - startTime);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        ERROR_CODES.PROCESSING_ERROR,
        'Failed to process API key',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Execute individual analysis function
   */
  private async executeAnalysis(
    functionName: string,
    payload: any,
    timeoutMs: number = 30000
  ): Promise<any> {
    const functionUrl = `${this.config.supabase.url}/functions/v1/${functionName}`;
    
    return await withRetryAndTimeout(
      async () => {
        const response = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.supabase.serviceRoleKey}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new AppError(
            ERROR_CODES.EXTERNAL_API_ERROR,
            `${functionName} analysis failed: ${response.status} ${response.statusText}`,
            errorText
          );
        }

        const result = await response.json();
        if (!result.success) {
          throw new AppError(
            ERROR_CODES.PROCESSING_ERROR,
            `${functionName} analysis returned error`,
            result.error?.message || 'Unknown error'
          );
        }

        return result.data;
      },
      timeoutMs,
      {
        maxAttempts: 2,
        baseDelay: 1000,
        maxDelay: 5000,
        backoffMultiplier: 2,
        jitter: true
      },
      `${functionName} analysis`
    );
  }

  /**
   * Execute fundamental analysis using real data from GoogleApiClient
   */
  private async executeFundamentalAnalysisWithRealData(
    ticker: string,
    context: 'investment' | 'trading',
    googleApiClient: GoogleApiClient
  ): Promise<FundamentalAnalysisResult> {
    const startTime = performance.now();
    
    try {
      console.log(`Fetching real fundamental data for ${ticker}`);
      
      // Get real fundamental data from Google API client
      const fundamentalData: FundamentalAnalysisData = await googleApiClient.getFundamentalData(ticker);
      
      // Transform the real data into the expected FundamentalAnalysisResult format
      const analysisResult = this.transformFundamentalData(fundamentalData, context);
      
      const executionTime = performance.now() - startTime;
      console.log(`Real fundamental analysis completed for ${ticker} in ${executionTime.toFixed(2)}ms`);
      PerformanceMetrics.record('fundamental_analysis_real_data', executionTime);
      
      return analysisResult;
      
    } catch (error) {
      const errorTime = performance.now() - startTime;
      PerformanceMetrics.record('fundamental_analysis_real_data_error', errorTime);
      console.error(`Real fundamental analysis failed for ${ticker}:`, error);
      
      // Fallback to mock data if real data fails
      console.log(`Falling back to mock fundamental data for ${ticker}`);
      return this.createMockFundamentalAnalysisResult(ticker, context);
    }
  }

  /**
   * Transform real fundamental data into FundamentalAnalysisResult format
   */
  private transformFundamentalData(
    data: FundamentalAnalysisData, 
    context: 'investment' | 'trading'
  ): FundamentalAnalysisResult {
    // Calculate overall fundamental score based on multiple factors
    const score = this.calculateFundamentalScore(data, context);
    
    // Generate analysis factors from the real data
    const factors = this.generateFundamentalFactors(data);
    
    // Create detailed analysis from real data
    const details = {
      company_info: data.companyInfo,
      financial_ratios: data.financialRatios,
      growth_metrics: data.growthMetrics,
      quality_indicators: data.qualityIndicators,
      latest_financials: data.financialStatements[0] || null,
      analysis_context: context
    };
    
    // Calculate confidence based on data quality
    const confidence = this.calculateDataConfidence(data);
    
    return {
      score,
      factors,
      details,
      confidence,
      data_sources: data.dataSources
    };
  }

  /**
   * Calculate fundamental score from real data
   */
  private calculateFundamentalScore(data: FundamentalAnalysisData, context: string): number {
    let score = 50; // Start with neutral
    
    const ratios = data.financialRatios;
    const growth = data.growthMetrics;
    const quality = data.qualityIndicators;
    
    // Profitability scoring (25% weight)
    if (ratios.profitability.roe > 15) score += 8;
    else if (ratios.profitability.roe > 10) score += 5;
    else if (ratios.profitability.roe < 5) score -= 5;
    
    if (ratios.profitability.netMargin > 15) score += 5;
    else if (ratios.profitability.netMargin > 10) score += 3;
    else if (ratios.profitability.netMargin < 5) score -= 3;
    
    // Growth scoring (25% weight)
    if (growth.revenueGrowth > 20) score += 8;
    else if (growth.revenueGrowth > 10) score += 5;
    else if (growth.revenueGrowth < 0) score -= 5;
    
    if (growth.earningsGrowth > 20) score += 5;
    else if (growth.earningsGrowth > 10) score += 3;
    else if (growth.earningsGrowth < 0) score -= 3;
    
    // Financial health scoring (25% weight)
    if (ratios.liquidity.currentRatio > 2) score += 5;
    else if (ratios.liquidity.currentRatio > 1.5) score += 3;
    else if (ratios.liquidity.currentRatio < 1) score -= 5;
    
    if (ratios.leverage.debtToEquity < 0.3) score += 5;
    else if (ratios.leverage.debtToEquity < 0.6) score += 2;
    else if (ratios.leverage.debtToEquity > 1) score -= 5;
    
    // Valuation scoring (25% weight) - context dependent
    if (context === 'investment') {
      if (ratios.valuation.peRatio > 0 && ratios.valuation.peRatio < 15) score += 5;
      else if (ratios.valuation.peRatio > 25) score -= 3;
      
      if (ratios.valuation.pbRatio > 0 && ratios.valuation.pbRatio < 2) score += 3;
      else if (ratios.valuation.pbRatio > 4) score -= 2;
    } else {
      // For trading, focus more on momentum and recent performance
      if (growth.revenueGrowth > growth.revenueCAGR3Y) score += 3;
      if (quality.fcfConsistency > 75) score += 2;
    }
    
    // Ensure score is within bounds
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Generate analysis factors from real data
   */
  private generateFundamentalFactors(data: FundamentalAnalysisData): any[] {
    const factors = [];
    const ratios = data.financialRatios;
    const growth = data.growthMetrics;
    
    // Add significant positive factors
    if (ratios.profitability.roe > 15) {
      factors.push({
        type: 'positive',
        category: 'Profitability',
        description: `Strong ROE of ${ratios.profitability.roe.toFixed(1)}%`,
        weight: 0.8
      });
    }
    
    if (growth.revenueGrowth > 15) {
      factors.push({
        type: 'positive',
        category: 'Growth',
        description: `Strong revenue growth of ${growth.revenueGrowth.toFixed(1)}%`,
        weight: 0.7
      });
    }
    
    if (ratios.liquidity.currentRatio > 2) {
      factors.push({
        type: 'positive',
        category: 'Financial Health',
        description: `Strong liquidity with current ratio of ${ratios.liquidity.currentRatio.toFixed(1)}`,
        weight: 0.6
      });
    }
    
    // Add significant negative factors
    if (ratios.profitability.roe < 5) {
      factors.push({
        type: 'negative',
        category: 'Profitability',
        description: `Low ROE of ${ratios.profitability.roe.toFixed(1)}%`,
        weight: 0.7
      });
    }
    
    if (growth.revenueGrowth < 0) {
      factors.push({
        type: 'negative',
        category: 'Growth',
        description: `Declining revenue growth of ${growth.revenueGrowth.toFixed(1)}%`,
        weight: 0.8
      });
    }
    
    if (ratios.leverage.debtToEquity > 1) {
      factors.push({
        type: 'negative',
        category: 'Financial Health',
        description: `High debt-to-equity ratio of ${ratios.leverage.debtToEquity.toFixed(1)}`,
        weight: 0.6
      });
    }
    
    return factors.slice(0, 10); // Limit to top 10 factors
  }

  /**
   * Calculate confidence based on data quality
   */
  private calculateDataConfidence(data: FundamentalAnalysisData): number {
    let confidence = 0.5; // Base confidence
    
    // Increase confidence based on data sources
    if (data.dataSources.includes('Google Custom Search')) confidence += 0.1;
    if (data.dataSources.includes('Alpha Vantage')) confidence += 0.2;
    if (data.dataSources.includes('Financial Modeling Prep')) confidence += 0.15;
    
    // Increase confidence based on data completeness
    if (data.financialStatements.length >= 4) confidence += 0.1;
    if (data.companyInfo.marketCap > 0) confidence += 0.05;
    if (data.financialRatios.profitability.roe !== 0) confidence += 0.05;
    
    return Math.min(1.0, confidence);
  }

  /**
   * Create mock fundamental analysis result as fallback
   */
  private createMockFundamentalAnalysisResult(ticker: string, context: string): FundamentalAnalysisResult {
    const hash = this.hashCode(ticker);
    const random = this.seededRandom(hash);
    
    const score = Math.floor(random() * 40) + 30; // 30-70 range
    
    return {
      score,
      factors: [
        {
          type: score > 50 ? 'positive' : 'negative',
          category: 'Mock Analysis',
          description: `Generated analysis for ${ticker} (real data unavailable)`,
          weight: 0.5
        }
      ],
      details: {
        mock_data: true,
        ticker,
        context,
        note: 'Real fundamental data could not be retrieved'
      },
      confidence: 0.3, // Low confidence for mock data
      data_sources: ['Mock Data Generator']
    };
  }

  /**
   * Simple hash function for consistent mock data
   */
  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /**
   * Seeded random number generator for consistent mock data
   */
  private seededRandom(seed: number): () => number {
    let x = Math.sin(seed) * 10000;
    return () => {
      x = Math.sin(x) * 10000;
      return x - Math.floor(x);
    };
  }

  /**
   * Execute all three analyses in parallel with caching and performance optimization
   */
  async executeParallelAnalysis(
    ticker: string,
    context: 'investment' | 'trading',
    apiKey: string
  ): Promise<{
    fundamental: FundamentalAnalysisResult;
    technical: TechnicalAnalysisResult;
    sentimentEco: SentimentEcoAnalysisResult;
  }> {
    const startTime = performance.now();
    
    // Check system resources before proceeding
    const resources = this.resourceManager.checkResources();
    if (!resources.overall) {
      console.warn('System resources are low, optimizing before analysis');
      this.resourceManager.optimizeResources();
    }

    const timeframe = context === 'trading' ? CONSTANTS.TIMEFRAMES.DEFAULT_TRADING : undefined;
    
    // Check if complete analysis is cached
    const cacheKey = CacheKeyGenerators.analysis(ticker, context, timeframe);
    const cachedAnalysis = globalAnalysisCache.getSynthesis(ticker, context, timeframe);
    
    if (cachedAnalysis && cachedAnalysis.individual_results) {
      console.log(`Using cached analysis for ${ticker} (${context})`);
      PerformanceMetrics.record('parallel_analysis_cache_hit', performance.now() - startTime);
      return cachedAnalysis.individual_results;
    }

    const analysisPayload = {
      ticker_symbol: ticker,
      api_key: apiKey,
      analysis_context: context,
      ...(timeframe && { trading_timeframe: timeframe })
    };

    console.log(`Starting parallel analysis for ${ticker} (${context}) with real data fetching`);

    try {
      // Create Google API client for real data fetching
      const googleApiClient = createGoogleApiClient(apiKey);
      
      // Use cached analysis service for individual components
      const [fundamentalResult, technicalResult, sentimentEcoResult] = await Promise.allSettled([
        globalCachedAnalysisService.getFundamentalAnalysis(ticker, () => 
          this.executeFundamentalAnalysisWithRealData(ticker, context, googleApiClient)
        ),
        globalCachedAnalysisService.getTechnicalAnalysis(ticker, 'complete', timeframe || '1D', () =>
          this.executeAnalysis('technical-analysis', analysisPayload)
        ),
        globalCachedAnalysisService.getESGAnalysis(ticker, () =>
          this.executeAnalysis('sentiment-eco-analysis', analysisPayload)
        )
      ]);

      const executionTime = performance.now() - startTime;
      console.log(`Parallel analysis completed in ${executionTime.toFixed(2)}ms`);
      PerformanceMetrics.record('parallel_analysis_execution', executionTime);

      // Process results and handle partial failures
      const results: any = {};
      const failures: string[] = [];

      if (fundamentalResult.status === 'fulfilled') {
        results.fundamental = fundamentalResult.value;
      } else {
        console.error('Fundamental analysis failed:', fundamentalResult.reason);
        failures.push('fundamental');
      }

      if (technicalResult.status === 'fulfilled') {
        results.technical = technicalResult.value;
      } else {
        console.error('Technical analysis failed:', technicalResult.reason);
        failures.push('technical');
      }

      if (sentimentEcoResult.status === 'fulfilled') {
        results.sentimentEco = sentimentEcoResult.value;
      } else {
        console.error('Sentiment/Eco analysis failed:', sentimentEcoResult.reason);
        failures.push('sentiment-eco');
      }

      // Require at least 2 out of 3 analyses to succeed
      if (Object.keys(results).length < 2) {
        throw new AppError(
          ERROR_CODES.PROCESSING_ERROR,
          'Insufficient analysis results - at least 2 out of 3 analyses must succeed',
          `Failed analyses: ${failures.join(', ')}`
        );
      }

      // Fill in missing analyses with neutral defaults if needed
      if (!results.fundamental) {
        results.fundamental = this.createNeutralAnalysisResult('fundamental');
      }
      if (!results.technical) {
        results.technical = this.createNeutralAnalysisResult('technical');
      }
      if (!results.sentimentEco) {
        results.sentimentEco = this.createNeutralAnalysisResult('sentiment-eco');
      }

      // Cache the complete results for future requests
      const cacheData = {
        individual_results: results,
        timestamp: Date.now(),
        context,
        timeframe
      };
      globalAnalysisCache.cacheSynthesis(ticker, context, timeframe, cacheData);

      PerformanceMetrics.record('parallel_analysis_cache_miss', executionTime);
      return results;
    } catch (error) {
      PerformanceMetrics.record('parallel_analysis_error', performance.now() - startTime);
      console.error('Parallel analysis execution failed:', error);
      throw new AppError(
        ERROR_CODES.PROCESSING_ERROR,
        'Failed to execute analysis pipeline',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Create neutral analysis result for failed analyses
   */
  private createNeutralAnalysisResult(type: string): AnalysisResult {
    return {
      score: 50, // Neutral score
      factors: [],
      details: {},
      confidence: 0.1, // Very low confidence for missing data
      ...(type === 'sentiment-eco' && { key_ecos: [] }),
      ...(type === 'technical' && { timeframe_used: 'unknown' }),
      ...(type === 'fundamental' && { data_sources: [] })
    };
  }
}



/**
 * Final structured response interface matching the exact specification
 */
interface Signal360AnalysisResponseComplete {
  synthesis_score: number; // 0-100
  recommendation: 'BUY' | 'SELL' | 'HOLD';
  confidence: number; // 0-100 (converted from 0-1)
  convergence_factors: string[];
  divergence_factors: string[];
  trade_parameters: {
    entry_price: number;
    stop_loss: number;
    take_profit_levels: number[];
  };
  key_ecos: Array<{
    source: string;
    headline: string;
    sentiment: 'positive' | 'negative' | 'neutral';
  }>;
  full_report: {
    fundamental: {
      score: number;
      summary: string;
    };
    technical: {
      score: number;
      summary: string;
    };
    sentiment_eco: {
      score: number;
      summary: string;
    };
  };
  metadata: {
    analysis_timestamp: string;
    ticker_symbol: string;
    analysis_context: string;
    trading_timeframe?: string;
    request_id?: string;
    api_version: string;
    processing_time_ms?: number;
  };
}

/**
 * Format analysis results into the standardized Signal-360 response format
 * @param params Formatting parameters
 * @returns Formatted response matching the exact schema
 */
function formatAnalysisResponse(params: {
  ticker_symbol: string;
  analysis_context: 'investment' | 'trading';
  trading_timeframe?: string;
  synthesis_result: SynthesisResult;
  fundamental_result: FundamentalAnalysisResult;
  technical_result: TechnicalAnalysisResult;
  esg_result: SentimentEcoAnalysisResult;
  request_id?: string;
  processing_time_ms?: number;
}): Signal360AnalysisResponseComplete {
  try {
    // Generate recommendation based on synthesis score
    const recommendation = generateRecommendationFromScore(params.synthesis_result.synthesis_score);

    // Convert confidence from 0-1 to 0-100 scale
    const confidence = Math.round((params.synthesis_result.confidence || 0.8) * 100);

    // Format convergence factors as strings
    const convergenceFactors = formatFactorsAsStrings(params.synthesis_result.convergence_factors);

    // Format divergence factors as strings
    const divergenceFactors = formatFactorsAsStrings(params.synthesis_result.divergence_factors);

    // Ensure trade parameters are properly formatted
    const tradeParameters = formatTradeParameters(params.synthesis_result.trade_parameters || {});

    // Extract and format key eco factors
    const keyEcos = formatKeyEcoFactors(params.esg_result);

    // Generate comprehensive full report
    const fullReport = generateFullReport(
      params.fundamental_result,
      params.technical_result,
      params.esg_result
    );

    // Generate metadata
    const metadata = {
      analysis_timestamp: new Date().toISOString(),
      ticker_symbol: params.ticker_symbol,
      analysis_context: params.analysis_context,
      trading_timeframe: params.trading_timeframe,
      request_id: params.request_id,
      api_version: '2.0.0',
      processing_time_ms: params.processing_time_ms
    };

    const response: Signal360AnalysisResponseComplete = {
      synthesis_score: params.synthesis_result.synthesis_score,
      recommendation,
      confidence,
      convergence_factors: convergenceFactors,
      divergence_factors: divergenceFactors,
      trade_parameters: tradeParameters,
      key_ecos: keyEcos,
      full_report: fullReport,
      metadata
    };

    // Validate schema compliance
    if (!validateResponseSchema(response)) {
      throw new AppError(
        ERROR_CODES.PROCESSING_ERROR,
        'Response failed schema validation'
      );
    }

    return response;

  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    throw new AppError(
      ERROR_CODES.PROCESSING_ERROR,
      'Failed to format analysis response',
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * Execute synthesis analysis using the synthesis-engine function
 */
async function executeSynthesisAnalysis(
  synthesisPayload: any,
  orchestrator: AnalysisOrchestrator
): Promise<SynthesisResult> {
  const config = getConfig();
  const functionUrl = `${config.supabase.url}/functions/v1/synthesis-engine`;
  
  return await withRetryAndTimeout(
    async () => {
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.supabase.serviceRoleKey}`,
        },
        body: JSON.stringify(synthesisPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new AppError(
          ERROR_CODES.EXTERNAL_API_ERROR,
          `synthesis-engine analysis failed: ${response.status} ${response.statusText}`,
          errorText
        );
      }

      const result = await response.json();
      if (!result.success) {
        throw new AppError(
          ERROR_CODES.PROCESSING_ERROR,
          'synthesis-engine analysis returned error',
          result.error?.message || 'Unknown error'
        );
      }

      return result.data;
    },
    15000, // 15 second timeout
    {
      maxAttempts: 2,
      baseDelay: 1000,
      maxDelay: 5000,
      backoffMultiplier: 2,
      jitter: true
    },
    'synthesis-engine analysis'
  );
}

// Initialize connection pools and performance monitoring
initializeAPIConnections();

/**
 * Enhanced main request handler for the signal-360-analysis Edge Function with performance optimization
 */
const handleAnalysisRequest = async (request: Request, requestId: string): Promise<Response> => {
  const requestStartTime = performance.now();
  
  try {
    // Check system resources before processing
    const resourceManager = ResourceManager.getInstance();
    const resources = resourceManager.checkResources();
    
    if (!resources.overall) {
      console.warn(`System resources low for request ${requestId}, optimizing...`);
      resourceManager.optimizeResources();
    }

    // Handle authentication - support both user auth and internal service calls
    let userId: string;
    const internalUserId = request.headers.get('X-User-ID');
    
    if (internalUserId) {
      // Internal service call - validate service role key
      const authHeader = request.headers.get('Authorization');
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      if (!authHeader || !authHeader.includes(serviceRoleKey)) {
        PerformanceMetrics.record('analysis_request_auth_failed', performance.now() - requestStartTime);
        return createErrorHttpResponse(
          new AppError(ERROR_CODES.AUTHENTICATION_ERROR, 'Invalid service role authentication'),
          requestId
        );
      }
      
      userId = internalUserId;
      console.log(`Internal analysis request for user: ${userId} (${requestId})`);
    } else {
      // Regular user authentication
      const authResult = await authenticateUser(request);
      if (!authResult.success) {
        PerformanceMetrics.record('analysis_request_auth_failed', performance.now() - requestStartTime);
        return createAuthErrorResponse(authResult, requestId);
      }

      userId = authResult.user!.user_id;
      console.log(`Analysis request from user: ${userId} (${requestId})`);
    }

    // Parse and validate request body
    const body = await parseJsonBody(request);
    
    // Validate ticker and context
    if (!body.ticker || !body.context) {
      throw new AppError(
        ERROR_CODES.MISSING_PARAMETER,
        'Missing required parameters: ticker and context'
      );
    }

    const ticker = body.ticker.toString().toUpperCase();
    const context = body.context.toString().toLowerCase();

    // Validate ticker format
    if (!CONSTANTS.TICKER_PATTERNS.VALID.test(ticker)) {
      throw new AppError(
        ERROR_CODES.INVALID_TICKER,
        'Invalid ticker symbol format. Must be 1-5 letters.'
      );
    }

    // Validate context
    if (!['investment', 'trading'].includes(context)) {
      throw new AppError(
        ERROR_CODES.INVALID_PARAMETER,
        'Context must be either "investment" or "trading"'
      );
    }

    console.log(`Starting analysis for ${ticker} (${context}) - Request ${requestId}`);

    // Check if complete analysis is cached
    const timeframe = context === 'trading' ? CONSTANTS.TIMEFRAMES.DEFAULT_TRADING : undefined;
    const completeCacheKey = CacheKeyGenerators.analysis(ticker, context, timeframe);
    const cachedComplete = globalAnalysisCache.getSynthesis(ticker, context, timeframe);
    
    if (cachedComplete && cachedComplete.complete_response) {
      console.log(`Returning cached complete analysis for ${ticker} (${context})`);
      PerformanceMetrics.record('analysis_request_complete_cache_hit', performance.now() - requestStartTime);
      return createSuccessHttpResponse(cachedComplete.complete_response, requestId);
    }

    // Initialize orchestrator
    const orchestrator = new AnalysisOrchestrator();

    // Validate and decrypt API key (with caching)
    const apiKey = await orchestrator.validateAndDecryptApiKey(userId);
    console.log(`API key validated for user ${userId}`);

    // Execute parallel analysis (with caching)
    const analysisResults = await orchestrator.executeParallelAnalysis(
      ticker,
      context as 'investment' | 'trading',
      apiKey
    );

    console.log(`Analysis completed for ${ticker}, starting synthesis`);

    // Execute synthesis
    const synthesisPayload = {
      ticker_symbol: ticker,
      analysis_context: context,
      fundamental_result: analysisResults.fundamental,
      technical_result: analysisResults.technical,
      esg_result: analysisResults.sentimentEco // Note: using sentimentEco as ESG for now
    };

    const synthesisResult = await executeSynthesisAnalysis(
      synthesisPayload,
      orchestrator
    );

    console.log(`Synthesis completed for ${ticker} - Score: ${synthesisResult.synthesis_score}`);

    // Format final response using inline formatting functions
    const finalTime = performance.now() - requestStartTime;
    const response = formatAnalysisResponse({
      ticker_symbol: ticker,
      analysis_context: context as 'investment' | 'trading',
      trading_timeframe: timeframe,
      synthesis_result: synthesisResult,
      fundamental_result: analysisResults.fundamental,
      technical_result: analysisResults.technical,
      esg_result: analysisResults.sentimentEco,
      request_id: requestId,
      processing_time_ms: finalTime
    });

    // Cache the complete response for future requests
    const completeResponseCache = {
      complete_response: response,
      timestamp: Date.now(),
      context,
      timeframe
    };
    globalAnalysisCache.cacheSynthesis(ticker, context, timeframe, completeResponseCache);

    const finalTime = performance.now() - requestStartTime;
    console.log(`Analysis pipeline completed for ${ticker} (${requestId}) in ${finalTime.toFixed(2)}ms`);
    PerformanceMetrics.record('analysis_request_complete', finalTime);
    PerformanceTracker.trackResponseTime('signal_360_analysis', finalTime);

    // Create optimized and compressed response
    return createOptimizedResponse(
      { success: true, data: response, request_id: requestId },
      200,
      { 'X-Request-ID': requestId },
      { compress: true, optimize: true, sanitize: false }
    );

  } catch (error) {
    const errorTime = performance.now() - requestStartTime;
    PerformanceMetrics.record('analysis_request_error', errorTime);
    console.error(`Analysis request failed (${requestId}) after ${errorTime.toFixed(2)}ms:`, error);
    return createErrorHttpResponse(error, requestId);
  }
};

// Create and serve the enhanced request handler
const handler = createRequestHandler(handleAnalysisRequest, ['POST']);

serve(handler);/*
*
 * Generate recommendation based on synthesis score
 */
function generateRecommendationFromScore(synthesisScore: number): 'BUY' | 'SELL' | 'HOLD' {
  if (synthesisScore >= 70) {
    return 'BUY';
  } else if (synthesisScore <= 30) {
    return 'SELL';
  } else {
    return 'HOLD';
  }
}

/**
 * Format factors as descriptive strings
 */
function formatFactorsAsStrings(factors: any[]): string[] {
  if (!Array.isArray(factors)) {
    return [];
  }

  return factors.map(factor => {
    if (typeof factor === 'string') {
      return factor;
    } else if (factor && factor.description) {
      return factor.description;
    } else if (factor && factor.category && factor.weight) {
      return `${factor.category}: Signal detected (weight: ${factor.weight.toFixed(2)})`;
    } else {
      return 'Analysis factor identified';
    }
  }).slice(0, 10); // Limit to top 10 factors for readability
}

/**
 * Format trade parameters ensuring proper number formatting
 */
function formatTradeParameters(tradeParameters: any): {
  entry_price: number;
  stop_loss: number;
  take_profit_levels: number[];
} {
  if (!tradeParameters) {
    return {
      entry_price: 0,
      stop_loss: 0,
      take_profit_levels: []
    };
  }

  return {
    entry_price: formatPrice(tradeParameters.entry_price),
    stop_loss: formatPrice(tradeParameters.stop_loss),
    take_profit_levels: (tradeParameters.take_profit_levels || []).map((price: number) => formatPrice(price))
  };
}

/**
 * Format price to 2 decimal places
 */
function formatPrice(price: number): number {
  if (typeof price !== 'number' || isNaN(price)) {
    return 0;
  }
  return Math.round(price * 100) / 100;
}

/**
 * Format key eco factors from ESG analysis result
 */
function formatKeyEcoFactors(esgResult: SentimentEcoAnalysisResult): Array<{
  source: string;
  headline: string;
  sentiment: 'positive' | 'negative' | 'neutral';
}> {
  const keyEcos: Array<{
    source: string;
    headline: string;
    sentiment: 'positive' | 'negative' | 'neutral';
  }> = [];

  // Extract from ESG result key_ecos if available
  if (esgResult.key_ecos && Array.isArray(esgResult.key_ecos)) {
    esgResult.key_ecos.forEach(eco => {
      keyEcos.push({
        source: eco.source || 'Unknown Source',
        headline: eco.headline || 'No headline available',
        sentiment: normalizeSentiment(eco.sentiment)
      });
    });
  }

  // If no key ecos available, generate from factors
  if (keyEcos.length === 0 && esgResult.factors) {
    const topFactors = esgResult.factors
      .sort((a, b) => (b.weight || 0) - (a.weight || 0))
      .slice(0, 5);

    topFactors.forEach(factor => {
      keyEcos.push({
        source: 'ESG Analysis',
        headline: factor.description || 'ESG factor identified',
        sentiment: factor.type === 'positive' ? 'positive' : 
                  factor.type === 'negative' ? 'negative' : 'neutral'
      });
    });
  }

  // Ensure we have at least one eco factor
  if (keyEcos.length === 0) {
    keyEcos.push({
      source: 'Analysis Engine',
      headline: `ESG analysis completed with score of ${esgResult.score}`,
      sentiment: esgResult.score > 60 ? 'positive' : 
                esgResult.score < 40 ? 'negative' : 'neutral'
    });
  }

  return keyEcos.slice(0, 5); // Limit to top 5 eco factors
}

/**
 * Normalize sentiment to expected values
 */
function normalizeSentiment(sentiment: any): 'positive' | 'negative' | 'neutral' {
  if (typeof sentiment === 'string') {
    const normalized = sentiment.toLowerCase();
    if (normalized.includes('positive') || normalized.includes('bullish') || normalized.includes('good')) {
      return 'positive';
    } else if (normalized.includes('negative') || normalized.includes('bearish') || normalized.includes('bad')) {
      return 'negative';
    }
  } else if (typeof sentiment === 'number') {
    if (sentiment > 0.1) return 'positive';
    if (sentiment < -0.1) return 'negative';
  }
  return 'neutral';
}

/**
 * Generate comprehensive full report
 */
function generateFullReport(
  fundamentalResult: FundamentalAnalysisResult,
  technicalResult: TechnicalAnalysisResult,
  esgResult: SentimentEcoAnalysisResult
): {
  fundamental: { score: number; summary: string; };
  technical: { score: number; summary: string; };
  sentiment_eco: { score: number; summary: string; };
} {
  return {
    fundamental: {
      score: fundamentalResult.score,
      summary: generateFundamentalSummary(fundamentalResult)
    },
    technical: {
      score: technicalResult.score,
      summary: generateTechnicalSummary(technicalResult)
    },
    sentiment_eco: {
      score: esgResult.score,
      summary: generateESGSummary(esgResult)
    }
  };
}

/**
 * Generate fundamental analysis summary
 */
function generateFundamentalSummary(fundamentalResult: FundamentalAnalysisResult): string {
  const score = fundamentalResult.score;
  const confidence = fundamentalResult.confidence || 0.8;
  
  let summary = `Fundamental analysis yields a score of ${score}/100 with ${(confidence * 100).toFixed(0)}% confidence. `;
  
  if (score >= 80) {
    summary += 'Excellent financial health with strong fundamentals across key metrics. ';
  } else if (score >= 65) {
    summary += 'Good financial position with solid fundamental indicators. ';
  } else if (score >= 50) {
    summary += 'Moderate fundamental strength with mixed indicators. ';
  } else if (score >= 35) {
    summary += 'Weak fundamental position with concerning metrics. ';
  } else {
    summary += 'Poor fundamental health with significant red flags. ';
  }

  // Add key factors if available
  if (fundamentalResult.factors && fundamentalResult.factors.length > 0) {
    const topFactor = fundamentalResult.factors
      .sort((a, b) => (b.weight || 0) - (a.weight || 0))[0];
    summary += `Key insight: ${topFactor.description || 'Significant fundamental factor identified'}.`;
  }

  return summary;
}

/**
 * Generate technical analysis summary
 */
function generateTechnicalSummary(technicalResult: TechnicalAnalysisResult): string {
  const score = technicalResult.score;
  const confidence = technicalResult.confidence || 0.8;
  
  let summary = `Technical analysis shows a score of ${score}/100 with ${(confidence * 100).toFixed(0)}% confidence. `;
  
  if (score >= 80) {
    summary += 'Strong bullish technical signals with favorable momentum and trend indicators. ';
  } else if (score >= 65) {
    summary += 'Positive technical outlook with good momentum characteristics. ';
  } else if (score >= 50) {
    summary += 'Neutral technical picture with mixed signals. ';
  } else if (score >= 35) {
    summary += 'Weak technical position with bearish indicators. ';
  } else {
    summary += 'Poor technical setup with strong bearish signals. ';
  }

  // Add key factors if available
  if (technicalResult.factors && technicalResult.factors.length > 0) {
    const topFactor = technicalResult.factors
      .sort((a, b) => (b.weight || 0) - (a.weight || 0))[0];
    summary += `Primary signal: ${topFactor.description || 'Key technical pattern identified'}.`;
  }

  return summary;
}

/**
 * Generate ESG/sentiment analysis summary
 */
function generateESGSummary(esgResult: SentimentEcoAnalysisResult): string {
  const score = esgResult.score;
  const confidence = esgResult.confidence || 0.8;
  
  let summary = `Sentiment and ESG analysis produces a score of ${score}/100 with ${(confidence * 100).toFixed(0)}% confidence. `;
  
  if (score >= 80) {
    summary += 'Excellent ESG profile with positive market sentiment and strong sustainability practices. ';
  } else if (score >= 65) {
    summary += 'Good ESG standing with generally positive sentiment indicators. ';
  } else if (score >= 50) {
    summary += 'Moderate ESG performance with neutral market sentiment. ';
  } else if (score >= 35) {
    summary += 'Below-average ESG metrics with some negative sentiment factors. ';
  } else {
    summary += 'Poor ESG profile with negative sentiment and sustainability concerns. ';
  }

  // Add key eco factors if available
  if (esgResult.key_ecos && esgResult.key_ecos.length > 0) {
    const topEco = esgResult.key_ecos[0];
    summary += `Recent development: ${topEco.headline || 'Significant market development identified'}.`;
  }

  return summary;
}

/**
 * Validate final response schema compliance
 */
function validateResponseSchema(response: Signal360AnalysisResponseComplete): boolean {
  try {
    // Check required fields
    const requiredFields = [
      'synthesis_score',
      'recommendation',
      'confidence',
      'convergence_factors',
      'divergence_factors',
      'trade_parameters',
      'key_ecos',
      'full_report',
      'metadata'
    ];

    for (const field of requiredFields) {
      if (!(field in response)) {
        console.error(`Missing required field: ${field}`);
        return false;
      }
    }

    // Validate data types and ranges
    if (typeof response.synthesis_score !== 'number' || 
        response.synthesis_score < 0 || response.synthesis_score > 100) {
      console.error('Invalid synthesis_score');
      return false;
    }

    if (!['BUY', 'SELL', 'HOLD'].includes(response.recommendation)) {
      console.error('Invalid recommendation');
      return false;
    }

    if (typeof response.confidence !== 'number' || 
        response.confidence < 0 || response.confidence > 100) {
      console.error('Invalid confidence');
      return false;
    }

    if (!Array.isArray(response.convergence_factors) || 
        !Array.isArray(response.divergence_factors)) {
      console.error('Invalid convergence/divergence factors');
      return false;
    }

    // Validate trade parameters structure
    const tp = response.trade_parameters;
    if (!tp || typeof tp.entry_price !== 'number' || 
        typeof tp.stop_loss !== 'number' || 
        !Array.isArray(tp.take_profit_levels)) {
      console.error('Invalid trade_parameters structure');
      return false;
    }

    // Validate key_ecos structure
    if (!Array.isArray(response.key_ecos)) {
      console.error('Invalid key_ecos structure');
      return false;
    }

    for (const eco of response.key_ecos) {
      if (!eco.source || !eco.headline || 
          !['positive', 'negative', 'neutral'].includes(eco.sentiment)) {
        console.error('Invalid key_eco structure');
        return false;
      }
    }

    // Validate full_report structure
    const fr = response.full_report;
    if (!fr || !fr.fundamental || !fr.technical || !fr.sentiment_eco) {
      console.error('Invalid full_report structure');
      return false;
    }

    const reportSections = [fr.fundamental, fr.technical, fr.sentiment_eco];
    for (const section of reportSections) {
      if (typeof section.score !== 'number' || typeof section.summary !== 'string') {
        console.error('Invalid report section structure');
        return false;
      }
    }

    return true;

  } catch (error) {
    console.error('Schema validation error:', error);
    return false;
  }
}