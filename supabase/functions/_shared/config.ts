// Configuration utilities for Edge Functions
// Centralized environment configuration and constants

/**
 * Environment configuration interface
 */
export interface Config {
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey: string;
  };
  external: {
    apiTimeout: number;
    maxRetries: number;
    baseRetryDelay: number;
  };
  analysis: {
    cacheTimeout: {
      marketData: number; // 5 minutes
      fundamentals: number; // 1 hour
      esgData: number; // 24 hours
    };
    weighting: {
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
    };
  };
  security: {
    encryptionKey: string;
    rateLimits: {
      perUser: number; // requests per hour
      perIP: number; // requests per hour
      burst: number; // requests per minute
    };
  };
}

/**
 * Load and validate environment configuration
 * @returns Config object with all required settings
 * @throws Error if required environment variables are missing
 */
export function loadConfig(): Config {
  const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];

  // Check for required environment variables
  for (const envVar of requiredEnvVars) {
    if (!Deno.env.get(envVar)) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }

  return {
    supabase: {
      url: Deno.env.get('SUPABASE_URL')!,
      anonKey: Deno.env.get('SUPABASE_ANON_KEY')!,
      serviceRoleKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    },
    external: {
      apiTimeout: parseInt(Deno.env.get('EXTERNAL_API_TIMEOUT') || '30000'),
      maxRetries: parseInt(Deno.env.get('MAX_RETRIES') || '3'),
      baseRetryDelay: parseInt(Deno.env.get('BASE_RETRY_DELAY') || '1000')
    },
    analysis: {
      cacheTimeout: {
        marketData: parseInt(Deno.env.get('MARKET_DATA_CACHE_TIMEOUT') || '300000'), // 5 minutes
        fundamentals: parseInt(Deno.env.get('FUNDAMENTALS_CACHE_TIMEOUT') || '3600000'), // 1 hour
        esgData: parseInt(Deno.env.get('ESG_DATA_CACHE_TIMEOUT') || '86400000') // 24 hours
      },
      weighting: {
        investment: {
          fundamental: parseFloat(Deno.env.get('INVESTMENT_FUNDAMENTAL_WEIGHT') || '0.5'),
          technical: parseFloat(Deno.env.get('INVESTMENT_TECHNICAL_WEIGHT') || '0.2'),
          esg: parseFloat(Deno.env.get('INVESTMENT_ESG_WEIGHT') || '0.3')
        },
        trading: {
          fundamental: parseFloat(Deno.env.get('TRADING_FUNDAMENTAL_WEIGHT') || '0.25'),
          technical: parseFloat(Deno.env.get('TRADING_TECHNICAL_WEIGHT') || '0.6'),
          esg: parseFloat(Deno.env.get('TRADING_ESG_WEIGHT') || '0.15')
        }
      }
    },
    security: {
      encryptionKey: Deno.env.get('ENCRYPTION_KEY') || 'default-dev-key-not-for-production',
      rateLimits: {
        perUser: parseInt(Deno.env.get('RATE_LIMIT_PER_USER') || '100'),
        perIP: parseInt(Deno.env.get('RATE_LIMIT_PER_IP') || '1000'),
        burst: parseInt(Deno.env.get('RATE_LIMIT_BURST') || '10')
      }
    }
  };
}

/**
 * Validate configuration values
 * @param config Configuration to validate
 * @throws Error if configuration is invalid
 */
export function validateConfig(config: Config): void {
  // Validate weighting sums to 1.0
  const investmentSum = config.analysis.weighting.investment.fundamental +
                       config.analysis.weighting.investment.technical +
                       config.analysis.weighting.investment.esg;
  
  const tradingSum = config.analysis.weighting.trading.fundamental +
                    config.analysis.weighting.trading.technical +
                    config.analysis.weighting.trading.esg;

  if (Math.abs(investmentSum - 1.0) > 0.01) {
    throw new Error(`Investment weighting must sum to 1.0, got ${investmentSum}`);
  }

  if (Math.abs(tradingSum - 1.0) > 0.01) {
    throw new Error(`Trading weighting must sum to 1.0, got ${tradingSum}`);
  }

  // Validate positive values
  if (config.external.apiTimeout <= 0) {
    throw new Error('API timeout must be positive');
  }

  if (config.external.maxRetries < 0) {
    throw new Error('Max retries must be non-negative');
  }

  // Validate cache timeouts
  if (config.analysis.cacheTimeout.marketData <= 0 ||
      config.analysis.cacheTimeout.fundamentals <= 0 ||
      config.analysis.cacheTimeout.esgData <= 0) {
    throw new Error('Cache timeouts must be positive');
  }

  // Validate rate limits
  if (config.security.rateLimits.perUser <= 0 ||
      config.security.rateLimits.perIP <= 0 ||
      config.security.rateLimits.burst <= 0) {
    throw new Error('Rate limits must be positive');
  }
}

/**
 * Global configuration instance
 */
let globalConfig: Config | null = null;

/**
 * Get global configuration (lazy loaded)
 * @returns Config object
 */
export function getConfig(): Config {
  if (!globalConfig) {
    globalConfig = loadConfig();
    validateConfig(globalConfig);
  }
  return globalConfig;
}

/**
 * Constants used throughout the application
 */
export const CONSTANTS = {
  API_VERSION: '1.0.0',
  
  TICKER_PATTERNS: {
    VALID: /^[A-Z]{1,5}$/,
    SANITIZE: /[^A-Z]/g
  },
  
  TIMEFRAMES: {
    VALID: ['1D', '1W', '1M', '3M', '6M', '1Y'],
    DEFAULT_TRADING: '1D',
    DEFAULT_INVESTMENT: '1Y'
  },
  
  ANALYSIS_CONTEXTS: {
    INVESTMENT: 'investment' as const,
    TRADING: 'trading' as const
  },
  
  SCORE_RANGES: {
    MIN: 0,
    MAX: 100,
    STRONG_BUY: 80,
    BUY: 60,
    HOLD: 40,
    SELL: 20
  },
  
  CONFIDENCE_RANGES: {
    MIN: 0,
    MAX: 1,
    HIGH: 0.8,
    MEDIUM: 0.6,
    LOW: 0.4
  },
  
  GOOGLE_API_KEY: {
    PATTERN: /^AIza[0-9A-Za-z-_]{35}$/,
    LENGTH: 39
  },
  
  REQUEST_LIMITS: {
    MAX_BODY_SIZE: 1024 * 1024, // 1MB
    MAX_TIMEOUT: 60000, // 60 seconds
    DEFAULT_TIMEOUT: 30000 // 30 seconds
  }
} as const;

/**
 * Get recommendation based on synthesis score
 * @param score Synthesis score (0-100)
 * @returns Recommendation string
 */
export function getRecommendation(score: number): 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell' {
  if (score >= CONSTANTS.SCORE_RANGES.STRONG_BUY) return 'strong_buy';
  if (score >= CONSTANTS.SCORE_RANGES.BUY) return 'buy';
  if (score >= CONSTANTS.SCORE_RANGES.HOLD) return 'hold';
  if (score >= CONSTANTS.SCORE_RANGES.SELL) return 'sell';
  return 'strong_sell';
}

/**
 * Get confidence level based on confidence score
 * @param confidence Confidence score (0-1)
 * @returns Confidence level string
 */
export function getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
  if (confidence >= CONSTANTS.CONFIDENCE_RANGES.HIGH) return 'high';
  if (confidence >= CONSTANTS.CONFIDENCE_RANGES.MEDIUM) return 'medium';
  return 'low';
}