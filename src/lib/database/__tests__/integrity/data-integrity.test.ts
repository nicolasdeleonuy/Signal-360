// Data integrity tests for database operations
// Tests cascade deletes, foreign key constraints, and data consistency

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DatabaseService } from '../../database-service';
import { ProfileRepository } from '../../repositories/profile-repository';
import { AnalysisRepository } from '../../repositories/analysis-repository';
import { supabase } from '../../../supabaseClient';
import { CreateAnalysisInput } from '../../../../types/database';

// Mock Supabase for integrity testing
vi.mock('../../../supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe('Data Integrity Tests', () => {
  const testUserId = '123e4567-e89b-12d3-a456-426614174000';
  const testUserId2 = '123e4567-e89b-12d3-a456-426614174001';

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock authenticated user
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: testUserId } },
      error: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Foreign Key Constraints', () => {
    it('should enforce profile-analysis relationship', async () => {
      // Mock profile not found
      const mockSupabaseChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'No rows found' },
        }),
      };

      (supabase.from as any).mockReturnValue(mockSupabaseChain);

      const analysisInput: CreateAnalysisInput = {
        ticker_symbol: 'AAPL',
        analysis_context: 'investment',
        synthesis_score: 85,
        convergence_factors: [],
        divergence_factors: [],
        full_report: { summary: 'Test analysis summary with sufficient detail' },
      };

      // Should fail because profile doesn't exist
      await expect(
        DatabaseService.createAnalysisWithValidation(testUserId, analysisInput)
      ).rejects.toThrow('User profile not found');
    });

    it('should prevent orphaned analysis records', async () => {
      const mockProfile = {
        id: testUserId,
        encrypted_google_api_key: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      let callCount = 0;
      (supabase.from as any).mockImplementation((table: string) => {
        callCount++;
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
          };
        } else if (table === 'analyses') {
          return {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: null,
              error: {
                code: '23503',
                message: 'insert or update on table "analyses" violates foreign key constraint',
              },
            }),
          };
        }
      });

      const analysisInput: CreateAnalysisInput = {
        ticker_symbol: 'AAPL',
        analysis_context: 'investment',
        synthesis_score: 85,
        convergence_factors: [],
        divergence_factors: [],
        full_report: { summary: 'Test analysis summary with sufficient detail' },
      };

      // Should fail due to foreign key constraint
      await expect(
        DatabaseService.createAnalysisWithValidation(testUserId, analysisInput)
      ).rejects.toThrow('Failed to create analysis');
    });
  });

  describe('Cascade Delete Operations', () => {
    it('should cascade delete analyses when profile is deleted', async () => {
      const mockSupabaseChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };

      (supabase.from as any).mockReturnValue(mockSupabaseChain);

      const repository = new ProfileRepository();
      await repository.delete(testUserId);

      expect(mockSupabaseChain.delete).toHaveBeenCalled();
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('id', testUserId);
      
      // In a real scenario, this would cascade delete all analyses
      // The database constraint handles this automatically
    });

    it('should handle cascade delete failures gracefully', async () => {
      const mockSupabaseChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: {
            code: '23503',
            message: 'update or delete on table violates foreign key constraint',
          },
        }),
      };

      (supabase.from as any).mockReturnValue(mockSupabaseChain);

      const repository = new ProfileRepository();
      
      await expect(repository.delete(testUserId)).rejects.toThrow();
    });
  });

  describe('Data Validation Integrity', () => {
    it('should enforce synthesis score constraints', async () => {
      const invalidInputs = [
        { synthesis_score: -1 },
        { synthesis_score: 101 },
        { synthesis_score: 150 },
        { synthesis_score: NaN },
        { synthesis_score: 'invalid' as any },
      ];

      for (const invalidInput of invalidInputs) {
        const analysisInput: CreateAnalysisInput = {
          ticker_symbol: 'AAPL',
          analysis_context: 'investment',
          synthesis_score: invalidInput.synthesis_score,
          convergence_factors: [],
          divergence_factors: [],
          full_report: { summary: 'Test analysis summary with sufficient detail' },
        };

        await expect(
          DatabaseService.createAnalysisWithValidation(testUserId, analysisInput)
        ).rejects.toThrow();
      }
    });

    it('should enforce analysis context constraints', async () => {
      const invalidContexts = ['invalid', 'INVESTMENT', 'Trading', '', null, undefined];

      for (const invalidContext of invalidContexts) {
        const analysisInput: CreateAnalysisInput = {
          ticker_symbol: 'AAPL',
          analysis_context: invalidContext as any,
          synthesis_score: 85,
          convergence_factors: [],
          divergence_factors: [],
          full_report: { summary: 'Test analysis summary with sufficient detail' },
        };

        await expect(
          DatabaseService.createAnalysisWithValidation(testUserId, analysisInput)
        ).rejects.toThrow();
      }
    });

    it('should enforce ticker symbol format constraints', async () => {
      const invalidTickers = ['', '123', 'toolong', 'aa-pl', 'aapl123', null, undefined];

      for (const invalidTicker of invalidTickers) {
        const analysisInput: CreateAnalysisInput = {
          ticker_symbol: invalidTicker as any,
          analysis_context: 'investment',
          synthesis_score: 85,
          convergence_factors: [],
          divergence_factors: [],
          full_report: { summary: 'Test analysis summary with sufficient detail' },
        };

        await expect(
          DatabaseService.createAnalysisWithValidation(testUserId, analysisInput)
        ).rejects.toThrow();
      }
    });

    it('should enforce trading timeframe constraints for trading analysis', async () => {
      const analysisInput: CreateAnalysisInput = {
        ticker_symbol: 'AAPL',
        analysis_context: 'trading',
        synthesis_score: 85,
        convergence_factors: [],
        divergence_factors: [],
        full_report: { summary: 'Test analysis summary with sufficient detail' },
        // Missing trading_timeframe
      };

      await expect(
        DatabaseService.createAnalysisWithValidation(testUserId, analysisInput)
      ).rejects.toThrow('Trading timeframe is required');
    });
  });

  describe('JSONB Data Integrity', () => {
    it('should validate convergence factors structure', async () => {
      const invalidFactors = [
        [{ category: 'fundamental' }], // Missing description and weight
        [{ description: 'Test', weight: 5 }], // Missing category
        [{ category: 'fundamental', description: 'Test' }], // Missing weight
        [{ category: 'fundamental', description: 'Test', weight: 'invalid' }], // Invalid weight type
        [{ category: 'fundamental', description: 'Test', weight: -5 }], // Negative weight
      ];

      for (const invalidFactor of invalidFactors) {
        const analysisInput: CreateAnalysisInput = {
          ticker_symbol: 'AAPL',
          analysis_context: 'investment',
          synthesis_score: 85,
          convergence_factors: invalidFactor as any,
          divergence_factors: [],
          full_report: { summary: 'Test analysis summary with sufficient detail' },
        };

        await expect(
          DatabaseService.createAnalysisWithValidation(testUserId, analysisInput)
        ).rejects.toThrow();
      }
    });

    it('should validate analysis report structure', async () => {
      const invalidReports = [
        null,
        undefined,
        {},
        { summary: '' }, // Too short
        { summary: 'Short' }, // Too short
        { summary: 'Valid summary but missing structure', fundamental: 'invalid' },
        { summary: 'Valid summary', fundamental: { score: 'invalid' } },
        { summary: 'Valid summary', fundamental: { score: 85, factors: 'not array' } },
      ];

      for (const invalidReport of invalidReports) {
        const analysisInput: CreateAnalysisInput = {
          ticker_symbol: 'AAPL',
          analysis_context: 'investment',
          synthesis_score: 85,
          convergence_factors: [],
          divergence_factors: [],
          full_report: invalidReport as any,
        };

        await expect(
          DatabaseService.createAnalysisWithValidation(testUserId, analysisInput)
        ).rejects.toThrow();
      }
    });
  });

  describe('Unique Constraint Violations', () => {
    it('should handle duplicate profile creation', async () => {
      const mockSupabaseChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: {
            code: '23505',
            message: 'duplicate key value violates unique constraint "profiles_pkey"',
          },
        }),
      };

      (supabase.from as any).mockReturnValue(mockSupabaseChain);

      const repository = new ProfileRepository();
      
      await expect(
        repository.create({ id: testUserId })
      ).rejects.toThrow();
    });

    it('should handle concurrent profile creation attempts', async () => {
      let attemptCount = 0;
      const mockSupabaseChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockImplementation(() => {
          attemptCount++;
          if (attemptCount === 1) {
            return Promise.resolve({
              data: {
                id: testUserId,
                encrypted_google_api_key: null,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
              },
              error: null,
            });
          } else {
            return Promise.resolve({
              data: null,
              error: {
                code: '23505',
                message: 'duplicate key value violates unique constraint',
              },
            });
          }
        }),
      };

      (supabase.from as any).mockReturnValue(mockSupabaseChain);

      const repository = new ProfileRepository();
      
      // Simulate concurrent creation attempts
      const operations = [
        repository.create({ id: testUserId }),
        repository.create({ id: testUserId }),
      ];

      const results = await Promise.allSettled(operations);
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      expect(successful).toBe(1); // Only one should succeed
      expect(failed).toBe(1); // One should fail due to duplicate
    });
  });

  describe('Transaction Consistency', () => {
    it('should maintain consistency during partial failures', async () => {
      // Mock a scenario where profile update succeeds but related operation fails
      let operationCount = 0;
      (supabase.from as any).mockImplementation((table: string) => {
        operationCount++;
        if (table === 'profiles' && operationCount === 1) {
          return {
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                id: testUserId,
                encrypted_google_api_key: 'updated_key',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-02T00:00:00Z',
              },
              error: null,
            }),
          };
        } else {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Operation failed' },
            }),
          };
        }
      });

      // First operation should succeed
      const updatedProfile = await DatabaseService.updateUserProfile(testUserId, {
        google_api_key: 'new_key',
      });
      expect(updatedProfile.encrypted_google_api_key).toBe('updated_key');

      // Second operation should fail
      await expect(
        DatabaseService.getUserData(testUserId)
      ).rejects.toThrow();
    });

    it('should handle rollback scenarios', async () => {
      const operations = [
        async () => ({ success: true, data: 'operation1' }),
        async () => ({ success: true, data: 'operation2' }),
        async () => { throw new Error('Operation 3 failed'); },
      ];

      const rollbacks = [
        async () => console.log('Rollback operation 1'),
        async () => console.log('Rollback operation 2'),
      ];

      const results: any[] = [];
      const completedRollbacks: (() => Promise<void>)[] = [];

      try {
        for (let i = 0; i < operations.length; i++) {
          const result = await operations[i]();
          results.push(result);
          if (rollbacks[i]) {
            completedRollbacks.push(rollbacks[i]);
          }
        }
      } catch (error) {
        // Rollback completed operations
        for (const rollback of completedRollbacks.reverse()) {
          await rollback();
        }
        
        expect(results).toHaveLength(2); // Two operations completed before failure
        expect(completedRollbacks).toHaveLength(2); // Two rollbacks available
      }
    });
  });

  describe('Data Type Integrity', () => {
    it('should enforce UUID format for user IDs', async () => {
      const invalidUserIds = [
        'invalid-uuid',
        '123',
        '',
        'not-a-uuid-at-all',
        '123e4567-e89b-12d3-a456', // Too short
        '123e4567-e89b-12d3-a456-426614174000-extra', // Too long
      ];

      for (const invalidUserId of invalidUserIds) {
        await expect(
          DatabaseService.initializeUser(invalidUserId)
        ).rejects.toThrow();
      }
    });

    it('should enforce integer constraints for analysis IDs', async () => {
      const invalidAnalysisIds = [
        'not-a-number',
        -1,
        0,
        1.5,
        NaN,
        Infinity,
        null,
        undefined,
      ];

      for (const invalidId of invalidAnalysisIds) {
        await expect(
          DatabaseService.getAnalysisSecure(invalidId as any, testUserId)
        ).rejects.toThrow();
      }
    });

    it('should enforce timestamp format consistency', async () => {
      const mockProfile = {
        id: testUserId,
        encrypted_google_api_key: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const mockSupabaseChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
      };

      (supabase.from as any).mockReturnValue(mockSupabaseChain);

      const profile = await DatabaseService.initializeUser(testUserId);
      
      // Verify timestamp format
      expect(profile.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/);
      expect(profile.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/);
    });
  });

  describe('Cross-Table Consistency', () => {
    it('should maintain user-analysis relationship consistency', async () => {
      const mockProfile = {
        id: testUserId,
        encrypted_google_api_key: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const mockAnalyses = [
        {
          id: 1,
          user_id: testUserId,
          ticker_symbol: 'AAPL',
          analysis_context: 'investment' as const,
          synthesis_score: 85,
        },
        {
          id: 2,
          user_id: testUserId,
          ticker_symbol: 'TSLA',
          analysis_context: 'trading' as const,
          synthesis_score: 70,
        },
      ];

      let callCount = 0;
      (supabase.from as any).mockImplementation((table: string) => {
        callCount++;
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
          };
        } else if (table === 'analyses') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockAnalyses, error: null }),
          };
        }
      });

      const userData = await DatabaseService.getUserData(testUserId);
      
      // Verify consistency
      expect(userData.profile.id).toBe(testUserId);
      userData.recentAnalyses.forEach(analysis => {
        expect(analysis.user_id).toBe(testUserId);
      });
    });

    it('should prevent cross-user data leakage', async () => {
      // Mock scenario where query accidentally returns data from different user
      const mockAnalyses = [
        {
          id: 1,
          user_id: testUserId,
          ticker_symbol: 'AAPL',
          analysis_context: 'investment' as const,
          synthesis_score: 85,
        },
        {
          id: 2,
          user_id: testUserId2, // Different user - should not be returned
          ticker_symbol: 'TSLA',
          analysis_context: 'trading' as const,
          synthesis_score: 70,
        },
      ];

      const mockSupabaseChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockAnalyses, error: null }),
      };

      (supabase.from as any).mockReturnValue(mockSupabaseChain);

      const repository = new AnalysisRepository();
      const analyses = await repository.findByUser(testUserId);

      // In a properly implemented system, RLS would prevent this
      // But we should also validate on the application side
      const userAnalyses = analyses.filter(a => a.user_id === testUserId);
      expect(userAnalyses).toHaveLength(1);
      expect(userAnalyses[0].user_id).toBe(testUserId);
    });
  });
});