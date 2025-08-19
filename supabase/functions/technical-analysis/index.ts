// Edge Function for technical analysis of stocks
// Analyzes price patterns, indicators, and market trends based on timeframe

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
  TechnicalAnalysisInput,
  TechnicalAnalysisOutput,
  AnalysisFactor
} from '../_shared/index.ts';

/**
 * Price data interfaces for technical analysis
 */
interface PriceData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface TechnicalIndicators {
  sma_20: number;
  sma_50: number;
  sma_200: number;
  ema_12: number;
  ema_26: number;
  rsi: number;
  macd: number;
  macd_signal: number;
  macd_histogram: number;
  bollinger_upper: number;
  bollinger_lower: number;
  bollinger_middle: number;
  stochastic_k: number;
  stochastic_d: number;
  williams_r: number;
  atr: number;
}

interface VolumeIndicators {
  volume_sma_20: number;
  volume_ratio: number;
  on_balance_volume: number;
  volume_price_trend: number;
  accumulation_distribution: number;
}

interface SupportResistance {
  support_levels: number[];
  resistance_levels: number[];
  pivot_point: number;
  support_1: number;
  support_2: number;
  resistance_1: number;
  resistance_2: number;
}

/**
 * Market data service for fetching price data
 */
class MarketDataService {
  private apiKey: string;
  private config: any;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.config = getConfig();
  }

  /**
   * Get historical price data based on timeframe
   * @param ticker Stock ticker symbol
   * @param timeframe Analysis timeframe (1D, 1W, 1M, etc.)
   * @returns Promise<PriceData[]> Historical price data
   */
  async getHistoricalData(ticker: string, timeframe: string): Promise<PriceData[]> {
    const period = this.mapTimeframeToPeriod(timeframe);
    const url = `https://financialmodelingprep.com/api/v3/historical-price-full/${ticker}?from=${period.from}&to=${period.to}&apikey=${this.apiKey}`;
    
    return await this.makeApiCall(url, (data) => {
      if (!data || !data.historical) {
        throw new Error('No historical data found');
      }
      
      return data.historical
        .slice(0, 252) // Limit to ~1 year of daily data
        .reverse() // Oldest first for calculations
        .map((item: any) => ({
          date: item.date,
          open: item.open || 0,
          high: item.high || 0,
          low: item.low || 0,
          close: item.close || 0,
          volume: item.volume || 0
        }));
    });
  }

  /**
   * Get intraday data for short-term analysis
   * @param ticker Stock ticker symbol
   * @param interval Intraday interval (1min, 5min, 15min, 30min, 1hour)
   * @returns Promise<PriceData[]> Intraday price data
   */
  async getIntradayData(ticker: string, interval: string = '5min'): Promise<PriceData[]> {
    const url = `https://financialmodelingprep.com/api/v3/historical-chart/${interval}/${ticker}?apikey=${this.apiKey}`;
    
    return await this.makeApiCall(url, (data) => {
      if (!data || data.length === 0) {
        throw new Error('No intraday data found');
      }
      
      return data
        .slice(0, 390) // Limit to ~1 trading day of 1min data
        .reverse() // Oldest first for calculations
        .map((item: any) => ({
          date: item.date,
          open: item.open || 0,
          high: item.high || 0,
          low: item.low || 0,
          close: item.close || 0,
          volume: item.volume || 0
        }));
    });
  }

  /**
   * Map timeframe to API period parameters
   */
  private mapTimeframeToPeriod(timeframe: string): { from: string; to: string } {
    const today = new Date();
    const from = new Date();
    
    switch (timeframe) {
      case '1D':
        from.setDate(today.getDate() - 5); // 5 days for intraday
        break;
      case '1W':
        from.setDate(today.getDate() - 30); // 30 days
        break;
      case '1M':
        from.setMonth(today.getMonth() - 3); // 3 months
        break;
      case '3M':
        from.setMonth(today.getMonth() - 6); // 6 months
        break;
      case '6M':
        from.setFullYear(today.getFullYear() - 1); // 1 year
        break;
      case '1Y':
        from.setFullYear(today.getFullYear() - 2); // 2 years
        break;
      default:
        from.setMonth(today.getMonth() - 3); // Default 3 months
    }
    
    return {
      from: from.toISOString().split('T')[0],
      to: today.toISOString().split('T')[0]
    };
  }

  /**
   * Make API call with retry logic and error handling
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
 * Technical analysis calculation engine
 */
class TechnicalAnalysisEngine {
  /**
   * Perform comprehensive technical analysis
   * @param ticker Stock ticker symbol
   * @param apiKey API key for external calls
   * @param analysisContext Investment or trading context
   * @param tradingTimeframe Trading timeframe for analysis
   * @returns Promise<TechnicalAnalysisOutput> Analysis results
   */
  static async analyze(
    ticker: string,
    apiKey: string,
    analysisContext: 'investment' | 'trading',
    tradingTimeframe?: string
  ): Promise<TechnicalAnalysisOutput> {
    const dataService = new MarketDataService(apiKey);
    const timeframe = tradingTimeframe || (analysisContext === 'trading' ? '1D' : '1Y');

    try {
      // Get appropriate price data based on timeframe
      let priceData: PriceData[];
      
      if (timeframe === '1D') {
        priceData = await dataService.getIntradayData(ticker, '5min');
      } else {
        priceData = await dataService.getHistoricalData(ticker, timeframe);
      }

      if (priceData.length < 20) {
        throw new AppError(
          ERROR_CODES.PROCESSING_ERROR,
          'Insufficient price data for technical analysis'
        );
      }

      // Calculate technical indicators
      const trendIndicators = this.calculateTrendIndicators(priceData);
      const momentumIndicators = this.calculateMomentumIndicators(priceData);
      const volumeIndicators = this.calculateVolumeIndicators(priceData);
      const supportResistance = this.calculateSupportResistance(priceData);

      // Generate analysis factors
      const factors = this.generateAnalysisFactors(
        priceData,
        trendIndicators,
        momentumIndicators,
        volumeIndicators,
        supportResistance,
        analysisContext,
        timeframe
      );

      // Calculate overall score
      const score = this.calculateOverallScore(factors, analysisContext, timeframe);
      
      // Calculate confidence based on data quality and timeframe
      const confidence = this.calculateConfidence(priceData, timeframe);

      return {
        score,
        factors,
        details: {
          trend_indicators: trendIndicators,
          momentum_indicators: momentumIndicators,
          volume_indicators: volumeIndicators,
          support_resistance: supportResistance
        },
        confidence
      };

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError(
        ERROR_CODES.PROCESSING_ERROR,
        'Failed to perform technical analysis',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Calculate trend indicators (Moving Averages, MACD, Bollinger Bands)
   */
  private static calculateTrendIndicators(priceData: PriceData[]): Record<string, number> {
    const closes = priceData.map(d => d.close);
    
    return {
      sma_20: this.calculateSMA(closes, 20),
      sma_50: this.calculateSMA(closes, 50),
      sma_200: this.calculateSMA(closes, 200),
      ema_12: this.calculateEMA(closes, 12),
      ema_26: this.calculateEMA(closes, 26),
      macd: this.calculateMACD(closes).macd,
      macd_signal: this.calculateMACD(closes).signal,
      macd_histogram: this.calculateMACD(closes).histogram,
      bollinger_upper: this.calculateBollingerBands(closes).upper,
      bollinger_lower: this.calculateBollingerBands(closes).lower,
      bollinger_middle: this.calculateBollingerBands(closes).middle
    };
  }

  /**
   * Calculate momentum indicators (RSI, Stochastic, Williams %R)
   */
  private static calculateMomentumIndicators(priceData: PriceData[]): Record<string, number> {
    const closes = priceData.map(d => d.close);
    const highs = priceData.map(d => d.high);
    const lows = priceData.map(d => d.low);
    
    return {
      rsi: this.calculateRSI(closes, 14),
      stochastic_k: this.calculateStochastic(highs, lows, closes, 14).k,
      stochastic_d: this.calculateStochastic(highs, lows, closes, 14).d,
      williams_r: this.calculateWilliamsR(highs, lows, closes, 14),
      atr: this.calculateATR(priceData, 14)
    };
  }

  /**
   * Calculate volume indicators
   */
  private static calculateVolumeIndicators(priceData: PriceData[]): Record<string, number> {
    const volumes = priceData.map(d => d.volume);
    const closes = priceData.map(d => d.close);
    
    return {
      volume_sma_20: this.calculateSMA(volumes, 20),
      volume_ratio: volumes.length > 0 ? volumes[volumes.length - 1] / this.calculateSMA(volumes, 20) : 1,
      on_balance_volume: this.calculateOBV(priceData),
      volume_price_trend: this.calculateVPT(priceData),
      accumulation_distribution: this.calculateAD(priceData)
    };
  }

  /**
   * Calculate support and resistance levels
   */
  private static calculateSupportResistance(priceData: PriceData[]): SupportResistance {
    const recent = priceData.slice(-20); // Last 20 periods
    const highs = recent.map(d => d.high);
    const lows = recent.map(d => d.low);
    const closes = recent.map(d => d.close);
    
    // Find pivot points
    const pivotPoint = (highs[highs.length - 1] + lows[lows.length - 1] + closes[closes.length - 1]) / 3;
    
    // Calculate support and resistance levels
    const resistance1 = 2 * pivotPoint - lows[lows.length - 1];
    const support1 = 2 * pivotPoint - highs[highs.length - 1];
    const resistance2 = pivotPoint + (highs[highs.length - 1] - lows[lows.length - 1]);
    const support2 = pivotPoint - (highs[highs.length - 1] - lows[lows.length - 1]);
    
    // Find additional support/resistance levels using local extremes
    const supportLevels = this.findSupportLevels(lows);
    const resistanceLevels = this.findResistanceLevels(highs);
    
    return {
      support_levels: supportLevels,
      resistance_levels: resistanceLevels,
      pivot_point: pivotPoint,
      support_1: support1,
      support_2: support2,
      resistance_1: resistance1,
      resistance_2: resistance2
    };
  }

  /**
   * Generate analysis factors based on technical indicators
   */
  private static generateAnalysisFactors(
    priceData: PriceData[],
    trendIndicators: Record<string, number>,
    momentumIndicators: Record<string, number>,
    volumeIndicators: Record<string, number>,
    supportResistance: SupportResistance,
    analysisContext: 'investment' | 'trading',
    timeframe: string
  ): AnalysisFactor[] {
    const factors: AnalysisFactor[] = [];
    const currentPrice = priceData[priceData.length - 1]?.close || 0;
    
    // Trend factors
    if (currentPrice > trendIndicators.sma_20 && trendIndicators.sma_20 > trendIndicators.sma_50) {
      factors.push({
        category: 'technical',
        type: 'positive',
        description: 'Price above short-term moving averages with bullish alignment',
        weight: analysisContext === 'trading' ? 0.9 : 0.7,
        confidence: 0.8
      });
    }
    
    if (currentPrice < trendIndicators.sma_20 && trendIndicators.sma_20 < trendIndicators.sma_50) {
      factors.push({
        category: 'technical',
        type: 'negative',
        description: 'Price below short-term moving averages with bearish alignment',
        weight: analysisContext === 'trading' ? 0.9 : 0.6,
        confidence: 0.8
      });
    }

    // MACD factors
    if (trendIndicators.macd > trendIndicators.macd_signal && trendIndicators.macd_histogram > 0) {
      factors.push({
        category: 'technical',
        type: 'positive',
        description: 'MACD showing bullish momentum with positive histogram',
        weight: 0.8,
        confidence: 0.7
      });
    }

    // RSI factors
    if (momentumIndicators.rsi < 30) {
      factors.push({
        category: 'technical',
        type: 'positive',
        description: `RSI oversold at ${momentumIndicators.rsi.toFixed(1)}, potential reversal`,
        weight: 0.7,
        confidence: 0.8
      });
    } else if (momentumIndicators.rsi > 70) {
      factors.push({
        category: 'technical',
        type: 'negative',
        description: `RSI overbought at ${momentumIndicators.rsi.toFixed(1)}, potential pullback`,
        weight: 0.7,
        confidence: 0.8
      });
    }

    // Bollinger Bands factors
    if (currentPrice < trendIndicators.bollinger_lower) {
      factors.push({
        category: 'technical',
        type: 'positive',
        description: 'Price below lower Bollinger Band, potential bounce',
        weight: 0.6,
        confidence: 0.7
      });
    } else if (currentPrice > trendIndicators.bollinger_upper) {
      factors.push({
        category: 'technical',
        type: 'negative',
        description: 'Price above upper Bollinger Band, potential pullback',
        weight: 0.6,
        confidence: 0.7
      });
    }

    // Volume factors
    if (volumeIndicators.volume_ratio > 1.5) {
      factors.push({
        category: 'technical',
        type: 'positive',
        description: `High volume confirmation with ${(volumeIndicators.volume_ratio * 100).toFixed(0)}% above average`,
        weight: 0.6,
        confidence: 0.8
      });
    }

    // Support/Resistance factors
    const nearSupport = supportResistance.support_levels.some(level => 
      Math.abs(currentPrice - level) / currentPrice < 0.02
    );
    const nearResistance = supportResistance.resistance_levels.some(level => 
      Math.abs(currentPrice - level) / currentPrice < 0.02
    );

    if (nearSupport) {
      factors.push({
        category: 'technical',
        type: 'positive',
        description: 'Price near key support level, potential bounce',
        weight: 0.7,
        confidence: 0.8
      });
    }

    if (nearResistance) {
      factors.push({
        category: 'technical',
        type: 'negative',
        description: 'Price near key resistance level, potential rejection',
        weight: 0.7,
        confidence: 0.8
      });
    }

    return factors;
  }

  /**
   * Calculate overall technical score
   */
  private static calculateOverallScore(
    factors: AnalysisFactor[],
    analysisContext: 'investment' | 'trading',
    timeframe: string
  ): number {
    if (factors.length === 0) return 50; // Neutral score if no factors

    let totalScore = 0;
    let totalWeight = 0;

    for (const factor of factors) {
      const factorScore = factor.type === 'positive' ? 80 : 20;
      let adjustedWeight = factor.weight * factor.confidence;
      
      // Adjust weight based on timeframe
      if (timeframe === '1D' || timeframe === '1W') {
        adjustedWeight *= 1.2; // Increase weight for short-term analysis
      }
      
      totalScore += factorScore * adjustedWeight;
      totalWeight += adjustedWeight;
    }

    const rawScore = totalWeight > 0 ? totalScore / totalWeight : 50;
    
    // Adjust score based on analysis context
    const contextMultiplier = analysisContext === 'trading' ? 1.0 : 0.9;
    
    return Math.round(Math.max(0, Math.min(100, rawScore * contextMultiplier)));
  }

  /**
   * Calculate confidence based on data quality and timeframe
   */
  private static calculateConfidence(priceData: PriceData[], timeframe: string): number {
    let confidence = 1.0;

    // Reduce confidence for limited data
    if (priceData.length < 50) confidence *= 0.8;
    if (priceData.length < 20) confidence *= 0.7;

    // Adjust confidence based on timeframe
    switch (timeframe) {
      case '1D':
        confidence *= 0.7; // Lower confidence for very short-term
        break;
      case '1W':
        confidence *= 0.8;
        break;
      case '1M':
        confidence *= 0.9;
        break;
      default:
        confidence *= 1.0;
    }

    // Check data quality
    const hasZeroVolume = priceData.some(d => d.volume === 0);
    if (hasZeroVolume) confidence *= 0.8;

    const hasInvalidPrices = priceData.some(d => d.high < d.low || d.close === 0);
    if (hasInvalidPrices) confidence *= 0.6;

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  // Technical indicator calculation methods
  private static calculateSMA(values: number[], period: number): number {
    if (values.length < period) return 0;
    const slice = values.slice(-period);
    return slice.reduce((sum, val) => sum + val, 0) / period;
  }

  private static calculateEMA(values: number[], period: number): number {
    if (values.length < period) return 0;
    
    const multiplier = 2 / (period + 1);
    let ema = this.calculateSMA(values.slice(0, period), period);
    
    for (let i = period; i < values.length; i++) {
      ema = (values[i] * multiplier) + (ema * (1 - multiplier));
    }
    
    return ema;
  }

  private static calculateRSI(values: number[], period: number): number {
    if (values.length < period + 1) return 50;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = values.length - period; i < values.length; i++) {
      const change = values[i] - values[i - 1];
      if (change > 0) gains += change;
      else losses -= change;
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  private static calculateMACD(values: number[]): { macd: number; signal: number; histogram: number } {
    const ema12 = this.calculateEMA(values, 12);
    const ema26 = this.calculateEMA(values, 26);
    const macd = ema12 - ema26;
    
    // Calculate signal line (9-period EMA of MACD)
    const macdValues = [macd]; // Simplified for single point
    const signal = macd; // Simplified
    const histogram = macd - signal;
    
    return { macd, signal, histogram };
  }

  private static calculateBollingerBands(values: number[], period: number = 20, stdDev: number = 2): 
    { upper: number; middle: number; lower: number } {
    const middle = this.calculateSMA(values, period);
    
    if (values.length < period) {
      return { upper: middle, middle, lower: middle };
    }
    
    const slice = values.slice(-period);
    const variance = slice.reduce((sum, val) => sum + Math.pow(val - middle, 2), 0) / period;
    const standardDeviation = Math.sqrt(variance);
    
    return {
      upper: middle + (standardDeviation * stdDev),
      middle,
      lower: middle - (standardDeviation * stdDev)
    };
  }

  private static calculateStochastic(highs: number[], lows: number[], closes: number[], period: number): 
    { k: number; d: number } {
    if (highs.length < period) return { k: 50, d: 50 };
    
    const recentHighs = highs.slice(-period);
    const recentLows = lows.slice(-period);
    const currentClose = closes[closes.length - 1];
    
    const highestHigh = Math.max(...recentHighs);
    const lowestLow = Math.min(...recentLows);
    
    const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
    const d = k; // Simplified - would normally be 3-period SMA of %K
    
    return { k, d };
  }

  private static calculateWilliamsR(highs: number[], lows: number[], closes: number[], period: number): number {
    if (highs.length < period) return -50;
    
    const recentHighs = highs.slice(-period);
    const recentLows = lows.slice(-period);
    const currentClose = closes[closes.length - 1];
    
    const highestHigh = Math.max(...recentHighs);
    const lowestLow = Math.min(...recentLows);
    
    return ((highestHigh - currentClose) / (highestHigh - lowestLow)) * -100;
  }

  private static calculateATR(priceData: PriceData[], period: number): number {
    if (priceData.length < period + 1) return 0;
    
    const trueRanges = [];
    
    for (let i = 1; i < priceData.length; i++) {
      const current = priceData[i];
      const previous = priceData[i - 1];
      
      const tr1 = current.high - current.low;
      const tr2 = Math.abs(current.high - previous.close);
      const tr3 = Math.abs(current.low - previous.close);
      
      trueRanges.push(Math.max(tr1, tr2, tr3));
    }
    
    return this.calculateSMA(trueRanges, period);
  }

  private static calculateOBV(priceData: PriceData[]): number {
    let obv = 0;
    
    for (let i = 1; i < priceData.length; i++) {
      if (priceData[i].close > priceData[i - 1].close) {
        obv += priceData[i].volume;
      } else if (priceData[i].close < priceData[i - 1].close) {
        obv -= priceData[i].volume;
      }
    }
    
    return obv;
  }

  private static calculateVPT(priceData: PriceData[]): number {
    let vpt = 0;
    
    for (let i = 1; i < priceData.length; i++) {
      const priceChange = (priceData[i].close - priceData[i - 1].close) / priceData[i - 1].close;
      vpt += priceChange * priceData[i].volume;
    }
    
    return vpt;
  }

  private static calculateAD(priceData: PriceData[]): number {
    let ad = 0;
    
    for (const data of priceData) {
      if (data.high !== data.low) {
        const clv = ((data.close - data.low) - (data.high - data.close)) / (data.high - data.low);
        ad += clv * data.volume;
      }
    }
    
    return ad;
  }

  private static findSupportLevels(lows: number[]): number[] {
    const levels: number[] = [];
    
    for (let i = 1; i < lows.length - 1; i++) {
      if (lows[i] < lows[i - 1] && lows[i] < lows[i + 1]) {
        levels.push(lows[i]);
      }
    }
    
    return levels.slice(-3); // Return last 3 support levels
  }

  private static findResistanceLevels(highs: number[]): number[] {
    const levels: number[] = [];
    
    for (let i = 1; i < highs.length - 1; i++) {
      if (highs[i] > highs[i - 1] && highs[i] > highs[i + 1]) {
        levels.push(highs[i]);
      }
    }
    
    return levels.slice(-3); // Return last 3 resistance levels
  }
}

/**
 * Main request handler for technical analysis
 */
const handleTechnicalAnalysis = async (request: Request, requestId: string): Promise<Response> => {
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

    const { ticker_symbol, api_key, analysis_context, trading_timeframe } = body;

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

    // Validate trading timeframe if provided
    if (trading_timeframe && !['1D', '1W', '1M', '3M', '6M', '1Y'].includes(trading_timeframe)) {
      throw new AppError(
        ERROR_CODES.INVALID_PARAMETER,
        'trading_timeframe must be one of: 1D, 1W, 1M, 3M, 6M, 1Y'
      );
    }

    console.log(`Starting technical analysis for ${ticker_symbol} (${analysis_context}, ${trading_timeframe || 'default'}) - Request ${requestId}`);

    // Perform technical analysis
    const analysisResult = await TechnicalAnalysisEngine.analyze(
      ticker_symbol,
      api_key,
      analysis_context,
      trading_timeframe
    );

    console.log(`Technical analysis completed for ${ticker_symbol} - Score: ${analysisResult.score} - Request ${requestId}`);

    return createSuccessHttpResponse(analysisResult, requestId);

  } catch (error) {
    console.error(`Technical analysis failed for request ${requestId}:`, error);
    return createErrorHttpResponse(error, requestId);
  }
};

// Create and serve the request handler
const handler = createRequestHandler(handleTechnicalAnalysis, ['POST']);

serve(handler);