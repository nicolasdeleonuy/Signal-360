// Specialized caching layer for analysis functions
// Provides intelligent caching strategies for different types of financial data

import { MemoryCache, CacheManager, CacheKeyGenerators, CacheTTL } from './cache.ts';
import { Logger } from './logging.ts';
import { PerformanceMetrics } from './performance.ts';

/**
 * Analysis cache configuration
 */
export interface AnalysisCacheConfig {
  enableMarketDataCache: boolean;
  enableFundamentalsCache: boolean;
  enableTechnicalCache: boolean;
  enableESGCache: boolean;
  enableSynthesisCache: boolean;
  enableIdeaCache: boolean;
  maxCacheSize: number;
  defaultTTL: number;
}

/**
 * Cache invalidation strategies
 */
export enum CacheInvalidationStrategy {
  TIME_BASED = 'time_based',
  EVENT_BASED = 'event_based',
  MANUAL = 'manual'
}

/**
 * Analysis cache manager
 */
export class AnalysisCacheManager {
  private marketDataCache: MemoryCache;
  private fundamentalsCache: MemoryCache;
  private technicalCache: MemoryCache;
  private esgCache: MemoryCache;
  private synthesisCache: MemoryCache;
  private ideaCache: MemoryCache;
  private userApiKeyCache: MemoryCache;
  
  private config: AnalysisCacheConfig;
  private logger: Logger;

  constructor(config: Partial<AnalysisCacheConfig> = {}) {
    this.config = {
      enableMarketDataCache: true,
      enableFundamentalsCache: true,
      enableTechnicalCache: true,
      enableESGCache: true,
      enableSynthesisCache: true,
      enableIdeaCache: true,
      maxCacheSize: 1000,
      defaultTTL: CacheTTL.DEFAULT,
      ...config
    };

    this.logger = new Logger('AnalysisCacheManager');
    this.initializeCaches();
  }

  /**
   * Initialize all cache instances
   */
  private initializeCaches(): void {
    const cacheConfig = {
      maxSize: this.config.maxCacheSize,
      defaultTtl: this.config.defaultTTL,
      maxMemoryMB: 50,
      cleanupInterval: 60000,
      enableMetrics: true
    };

    this.marketDataCache = CacheManager.getCache('market-data', {
      ...cacheConfig,
      defaultTtl: CacheTTL.MARKET_DATA
    });

    this.fundamentalsCache = CacheManager.getCache('fundamentals', {
      ...cacheConfig,
      defaultTtl: CacheTTL.FUNDAMENTALS
    });

    this.technicalCache = CacheManager.getCache('technical', {
      ...cacheConfig,
      defaultTtl: CacheTTL.TECHNICAL_1D
    });

    this.esgCache = CacheManager.getCache('esg', {
      ...cacheConfig,
      defaultTtl: CacheTTL.ESG_DATA
    });

    this.synthesisCache = CacheManager.getCache('synthesis', {
      ...cacheConfig,
      defaultTtl: CacheTTL.ANALYSIS_RESULTS
    });

    this.ideaCache = CacheManager.getCache('ideas', {
      ...cacheConfig,
      defaultTtl: CacheTTL.IDEAS
    });

    this.userApiKeyCache = CacheManager.getCache('user-api-keys', {
      ...cacheConfig,
      defaultTtl: CacheTTL.USER_API_KEY,
      maxSize: 500 // Smaller cache for API keys
    });

    this.logger.info('Analysis cache manager initialized');
  }

  /**
   * Cache market data
   */
  cacheMarketData(ticker: string, dataType: string, data: any, timeframe?: string): void {
    if (!this.config.enableMarketDataCache) return;

    const key = CacheKeyGenerators.marketData(ticker, dataType, timeframe);
    const ttl = this.getMarketDataTTL(dataType, timeframe);
    
    this.marketDataCache.set(key, data, ttl);
    PerformanceMetrics.record('cache_set_market_data', 0);
    
    this.logger.debug(`Cached market data: ${key}`);
  }

  /**
   * Get cached market data
   */
  getMarketData(ticker: string, dataType: string, timeframe?: string): any | null {
    if (!this.config.enableMarketDataCache) return null;

    const key = CacheKeyGenerators.marketData(ticker, dataType, timeframe);
    const data = this.marketDataCache.get(key);
    
    if (data) {
      PerformanceMetrics.record('cache_hit_market_data', 0);
      this.logger.debug(`Cache hit for market data: ${key}`);
    } else {
      PerformanceMetrics.record('cache_miss_market_data', 0);
    }
    
    return data;
  }

  /**
   * Cache fundamental analysis data
   */
  cacheFundamentals(ticker: string, data: any): void {
    if (!this.config.enableFundamentalsCache) return;

    const key = CacheKeyGenerators.fundamentals(ticker);
    this.fundamentalsCache.set(key, data, CacheTTL.FUNDAMENTALS);
    
    this.logger.debug(`Cached fundamentals: ${key}`);
  }

  /**
   * Get cached fundamental analysis data
   */
  getFundamentals(ticker: string): any | null {
    if (!this.config.enableFundamentalsCache) return null;

    const key = CacheKeyGenerators.fundamentals(ticker);
    return this.fundamentalsCache.get(key);
  }

  /**
   * Cache technical analysis data
   */
  cacheTechnical(ticker: string, indicator: string, timeframe: string, data: any): void {
    if (!this.config.enableTechnicalCache) return;

    const key = CacheKeyGenerators.technical(ticker, indicator, timeframe);
    const ttl = this.getTechnicalTTL(timeframe);
    
    this.technicalCache.set(key, data, ttl);
    this.logger.debug(`Cached technical data: ${key}`);
  }

  /**
   * Get cached technical analysis data
   */
  getTechnical(ticker: string, indicator: string, timeframe: string): any | null {
    if (!this.config.enableTechnicalCache) return null;

    const key = CacheKeyGenerators.technical(ticker, indicator, timeframe);
    return this.technicalCache.get(key);
  }

  /**
   * Cache ESG data
   */
  cacheESG(ticker: string, data: any): void {
    if (!this.config.enableESGCache) return;

    const key = CacheKeyGenerators.esg(ticker);
    this.esgCache.set(key, data, CacheTTL.ESG_DATA);
    
    this.logger.debug(`Cached ESG data: ${key}`);
  }

  /**
   * Get cached ESG data
   */
  getESG(ticker: string): any | null {
    if (!this.config.enableESGCache) return null;

    const key = CacheKeyGenerators.esg(ticker);
    return this.esgCache.get(key);
  }

  /**
   * Cache synthesis results
   */
  cacheSynthesis(ticker: string, context: string, timeframe: string | undefined, data: any): void {
    if (!this.config.enableSynthesisCache) return;

    const key = CacheKeyGenerators.analysis(ticker, context, timeframe);
    this.synthesisCache.set(key, data, CacheTTL.ANALYSIS_RESULTS);
    
    this.logger.debug(`Cached synthesis: ${key}`);
  }

  /**
   * Get cached synthesis results
   */
  getSynthesis(ticker: string, context: string, timeframe?: string): any | null {
    if (!this.config.enableSynthesisCache) return null;

    const key = CacheKeyGenerators.analysis(ticker, context, timeframe);
    return this.synthesisCache.get(key);
  }

  /**
   * Cache idea generation results
   */
  cacheIdeas(context: string, timeframe: string | undefined, data: any): void {
    if (!this.config.enableIdeaCache) return;

    const key = CacheKeyGenerators.ideas(context, timeframe);
    this.ideaCache.set(key, data, CacheTTL.IDEAS);
    
    this.logger.debug(`Cached ideas: ${key}`);
  }

  /**
   * Get cached idea generation results
   */
  getIdeas(context: string, timeframe?: string): any | null {
    if (!this.config.enableIdeaCache) return null;

    const key = CacheKeyGenerators.ideas(context, timeframe);
    return this.ideaCache.get(key);
  }

  /**
   * Cache user API key
   */
  cacheUserApiKey(userId: string, apiKey: string): void {
    const key = CacheKeyGenerators.userApiKey(userId);
    this.userApiKeyCache.set(key, apiKey, CacheTTL.USER_API_KEY);
    
    this.logger.debug(`Cached user API key: ${userId}`);
  }

  /**
   * Get cached user API key
   */
  getUserApiKey(userId: string): string | null {
    const key = CacheKeyGenerators.userApiKey(userId);
    return this.userApiKeyCache.get(key);
  }

  /**
   * Invalidate cache for ticker
   */
  invalidateTicker(ticker: string): void {
    const patterns = [
      `market:${ticker}:`,
      `fundamentals:${ticker}`,
      `esg:${ticker}`,
      `technical:${ticker}:`,
      `analysis:${ticker}:`
    ];

    this.invalidateByPatterns(patterns);
    this.logger.info(`Invalidated cache for ticker: ${ticker}`);
  }

  /**
   * Invalidate cache by patterns
   */
  private invalidateByPatterns(patterns: string[]): void {
    const caches = [
      this.marketDataCache,
      this.fundamentalsCache,
      this.technicalCache,
      this.esgCache,
      this.synthesisCache
    ];

    for (const cache of caches) {
      const keys = cache.keys();
      for (const key of keys) {
        if (patterns.some(pattern => key.startsWith(pattern))) {
          cache.delete(key);
        }
      }
    }
  }

  /**
   * Get market data TTL based on data type and timeframe
   */
  private getMarketDataTTL(dataType: string, timeframe?: string): number {
    if (dataType === 'price' || dataType === 'quote') {
      return CacheTTL.PRICE_DATA;
    }

    if (timeframe) {
      switch (timeframe) {
        case '1D': return CacheTTL.TECHNICAL_1D;
        case '1W': return CacheTTL.TECHNICAL_1W;
        case '1M': return CacheTTL.TECHNICAL_1M;
        default: return CacheTTL.MARKET_DATA;
      }
    }

    return CacheTTL.MARKET_DATA;
  }

  /**
   * Get technical analysis TTL based on timeframe
   */
  private getTechnicalTTL(timeframe: string): number {
    switch (timeframe) {
      case '1D': return CacheTTL.TECHNICAL_1D;
      case '1W': return CacheTTL.TECHNICAL_1W;
      case '1M': return CacheTTL.TECHNICAL_1M;
      default: return CacheTTL.TECHNICAL_1D;
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): Record<string, any> {
    return {
      marketData: this.marketDataCache.getStats(),
      fundamentals: this.fundamentalsCache.getStats(),
      technical: this.technicalCache.getStats(),
      esg: this.esgCache.getStats(),
      synthesis: this.synthesisCache.getStats(),
      ideas: this.ideaCache.getStats(),
      userApiKeys: this.userApiKeyCache.getStats()
    };
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    this.marketDataCache.clear();
    this.fundamentalsCache.clear();
    this.technicalCache.clear();
    this.esgCache.clear();
    this.synthesisCache.clear();
    this.ideaCache.clear();
    this.userApiKeyCache.clear();
    
    this.logger.info('Cleared all analysis caches');
  }

  /**
   * Warm up cache with common data
   */
  async warmUp(commonTickers: string[] = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA']): Promise<void> {
    this.logger.info('Starting cache warm-up');
    
    // This would typically pre-load common data
    // For now, we'll just log the intent
    for (const ticker of commonTickers) {
      this.logger.debug(`Would warm up cache for ticker: ${ticker}`);
    }
    
    this.logger.info('Cache warm-up completed');
  }
}

/**
 * Cache-aware wrapper for analysis functions
 */
export class CachedAnalysisService {
  private cacheManager: AnalysisCacheManager;
  private logger: Logger;

  constructor(cacheManager?: AnalysisCacheManager) {
    this.cacheManager = cacheManager || new AnalysisCacheManager();
    this.logger = new Logger('CachedAnalysisService');
  }

  /**
   * Cached fundamental analysis
   */
  async getFundamentalAnalysis(
    ticker: string,
    fetcher: () => Promise<any>
  ): Promise<any> {
    const startTime = performance.now();
    
    // Try cache first
    const cached = this.cacheManager.getFundamentals(ticker);
    if (cached) {
      PerformanceMetrics.record('fundamental_analysis_cache_hit', performance.now() - startTime);
      return cached;
    }

    // Fetch and cache
    const data = await fetcher();
    this.cacheManager.cacheFundamentals(ticker, data);
    
    PerformanceMetrics.record('fundamental_analysis_cache_miss', performance.now() - startTime);
    return data;
  }

  /**
   * Cached technical analysis
   */
  async getTechnicalAnalysis(
    ticker: string,
    indicator: string,
    timeframe: string,
    fetcher: () => Promise<any>
  ): Promise<any> {
    const startTime = performance.now();
    
    // Try cache first
    const cached = this.cacheManager.getTechnical(ticker, indicator, timeframe);
    if (cached) {
      PerformanceMetrics.record('technical_analysis_cache_hit', performance.now() - startTime);
      return cached;
    }

    // Fetch and cache
    const data = await fetcher();
    this.cacheManager.cacheTechnical(ticker, indicator, timeframe, data);
    
    PerformanceMetrics.record('technical_analysis_cache_miss', performance.now() - startTime);
    return data;
  }

  /**
   * Cached ESG analysis
   */
  async getESGAnalysis(
    ticker: string,
    fetcher: () => Promise<any>
  ): Promise<any> {
    const startTime = performance.now();
    
    // Try cache first
    const cached = this.cacheManager.getESG(ticker);
    if (cached) {
      PerformanceMetrics.record('esg_analysis_cache_hit', performance.now() - startTime);
      return cached;
    }

    // Fetch and cache
    const data = await fetcher();
    this.cacheManager.cacheESG(ticker, data);
    
    PerformanceMetrics.record('esg_analysis_cache_miss', performance.now() - startTime);
    return data;
  }

  /**
   * Cached synthesis
   */
  async getSynthesis(
    ticker: string,
    context: string,
    timeframe: string | undefined,
    synthesizer: () => Promise<any>
  ): Promise<any> {
    const startTime = performance.now();
    
    // Try cache first
    const cached = this.cacheManager.getSynthesis(ticker, context, timeframe);
    if (cached) {
      PerformanceMetrics.record('synthesis_cache_hit', performance.now() - startTime);
      return cached;
    }

    // Synthesize and cache
    const data = await synthesizer();
    this.cacheManager.cacheSynthesis(ticker, context, timeframe, data);
    
    PerformanceMetrics.record('synthesis_cache_miss', performance.now() - startTime);
    return data;
  }

  /**
   * Cached ideas
   */
  async getIdeas(
    context: string,
    timeframe: string | undefined,
    generator: () => Promise<any>
  ): Promise<any> {
    const startTime = performance.now();
    
    // Try cache first
    const cached = this.cacheManager.getIdeas(context, timeframe);
    if (cached) {
      PerformanceMetrics.record('ideas_cache_hit', performance.now() - startTime);
      return cached;
    }

    // Generate and cache
    const data = await generator();
    this.cacheManager.cacheIdeas(context, timeframe, data);
    
    PerformanceMetrics.record('ideas_cache_miss', performance.now() - startTime);
    return data;
  }

  /**
   * Get cache manager
   */
  getCacheManager(): AnalysisCacheManager {
    return this.cacheManager;
  }
}

/**
 * Global analysis cache instance
 */
export const globalAnalysisCache = new AnalysisCacheManager();

/**
 * Global cached analysis service
 */
export const globalCachedAnalysisService = new CachedAnalysisService(globalAnalysisCache);