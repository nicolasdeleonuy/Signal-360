// Unit tests for security layer
// Tests RLS enforcement, input validation, and SQL injection prevention

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RLSEnforcer, SecurityOperation } from '../rls-enforcer';
import { InputValidator } from '../input-validator';
import { SecureQueryBuilder } from '../query-builder';
import { supabase } from '../../../supabase';

// Mock Supabase client
vi.mock('../../../supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
}));

describe('RLSEnforcer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('canAccessProfile', () => {
    it('should allow access to own profile', async () => {
      const result = await RLSEnforcer.canAccessProfile('user123', 'user123');
      expect(result).toBe(true);
    });

    it('should deny access to other user profile', async () => {
      const result = await RLSEnforcer.canAccessProfile('user123', 'user456');
      expect(result).toBe(false);
    });

    it('should deny access with missing parameters', async () => {
      const result = await RLSEnforcer.canAccessProfile('', 'user123');
      expect(result).toBe(false);
    });
  });

  describe('canAccessAnalysis', () => {
    it('should allow access to own analysis', async () => {
      const mockSupabaseChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { user_id: 'user123' },
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockSupabaseChain);

      const result = await RLSEnforcer.canAccessAnalysis(1, 'user123');
      expect(result).toBe(true);
    });

    it('should deny access to other user analysis', async () => {
      const mockSupabaseChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { user_id: 'user456' },
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockSupabaseChain);

      const result = await RLSEnforcer.canAccessAnalysis(1, 'user123');
      expect(result).toBe(false);
    });

    it('should deny access to non-existent analysis', async () => {
      const mockSupabaseChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'No rows found' },
        }),
      };

      (supabase.from as any).mockReturnValue(mockSupabaseChain);

      const result = await RLSEnforcer.canAccessAnalysis(999, 'user123');
      expect(result).toBe(false);
    });
  });

  describe('validateUserContext', () => {
    it('should validate correct UUID', () => {
      const validUUID = '123e4567-e89b-12d3-a456-426614174000';
      expect(() => RLSEnforcer.validateUserContext(validUUID)).not.toThrow();
    });

    it('should reject invalid UUID format', () => {
      expect(() => RLSEnforcer.validateUserContext('invalid-uuid')).toThrow(
        'Invalid user ID format'
      );
    });

    it('should reject empty user ID', () => {
      expect(() => RLSEnforcer.validateUserContext('')).toThrow(
        'User ID is required'
      );
    });

    it('should reject non-string user ID', () => {
      expect(() => RLSEnforcer.validateUserContext(123 as any)).toThrow(
        'User ID is required'
      );
    });
  });

  describe('isUserAuthenticated', () => {
    it('should return true for authenticated user', async () => {
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null,
      });

      const result = await RLSEnforcer.isUserAuthenticated('user123');
      expect(result).toBe(true);
    });

    it('should return false for different user', async () => {
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: 'user456' } },
        error: null,
      });

      const result = await RLSEnforcer.isUserAuthenticated('user123');
      expect(result).toBe(false);
    });

    it('should return false for unauthenticated user', async () => {
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await RLSEnforcer.isUserAuthenticated('user123');
      expect(result).toBe(false);
    });
  });

  describe('validateOperation', () => {
    it('should validate authorized profile operation', async () => {
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null,
      });

      const operation: SecurityOperation = {
        userId: 'user123',
        resource: 'profile',
        resourceId: 'user123',
        action: 'read',
      };

      await expect(RLSEnforcer.validateOperation(operation)).resolves.not.toThrow();
    });

    it('should reject unauthorized profile operation', async () => {
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null,
      });

      const operation: SecurityOperation = {
        userId: 'user123',
        resource: 'profile',
        resourceId: 'user456',
        action: 'read',
      };

      await expect(RLSEnforcer.validateOperation(operation)).rejects.toThrow(
        'Access denied'
      );
    });
  });
});

describe('InputValidator', () => {
  describe('validateUserId', () => {
    it('should validate correct UUID', () => {
      const validUUID = '123e4567-e89b-12d3-a456-426614174000';
      const result = InputValidator.validateUserId(validUUID);
      expect(result).toBe(validUUID);
    });

    it('should reject invalid UUID', () => {
      expect(() => InputValidator.validateUserId('invalid')).toThrow(
        'User ID must be a valid UUID'
      );
    });

    it('should reject empty user ID', () => {
      expect(() => InputValidator.validateUserId('')).toThrow(
        'User ID is required'
      );
    });
  });

  describe('validateAnalysisId', () => {
    it('should validate positive integer', () => {
      const result = InputValidator.validateAnalysisId(123);
      expect(result).toBe(123);
    });

    it('should validate string number', () => {
      const result = InputValidator.validateAnalysisId('123');
      expect(result).toBe(123);
    });

    it('should reject negative number', () => {
      expect(() => InputValidator.validateAnalysisId(-1)).toThrow(
        'Analysis ID must be a positive integer'
      );
    });

    it('should reject non-integer', () => {
      expect(() => InputValidator.validateAnalysisId(12.5)).toThrow(
        'Analysis ID must be a positive integer'
      );
    });
  });

  describe('validateTickerSymbol', () => {
    it('should validate and normalize ticker', () => {
      const result = InputValidator.validateTickerSymbol('aapl');
      expect(result).toBe('AAPL');
    });

    it('should reject invalid ticker format', () => {
      expect(() => InputValidator.validateTickerSymbol('123')).toThrow(
        'Invalid ticker symbol format'
      );
    });

    it('should reject empty ticker', () => {
      expect(() => InputValidator.validateTickerSymbol('')).toThrow(
        'Ticker symbol is required'
      );
    });
  });

  describe('validateSynthesisScore', () => {
    it('should validate score in range', () => {
      const result = InputValidator.validateSynthesisScore(75);
      expect(result).toBe(75);
    });

    it('should sanitize score out of range', () => {
      const result = InputValidator.validateSynthesisScore(150);
      expect(result).toBe(100);
    });

    it('should reject non-numeric score', () => {
      expect(() => InputValidator.validateSynthesisScore('invalid')).toThrow(
        'Synthesis score must be between 0 and 100'
      );
    });
  });

  describe('validateText', () => {
    it('should validate text within limits', () => {
      const result = InputValidator.validateText('Hello World', {
        minLength: 5,
        maxLength: 20,
      });
      expect(result).toBe('Hello World');
    });

    it('should reject text too short', () => {
      expect(() => 
        InputValidator.validateText('Hi', { minLength: 5 })
      ).toThrow('Text must be at least 5 characters long');
    });

    it('should reject text too long', () => {
      expect(() => 
        InputValidator.validateText('Very long text', { maxLength: 5 })
      ).toThrow('Text must be no more than 5 characters long');
    });

    it('should sanitize text by default', () => {
      const result = InputValidator.validateText('  <script>alert("xss")</script>  ');
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('</script>');
    });
  });

  describe('validateArray', () => {
    it('should validate array within limits', () => {
      const input = [1, 2, 3];
      const result = InputValidator.validateArray(input, {
        minLength: 1,
        maxLength: 5,
      });
      expect(result).toEqual(input);
    });

    it('should validate array items with validator', () => {
      const input = ['1', '2', '3'];
      const result = InputValidator.validateArray(input, {
        itemValidator: (item) => Number(item),
      });
      expect(result).toEqual([1, 2, 3]);
    });

    it('should reject array too short', () => {
      expect(() => 
        InputValidator.validateArray([], { minLength: 1 })
      ).toThrow('Array must have at least 1 items');
    });

    it('should reject non-array input', () => {
      expect(() => 
        InputValidator.validateArray('not an array' as any)
      ).toThrow('Input must be an array');
    });
  });

  describe('validateQueryParams', () => {
    it('should validate safe parameters', () => {
      const params = {
        user_id: 'user123',
        status: 'active',
        limit: 10,
      };

      const result = InputValidator.validateQueryParams(params);
      expect(result).toEqual(params);
    });

    it('should reject invalid parameter key', () => {
      const params = {
        'user-id': 'user123', // Invalid key with hyphen
      };

      expect(() => InputValidator.validateQueryParams(params)).toThrow(
        'Invalid parameter key'
      );
    });

    it('should sanitize parameter values', () => {
      const params = {
        search: "'; DROP TABLE users; --",
      };

      const result = InputValidator.validateQueryParams(params);
      expect(result.search).not.toContain(';');
      expect(result.search).not.toContain('--');
    });
  });
});

describe('SecureQueryBuilder', () => {
  let builder: SecureQueryBuilder;

  beforeEach(() => {
    builder = new SecureQueryBuilder('test_table');
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create builder with valid table name', () => {
      expect(() => new SecureQueryBuilder('valid_table')).not.toThrow();
    });

    it('should reject invalid table name', () => {
      expect(() => new SecureQueryBuilder('invalid-table')).toThrow(
        'Invalid table name format'
      );
    });

    it('should reject empty table name', () => {
      expect(() => new SecureQueryBuilder('')).toThrow(
        'Table name is required'
      );
    });
  });

  describe('where conditions', () => {
    it('should add valid WHERE condition', () => {
      expect(() => builder.where('column_name', 'eq', 'value')).not.toThrow();
    });

    it('should reject invalid column name', () => {
      expect(() => builder.where('invalid-column', 'eq', 'value')).toThrow(
        'Invalid column name format'
      );
    });

    it('should reject invalid operator', () => {
      expect(() => builder.where('column', 'invalid' as any, 'value')).toThrow(
        'Invalid operator'
      );
    });
  });

  describe('limit and offset', () => {
    it('should accept valid limit', () => {
      expect(() => builder.limit(100)).not.toThrow();
    });

    it('should reject negative limit', () => {
      expect(() => builder.limit(-1)).toThrow(
        'LIMIT must be a non-negative integer'
      );
    });

    it('should reject excessive limit', () => {
      expect(() => builder.limit(2000)).toThrow(
        'LIMIT cannot exceed 1000 rows'
      );
    });

    it('should accept valid offset', () => {
      expect(() => builder.offset(50)).not.toThrow();
    });

    it('should reject negative offset', () => {
      expect(() => builder.offset(-1)).toThrow(
        'OFFSET must be a non-negative integer'
      );
    });
  });

  describe('execute', () => {
    it('should execute query successfully', async () => {
      const mockData = [{ id: 1, name: 'Test' }];
      const mockSupabaseChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: mockData,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockSupabaseChain);

      const result = await builder
        .select('id, name')
        .where('status', 'eq', 'active')
        .orderBy('created_at', 'desc')
        .limit(10)
        .execute();

      expect(result).toEqual(mockData);
      expect(mockSupabaseChain.select).toHaveBeenCalledWith('id, name');
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('status', 'active');
    });
  });

  describe('insert', () => {
    it('should insert data successfully', async () => {
      const insertData = { name: 'Test', status: 'active' };
      const mockResult = { id: 1, ...insertData };

      const mockSupabaseChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockResult,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockSupabaseChain);

      const result = await builder.insert(insertData);

      expect(result).toEqual(mockResult);
      expect(mockSupabaseChain.insert).toHaveBeenCalledWith(insertData);
    });
  });

  describe('update', () => {
    it('should require WHERE conditions for update', async () => {
      await expect(builder.update({ name: 'Updated' })).rejects.toThrow(
        'UPDATE requires WHERE conditions'
      );
    });

    it('should update with WHERE conditions', async () => {
      const updateData = { name: 'Updated' };
      const mockResult = [{ id: 1, ...updateData }];

      const mockSupabaseChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: mockResult,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockSupabaseChain);

      const result = await builder
        .where('id', 'eq', 1)
        .update(updateData);

      expect(result).toEqual(mockResult);
      expect(mockSupabaseChain.update).toHaveBeenCalledWith(updateData);
    });
  });

  describe('delete', () => {
    it('should require WHERE conditions for delete', async () => {
      await expect(builder.delete()).rejects.toThrow(
        'DELETE requires WHERE conditions'
      );
    });

    it('should delete with WHERE conditions', async () => {
      const mockSupabaseChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockSupabaseChain);

      await expect(
        builder.where('id', 'eq', 1).delete()
      ).resolves.not.toThrow();

      expect(mockSupabaseChain.delete).toHaveBeenCalled();
    });
  });
});