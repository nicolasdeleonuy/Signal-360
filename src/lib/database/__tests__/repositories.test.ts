// Unit tests for repository implementations
// Tests repository pattern, query optimization, and performance

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BaseRepository, PaginatedResult } from '../repositories/base-repository';
import { ProfileRepository, ProfileStats } from '../repositories/profile-repository';
import { AnalysisRepository, AnalysisStats } from '../repositories/analysis-repository';
import { QueryOptimizer } from '../query-optimizer';
import { supabase } from '../../supabase';
import { Profile, Analysis, CreateAnalysisInput } from '../../../types/database';

// Mock Supabase client
vi.mock('../../supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

// Mock dependencies
vi.mock('../error-handler');
vi.mock('../validation');
vi.mock('../../edge-functions/encryption');

describe('BaseRepository', () => {
  class TestRepository extends BaseRepository<any, any, any> {
    constructor() {
      super('test_table');
    }
  }

  let repository: TestRepository;

  beforeEach(() => {
    repository = new TestRepository();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('create', () => {
    it('should create a record successfully', async () => {
      const mockData = { name: 'Test Record' };
      const mockResult = { id: 1, ...mockData };

      const mockSupabaseChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockResult,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockSupabaseChain);

      const result = await repository.create(mockData);

      expect(supabase.from).toHaveBeenCalledWith('test_table');
      expect(mockSupabaseChain.insert).toHaveBeenCalledWith(mockData);
      expect(result).toEqual(mockResult);
    });
  });

  describe('findById', () => {
    it('should find record by ID', async () => {
      const mockResult = { id: 1, name: 'Test Record' };

      const mockSupabaseChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockResult,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockSupabaseChain);

      const result = await repository.findById(1);

      expect(mockSupabaseChain.select).toHaveBeenCalledWith('*');
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('id', 1);
      expect(result).toEqual(mockResult);
    });

    it('should return null if record not found', async () => {
      const mockSupabaseChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'No rows found' },
        }),
      };

      (supabase.from as any).mockReturnValue(mockSupabaseChain);

      const result = await repository.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('find', () => {
    it('should find records with filters and options', async () => {
      const mockResults = [
        { id: 1, name: 'Record 1' },
        { id: 2, name: 'Record 2' },
      ];

      const mockSupabaseChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: mockResults,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockSupabaseChain);

      const filters = { status: 'active' };
      const options = { limit: 10, order_by: 'created_at', ascending: false };

      const result = await repository.find(filters, options);

      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('status', 'active');
      expect(mockSupabaseChain.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(mockSupabaseChain.limit).toHaveBeenCalledWith(10);
      expect(result).toEqual(mockResults);
    });
  });

  describe('paginate', () => {
    it('should return paginated results with metadata', async () => {
      const mockData = [{ id: 1, name: 'Record 1' }];
      const mockCount = 25;

      // Mock find method
      vi.spyOn(repository, 'find').mockResolvedValue(mockData);
      vi.spyOn(repository, 'count').mockResolvedValue(mockCount);

      const result = await repository.paginate({}, { limit: 10, offset: 0 });

      expect(result.data).toEqual(mockData);
      expect(result.pagination.totalCount).toBe(25);
      expect(result.pagination.totalPages).toBe(3);
      expect(result.pagination.currentPage).toBe(1);
      expect(result.pagination.hasNextPage).toBe(true);
      expect(result.pagination.hasPreviousPage).toBe(false);
    });
  });

  describe('batchCreate', () => {
    it('should create multiple records', async () => {
      const mockRecords = [
        { name: 'Record 1' },
        { name: 'Record 2' },
      ];
      const mockResults = [
        { id: 1, name: 'Record 1' },
        { id: 2, name: 'Record 2' },
      ];

      const mockSupabaseChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: mockResults,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockSupabaseChain);

      const result = await repository.batchCreate(mockRecords);

      expect(mockSupabaseChain.insert).toHaveBeenCalledWith(mockRecords);
      expect(result).toEqual(mockResults);
    });
  });
});

describe('ProfileRepository', () => {
  let repository: ProfileRepository;

  beforeEach(() => {
    repository = new ProfileRepository();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('create', () => {
    it('should create profile with encrypted API key', async () => {
      const mockInput = {
        id: 'user123',
        google_api_key: 'test_api_key',
      };

      const mockProfile: Profile = {
        id: 'user123',
        encrypted_google_api_key: 'encrypted_key',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      // Mock encryption
      const { AdaptiveEncryptionService } = await import('../../edge-functions/encryption');
      (AdaptiveEncryptionService.encryptApiKey as any).mockResolvedValue('encrypted_key');

      // Mock base create
      vi.spyOn(BaseRepository.prototype, 'create').mockResolvedValue(mockProfile);

      const result = await repository.create(mockInput);

      expect(AdaptiveEncryptionService.encryptApiKey).toHaveBeenCalledWith('test_api_key');
      expect(result).toEqual(mockProfile);
    });
  });

  describe('getDecryptedApiKey', () => {
    it('should return decrypted API key', async () => {
      const mockProfile: Profile = {
        id: 'user123',
        encrypted_google_api_key: 'encrypted_key',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      // Mock decryption
      const { AdaptiveEncryptionService } = await import('../../edge-functions/encryption');
      (AdaptiveEncryptionService.decryptApiKey as any).mockResolvedValue('decrypted_key');

      vi.spyOn(repository, 'findById').mockResolvedValue(mockProfile);

      const result = await repository.getDecryptedApiKey('user123');

      expect(AdaptiveEncryptionService.decryptApiKey).toHaveBeenCalledWith('encrypted_key');
      expect(result).toBe('decrypted_key');
    });

    it('should return null if no API key', async () => {
      const mockProfile: Profile = {
        id: 'user123',
        encrypted_google_api_key: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      vi.spyOn(repository, 'findById').mockResolvedValue(mockProfile);

      const result = await repository.getDecryptedApiKey('user123');

      expect(result).toBeNull();
    });
  });

  describe('getStats', () => {
    it('should return profile statistics', async () => {
      vi.spyOn(repository, 'count')
        .mockResolvedValueOnce(100) // total profiles
        .mockResolvedValueOnce(75)  // profiles with API keys
        .mockResolvedValueOnce(25); // profiles without API keys

      const result = await repository.getStats();

      expect(result).toEqual({
        totalProfiles: 100,
        profilesWithApiKeys: 75,
        profilesWithoutApiKeys: 25,
        apiKeyConfigurationRate: 75,
      });
    });
  });
});

describe('AnalysisRepository', () => {
  let repository: AnalysisRepository;

  beforeEach(() => {
    repository = new AnalysisRepository();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createForUser', () => {
    it('should create analysis with validation', async () => {
      const mockInput: CreateAnalysisInput = {
        ticker_symbol: 'aapl',
        analysis_context: 'investment',
        synthesis_score: 75,
        convergence_factors: [],
        divergence_factors: [],
        full_report: { summary: 'Test analysis summary with sufficient detail' },
      };

      const mockAnalysis: Analysis = {
        id: 1,
        user_id: 'user123',
        created_at: '2024-01-01T00:00:00Z',
        ticker_symbol: 'AAPL',
        analysis_context: 'investment',
        trading_timeframe: null,
        synthesis_score: 75,
        convergence_factors: [],
        divergence_factors: [],
        full_report: { summary: 'Test analysis summary with sufficient detail' },
      };

      // Mock validation
      const { ValidationService } = await import('../validation');
      (ValidationService.validateAnalysisInput as any).mockReturnValue({ isValid: true });
      (ValidationService.sanitizeTickerSymbol as any).mockReturnValue('AAPL');
      (ValidationService.sanitizeSynthesisScore as any).mockReturnValue(75);

      // Mock base create
      vi.spyOn(BaseRepository.prototype, 'create').mockResolvedValue(mockAnalysis);

      const result = await repository.createForUser('user123', mockInput);

      expect(ValidationService.validateAnalysisInput).toHaveBeenCalledWith(mockInput);
      expect(result).toEqual(mockAnalysis);
    });

    it('should throw error for invalid input', async () => {
      const mockInput: CreateAnalysisInput = {
        ticker_symbol: '',
        analysis_context: 'investment',
        synthesis_score: 75,
        convergence_factors: [],
        divergence_factors: [],
        full_report: { summary: 'Test' },
      };

      // Mock validation failure
      const { ValidationService } = await import('../validation');
      (ValidationService.validateAnalysisInput as any).mockReturnValue({
        isValid: false,
        error: 'Invalid ticker symbol',
      });

      await expect(repository.createForUser('user123', mockInput)).rejects.toThrow(
        'Validation failed: Invalid ticker symbol'
      );
    });
  });

  describe('getStatsByUser', () => {
    it('should return analysis statistics for user', async () => {
      const mockAnalyses: Analysis[] = [
        {
          id: 1,
          user_id: 'user123',
          created_at: '2024-01-01T00:00:00Z',
          ticker_symbol: 'AAPL',
          analysis_context: 'investment',
          trading_timeframe: null,
          synthesis_score: 80,
          convergence_factors: [],
          divergence_factors: [],
          full_report: { summary: 'Test' },
        },
        {
          id: 2,
          user_id: 'user123',
          created_at: '2024-01-01T00:00:00Z',
          ticker_symbol: 'TSLA',
          analysis_context: 'trading',
          trading_timeframe: '1D',
          synthesis_score: 70,
          convergence_factors: [],
          divergence_factors: [],
          full_report: { summary: 'Test' },
        },
      ];

      vi.spyOn(repository, 'findByUser').mockResolvedValue(mockAnalyses);

      const result = await repository.getStatsByUser('user123');

      expect(result.totalAnalyses).toBe(2);
      expect(result.investmentAnalyses).toBe(1);
      expect(result.tradingAnalyses).toBe(1);
      expect(result.uniqueTickers).toBe(2);
      expect(result.averageSynthesisScore).toBe(75);
      expect(result.highestScore).toBe(80);
      expect(result.lowestScore).toBe(70);
    });
  });

  describe('getTrendingTickersByUser', () => {
    it('should return trending tickers', async () => {
      const mockAnalyses: Analysis[] = [
        {
          id: 1,
          user_id: 'user123',
          created_at: '2024-01-01T00:00:00Z',
          ticker_symbol: 'AAPL',
          analysis_context: 'investment',
          trading_timeframe: null,
          synthesis_score: 80,
          convergence_factors: [],
          divergence_factors: [],
          full_report: { summary: 'Test' },
        },
        {
          id: 2,
          user_id: 'user123',
          created_at: '2024-01-01T00:00:00Z',
          ticker_symbol: 'AAPL',
          analysis_context: 'trading',
          trading_timeframe: '1D',
          synthesis_score: 70,
          convergence_factors: [],
          divergence_factors: [],
          full_report: { summary: 'Test' },
        },
      ];

      vi.spyOn(repository, 'findWithComplexFilters').mockResolvedValue(mockAnalyses);

      const result = await repository.getTrendingTickersByUser('user123', 5, 30);

      expect(result).toHaveLength(1);
      expect(result[0].ticker).toBe('AAPL');
      expect(result[0].count).toBe(2);
      expect(result[0].averageScore).toBe(75);
    });
  });
});

describe('QueryOptimizer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    QueryOptimizer.clearCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('executeOptimized', () => {
    it('should execute query and cache result', async () => {
      const queryFn = vi.fn().mockResolvedValue('test result');

      const result = await QueryOptimizer.executeOptimized('test-query', queryFn);

      expect(queryFn).toHaveBeenCalledTimes(1);
      expect(result).toBe('test result');

      // Second call should use cache
      const result2 = await QueryOptimizer.executeOptimized('test-query', queryFn);

      expect(queryFn).toHaveBeenCalledTimes(1); // Still only called once
      expect(result2).toBe('test result');
    });

    it('should not cache when disabled', async () => {
      const queryFn = vi.fn().mockResolvedValue('test result');

      await QueryOptimizer.executeOptimized('test-query', queryFn, { enableCache: false });
      await QueryOptimizer.executeOptimized('test-query', queryFn, { enableCache: false });

      expect(queryFn).toHaveBeenCalledTimes(2);
    });

    it('should update metrics on execution', async () => {
      const queryFn = vi.fn().mockResolvedValue('test result');

      await QueryOptimizer.executeOptimized('test-query', queryFn);

      const metrics = QueryOptimizer.getMetrics('test-query') as any;
      expect(metrics.totalExecutions).toBe(1);
      expect(metrics.cacheHits).toBe(0);
      expect(metrics.errors).toBe(0);
    });
  });

  describe('getQueryBuilder', () => {
    it('should create optimized query builder', () => {
      const builder = QueryOptimizer.getQueryBuilder('test_table');

      expect(builder).toBeDefined();
      expect(builder.select).toBeDefined();
      expect(builder.eq).toBeDefined();
      expect(builder.orderBy).toBeDefined();
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', async () => {
      const queryFn = vi.fn().mockResolvedValue('test result');

      // Add some cached queries
      await QueryOptimizer.executeOptimized('query1', queryFn);
      await QueryOptimizer.executeOptimized('query2', queryFn);

      const stats = QueryOptimizer.getCacheStats();

      expect(stats.totalEntries).toBe(2);
      expect(stats.validEntries).toBe(2);
      expect(stats.expiredEntries).toBe(0);
      expect(stats.memoryUsage).toBeGreaterThan(0);
    });
  });
});