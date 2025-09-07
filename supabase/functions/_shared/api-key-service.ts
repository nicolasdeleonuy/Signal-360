// API Key Service for Signal-360 Analysis Pipeline
// Provides secure API key retrieval and decryption for analysis functions

import {
  AppError,
  ERROR_CODES,
  createServiceClient,
  withRetryAndTimeout,
  DEFAULT_RETRY_CONFIG,
  createLogger,
  Logger
} from './index.ts';

import {
  AnalysisError,
  AnalysisStage,
  ANALYSIS_ERROR_CODES,
  callExternalAnalysisAPI
} from './analysis-error-handler.ts';

/**
 * API Key information interface
 */
export interface ApiKeyInfo {
  encrypted_key: string;
  key_type: 'google_api' | 'financial_data' | 'news_api';
  created_at: string;
  last_used?: string;
  usage_count: number;
  is_active: boolean;
}

/**
 * Decrypted API key result
 */
export interface DecryptedApiKey {
  api_key: string;
  key_type: string;
  user_id: string;
  expires_at?: string;
}

/**
 * API Key validation result
 */
export interface ApiKeyValidation {
  is_valid: boolean;
  key_type: 'google_api' | 'financial_data' | 'news_api' | 'unknown';
  format_valid: boolean;
  length_valid: boolean;
  prefix_valid: boolean;
  errors: string[];
}

/**
 * In-memory cache for decrypted API keys
 * Keys are cached for a short time to avoid repeated decryption
 */
class ApiKeyCache {
  private static cache = new Map<string, { key: string; expires: number }>();
  private static readonly TTL = 60 * 60 * 1000; // 1 hour TTL

  /**
   * Get cached API key
   * @param cacheKey Cache key (userId:keyType)
   * @returns string | null Cached API key or null if not found/expired
   */
  static get(cacheKey: string): string | null {
    const cached = this.cache.get(cacheKey);
    if (!cached) return null;

    if (Date.now() > cached.expires) {
      this.cache.delete(cacheKey);
      return null;
    }

    return cached.key;
  }

  /**
   * Set cached API key
   * @param cacheKey Cache key (userId:keyType)
   * @param apiKey Decrypted API key
   */
  static set(cacheKey: string, apiKey: string): void {
    this.cache.set(cacheKey, {
      key: apiKey,
      expires: Date.now() + this.TTL
    });
  }

  /**
   * Clear cached API key
   * @param cacheKey Cache key (userId:keyType)
   */
  static clear(cacheKey: string): void {
    this.cache.delete(cacheKey);
  }

  /**
   * Clear all cached keys (for cleanup)
   */
  static clearAll(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   * @returns object Cache statistics
   */
  static getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

/**
 * Enhanced API Key Service for secure key management in analysis pipeline
 */
export class ApiKeyService {
  private supabase: any;
  private logger: Logger;

  constructor(logger?: Logger) {
    this.supabase = createServiceClient();
    this.logger = logger || createLogger('api-key-service');
  }

  /**
   * Retrieve and decrypt API key for a user with caching
   * @param userId User ID to retrieve API key for
   * @param keyType Type of API key to retrieve
   * @param requestId Request ID for tracking
   * @returns Promise<DecryptedApiKey> Decrypted API key information
   */
  async getDecryptedApiKey(
    userId: string,
    keyType: 'google_api' | 'financial_data' | 'news_api' = 'google_api',
    requestId?: string
  ): Promise<DecryptedApiKey> {
    const startTime = performance.now();
    const cacheKey = `${userId}:${keyType}`;
    
    try {
      this.logger.info('Retrieving API key', { userId, keyType, requestId });

      // Check cache first
      const cachedKey = ApiKeyCache.get(cacheKey);
      if (cachedKey) {
        this.logger.info('API key retrieved from cache', { userId, keyType, requestId });
        return {
          api_key: cachedKey,
          key_type: keyType,
          user_id: userId
        };
      }

      // First, retrieve the encrypted API key from database
      const apiKeyInfo = await this.retrieveEncryptedApiKey(userId, keyType);

      // Then decrypt the API key using the decryption service
      const decryptedKey = await this.decryptApiKey(apiKeyInfo.encrypted_key, requestId);

      // Validate the decrypted key
      const validation = this.validateApiKey(decryptedKey.api_key);
      if (!validation.is_valid) {
        throw new AnalysisError(
          ANALYSIS_ERROR_CODES.INVALID_API_KEY,
          'Decrypted API key is invalid',
          AnalysisStage.API_KEY_DECRYPTION,
          validation.errors.join(', '),
          undefined,
          undefined,
          undefined
        );
      }

      // Cache the decrypted key
      ApiKeyCache.set(cacheKey, decryptedKey.api_key);

      // Test the API key functionality
      const isWorking = await this.testApiKey(decryptedKey.api_key, keyType);
      if (!isWorking) {
        this.logger.warn('API key validation passed but functionality test failed', { 
          userId, 
          keyType, 
          requestId 
        });
        // Don't throw error, just log warning - key might work for actual requests
      }

      // Update last used timestamp
      await this.updateApiKeyUsage(userId, keyType);

      this.logger.info('API key retrieved and decrypted successfully', { 
        userId, 
        keyType, 
        requestId,
        keyFormat: validation.key_type
      });

      return {
        api_key: decryptedKey.api_key,
        key_type: keyType,
        user_id: userId,
        expires_at: decryptedKey.expires_at
      };

    } catch (error) {
      this.logger.error('Failed to retrieve API key', error, { userId, keyType, requestId });

      if (error instanceof AnalysisError) {
        throw error;
      }

      if (error instanceof AppError) {
        throw new AnalysisError(
          error.code,
          error.message,
          AnalysisStage.API_KEY_DECRYPTION,
          error.details,
          error.retryAfter,
          undefined,
          undefined
        );
      }

      throw new AnalysisError(
        ANALYSIS_ERROR_CODES.MISSING_API_KEY,
        'Failed to retrieve API key',
        AnalysisStage.API_KEY_DECRYPTION,
        error instanceof Error ? error.message : String(error),
        undefined,
        undefined,
        undefined
      );
    }
  }

  /**
   * Retrieve encrypted API key from database
   * @param userId User ID
   * @param keyType Type of API key
   * @returns Promise<ApiKeyInfo> Encrypted API key information
   * @private
   */
  private async retrieveEncryptedApiKey(
    userId: string,
    keyType: string
  ): Promise<ApiKeyInfo> {
    try {
      const { data, error } = await this.supabase
        .from('user_api_keys')
        .select('encrypted_key, key_type, created_at, last_used, usage_count, is_active')
        .eq('user_id', userId)
        .eq('key_type', keyType)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          throw new AnalysisError(
            ANALYSIS_ERROR_CODES.MISSING_API_KEY,
            `No active ${keyType} API key found for user`,
            AnalysisStage.API_KEY_DECRYPTION,
            'User needs to configure their API key in profile settings'
          );
        }

        throw new AppError(
          ERROR_CODES.DATABASE_ERROR,
          'Failed to retrieve API key from database',
          error.message
        );
      }

      if (!data.encrypted_key) {
        throw new AnalysisError(
          ANALYSIS_ERROR_CODES.MISSING_API_KEY,
          'API key data is corrupted',
          AnalysisStage.API_KEY_DECRYPTION,
          'Encrypted key is missing from database record'
        );
      }

      return data as ApiKeyInfo;

    } catch (error) {
      if (error instanceof AnalysisError || error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        ERROR_CODES.DATABASE_ERROR,
        'Database query failed',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Decrypt API key using the decryption service
   * @param encryptedKey Encrypted API key
   * @param requestId Request ID for tracking
   * @returns Promise<DecryptedApiKey> Decrypted key information
   * @private
   */
  private async decryptApiKey(
    encryptedKey: string,
    requestId?: string
  ): Promise<DecryptedApiKey> {
    try {
      // Call the decryption Edge Function with retry logic
      const result = await callExternalAnalysisAPI(
        'decrypt-api-key',
        async () => {
          const { data, error } = await this.supabase.functions.invoke('decrypt-api-key', {
            body: { encrypted_key: encryptedKey }
          });

          if (error) {
            throw new AppError(
              ERROR_CODES.DECRYPTION_ERROR,
              'Decryption service error',
              error.message
            );
          }

          if (!data?.api_key) {
            throw new AppError(
              ERROR_CODES.DECRYPTION_ERROR,
              'Decryption failed',
              'No API key returned from decryption service'
            );
          }

          return data;
        },
        {
          timeout: 10000, // 10 second timeout for decryption
          stage: AnalysisStage.API_KEY_DECRYPTION,
          retryConfig: {
            maxAttempts: 2, // Limited retries for decryption
            baseDelay: 1000,
            maxDelay: 5000,
            backoffMultiplier: 2,
            jitter: true
          }
        }
      );

      return result as DecryptedApiKey;

    } catch (error) {
      if (error instanceof AnalysisError) {
        throw error;
      }

      throw new AnalysisError(
        ANALYSIS_ERROR_CODES.DECRYPTION_ERROR,
        'Failed to decrypt API key',
        AnalysisStage.API_KEY_DECRYPTION,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Update API key usage statistics
   * @param userId User ID
   * @param keyType Type of API key
   * @private
   */
  private async updateApiKeyUsage(userId: string, keyType: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('user_api_keys')
        .update({
          last_used: new Date().toISOString(),
          usage_count: this.supabase.raw('usage_count + 1')
        })
        .eq('user_id', userId)
        .eq('key_type', keyType);

      if (error) {
        // Log error but don't fail the request
        this.logger.warn('Failed to update API key usage statistics', { 
          error: error.message, 
          userId, 
          keyType 
        });
      }
    } catch (error) {
      // Log error but don't fail the request
      this.logger.warn('Failed to update API key usage statistics', { 
        error: error instanceof Error ? error.message : String(error), 
        userId, 
        keyType 
      });
    }
  }

  /**
   * Validate API key format and type
   * @param apiKey API key to validate
   * @returns ApiKeyValidation Validation result
   */
  validateApiKey(apiKey: string): ApiKeyValidation {
    const validation: ApiKeyValidation = {
      is_valid: false,
      key_type: 'unknown',
      format_valid: false,
      length_valid: false,
      prefix_valid: false,
      errors: []
    };

    if (!apiKey || typeof apiKey !== 'string') {
      validation.errors.push('API key must be a non-empty string');
      return validation;
    }

    const trimmedKey = apiKey.trim();

    // Google API Key validation
    if (trimmedKey.startsWith('AIza')) {
      validation.key_type = 'google_api';
      validation.prefix_valid = true;
      
      // Google API keys are typically 39 characters
      if (trimmedKey.length === 39) {
        validation.length_valid = true;
      } else {
        validation.errors.push(`Google API key should be 39 characters, got ${trimmedKey.length}`);
      }

      // Check format: AIza followed by 35 alphanumeric characters, hyphens, or underscores
      const googlePattern = /^AIza[0-9A-Za-z-_]{35}$/;
      if (googlePattern.test(trimmedKey)) {
        validation.format_valid = true;
      } else {
        validation.errors.push('Google API key contains invalid characters');
      }
    }
    // Financial data API key validation (example patterns)
    else if (trimmedKey.length >= 16 && trimmedKey.length <= 64) {
      validation.key_type = 'financial_data';
      validation.length_valid = true;
      validation.format_valid = true; // More lenient for financial APIs
    }
    // News API key validation (example patterns)
    else if (trimmedKey.length >= 20 && trimmedKey.length <= 50) {
      validation.key_type = 'news_api';
      validation.length_valid = true;
      validation.format_valid = true; // More lenient for news APIs
    }
    else {
      validation.errors.push('API key format not recognized');
    }

    // Overall validation
    validation.is_valid = validation.format_valid && validation.length_valid && validation.errors.length === 0;

    return validation;
  }

  /**
   * Check if user has a valid API key configured
   * @param userId User ID to check
   * @param keyType Type of API key to check
   * @returns Promise<boolean> True if user has valid API key
   */
  async hasValidApiKey(
    userId: string,
    keyType: 'google_api' | 'financial_data' | 'news_api' = 'google_api'
  ): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('user_api_keys')
        .select('encrypted_key, is_active')
        .eq('user_id', userId)
        .eq('key_type', keyType)
        .eq('is_active', true)
        .single();

      return !error && data?.encrypted_key && data.is_active;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get API key usage statistics
   * @param userId User ID
   * @param keyType Type of API key
   * @returns Promise<ApiKeyInfo | null> API key information or null if not found
   */
  async getApiKeyInfo(
    userId: string,
    keyType: 'google_api' | 'financial_data' | 'news_api' = 'google_api'
  ): Promise<ApiKeyInfo | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_api_keys')
        .select('encrypted_key, key_type, created_at, last_used, usage_count, is_active')
        .eq('user_id', userId)
        .eq('key_type', keyType)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        ...data,
        encrypted_key: '[ENCRYPTED]' // Don't return actual encrypted key
      } as ApiKeyInfo;
    } catch (error) {
      return null;
    }
  }

  /**
   * Clear cached API key for a user
   * @param userId User ID
   * @param keyType Type of API key
   */
  clearCachedApiKey(userId: string, keyType: 'google_api' | 'financial_data' | 'news_api' = 'google_api'): void {
    const cacheKey = `${userId}:${keyType}`;
    ApiKeyCache.clear(cacheKey);
    this.logger.info('API key cache cleared', { userId, keyType });
  }

  /**
   * Get cache statistics for monitoring
   * @returns object Cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return ApiKeyCache.getStats();
  }

  /**
   * Test API key by making a simple API call
   * @param apiKey Decrypted API key to test
   * @param keyType Type of API key
   * @returns Promise<boolean> True if API key works
   */
  async testApiKey(
    apiKey: string,
    keyType: 'google_api' | 'financial_data' | 'news_api'
  ): Promise<boolean> {
    try {
      switch (keyType) {
        case 'google_api':
          // Test Google API key with a simple Custom Search API request
          // Using a minimal request to check key validity
          const response = await fetch(
            `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=017576662512468239146:omuauf_lfve&q=test&num=1`,
            { 
              method: 'GET',
              headers: {
                'Accept': 'application/json'
              }
            }
          );
          
          // 200 = success, 400 = bad request but key is valid, 403 = invalid key
          if (response.status === 200 || response.status === 400) {
            return true;
          } else if (response.status === 403) {
            return false;
          } else {
            // Other errors might be temporary, assume key is valid
            this.logger.warn('API key test returned unexpected status', { 
              status: response.status, 
              keyType 
            });
            return true;
          }

        case 'financial_data':
          // Test financial data API (Alpha Vantage example)
          const finResponse = await fetch(
            `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=${apiKey}`,
            { method: 'GET' }
          );
          return finResponse.status !== 403;

        case 'news_api':
          // Test news API (NewsAPI example)
          const newsResponse = await fetch(
            `https://newsapi.org/v2/top-headlines?country=us&apiKey=${apiKey}&pageSize=1`,
            { method: 'GET' }
          );
          return newsResponse.status !== 401 && newsResponse.status !== 403;

        default:
          return false;
      }
    } catch (error) {
      this.logger.warn('API key test failed', { error: error.message, keyType });
      // Network errors don't necessarily mean the key is invalid
      return true;
    }
  }
}

/**
 * Convenience function to get decrypted API key for analysis functions
 * @param userId User ID
 * @param keyType Type of API key (defaults to google_api)
 * @param requestId Request ID for tracking
 * @param logger Optional logger instance
 * @returns Promise<string> Decrypted API key
 */
export async function getDecryptedApiKey(
  userId: string,
  keyType: 'google_api' | 'financial_data' | 'news_api' = 'google_api',
  requestId?: string,
  logger?: Logger
): Promise<string> {
  const apiKeyService = new ApiKeyService(logger);
  const result = await apiKeyService.getDecryptedApiKey(userId, keyType, requestId);
  return result.api_key;
}

/**
 * Convenience function to check if user has valid API key
 * @param userId User ID
 * @param keyType Type of API key (defaults to google_api)
 * @returns Promise<boolean> True if user has valid API key
 */
export async function hasValidApiKey(
  userId: string,
  keyType: 'google_api' | 'financial_data' | 'news_api' = 'google_api'
): Promise<boolean> {
  const apiKeyService = new ApiKeyService();
  return apiKeyService.hasValidApiKey(userId, keyType);
}

/**
 * Enhanced authentication with API key validation
 * @param request HTTP request
 * @param requiredKeyType Type of API key required (optional)
 * @returns Promise<{success: boolean, user?: any, apiKey?: string, error?: any}>
 */
export async function authenticateWithApiKey(
  request: Request,
  requiredKeyType?: 'google_api' | 'financial_data' | 'news_api'
): Promise<{
  success: boolean;
  user?: any;
  apiKey?: string;
  error?: any;
}> {
  try {
    // First authenticate the user
    const { authenticateUser } = await import('./index.ts');
    const authResult = await authenticateUser(request);
    
    if (!authResult.success) {
      return {
        success: false,
        error: authResult.error
      };
    }

    // If no API key required, return just the auth result
    if (!requiredKeyType) {
      return {
        success: true,
        user: authResult.user
      };
    }

    // Get the API key for the user
    const apiKeyService = new ApiKeyService();
    const decryptedKey = await apiKeyService.getDecryptedApiKey(
      authResult.user!.user_id,
      requiredKeyType
    );

    return {
      success: true,
      user: authResult.user,
      apiKey: decryptedKey.api_key
    };

  } catch (error) {
    return {
      success: false,
      error: {
        code: error instanceof AnalysisError ? error.code : ERROR_CODES.MISSING_API_KEY,
        message: error instanceof Error ? error.message : 'Authentication failed'
      }
    };
  }
}

/**
 * Simple function to get decrypted API key for analysis functions
 * @param userId User ID
 * @param keyType Type of API key (defaults to google_api)
 * @param requestId Request ID for tracking
 * @param logger Optional logger instance
 * @returns Promise<string> Decrypted API key
 */
export async function getDecryptedApiKeySimple(
  userId: string,
  keyType: 'google_api' | 'financial_data' | 'news_api' = 'google_api',
  requestId?: string,
  logger?: Logger
): Promise<string> {
  const apiKeyService = new ApiKeyService(logger);
  const result = await apiKeyService.getDecryptedApiKey(userId, keyType, requestId);
  return result.api_key;
}

/**
 * Function to validate API key format and functionality
 * @param apiKey API key to validate
 * @param keyType Type of API key
 * @returns Promise<{isValid: boolean, errors: string[]}>
 */
export async function validateApiKeyComplete(
  apiKey: string,
  keyType: 'google_api' | 'financial_data' | 'news_api' = 'google_api'
): Promise<{isValid: boolean, errors: string[]}> {
  const apiKeyService = new ApiKeyService();
  
  // Format validation
  const formatValidation = apiKeyService.validateApiKey(apiKey);
  if (!formatValidation.is_valid) {
    return {
      isValid: false,
      errors: formatValidation.errors
    };
  }

  // Functionality test
  const isWorking = await apiKeyService.testApiKey(apiKey, keyType);
  if (!isWorking) {
    return {
      isValid: false,
      errors: ['API key format is valid but functionality test failed']
    };
  }

  return {
    isValid: true,
    errors: []
  };
}