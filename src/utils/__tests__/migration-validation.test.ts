// Migrated to Vitest
import { describe, it, expect } from 'vitest';
import {
  JEST_PATTERNS,
  TEST_FILE_EXTENSIONS,
  generateMigrationReport,
  type MigrationValidationResult
} from '../migration-validation';

describe('Migration Validation Utilities', () => {
  describe('JEST_PATTERNS', () => {
    it('should contain all expected Jest patterns', () => {
      expect(JEST_PATTERNS).toContain('jest.mock');
      expect(JEST_PATTERNS).toContain('jest.fn');
      expect(JEST_PATTERNS).toContain('jest.spyOn');
      expect(JEST_PATTERNS).toContain('jest.useFakeTimers');
      expect(JEST_PATTERNS).toContain('jest.MockedFunction');
      expect(JEST_PATTERNS).toContain('jest.Mocked');
    });
  });

  describe('TEST_FILE_EXTENSIONS', () => {
    it('should contain all expected test file extensions', () => {
      expect(TEST_FILE_EXTENSIONS).toContain('.test.ts');
      expect(TEST_FILE_EXTENSIONS).toContain('.test.tsx');
      expect(TEST_FILE_EXTENSIONS).toContain('.spec.ts');
      expect(TEST_FILE_EXTENSIONS).toContain('.spec.tsx');
    });
  });

  describe('generateMigrationReport', () => {
    it('should generate a complete migration report', () => {
      const mockValidationResult: MigrationValidationResult = {
        totalFilesScanned: 2,
        filesWithJestSyntax: 1,
        totalJestReferences: 2,
        isComplete: false,
        fileResults: [
          {
            filePath: 'test1.test.ts',
            hasJestSyntax: true,
            totalReferences: 2,
            jestReferences: [
              {
                pattern: 'jest.fn',
                line: 1,
                content: 'const mockFn = jest.fn();',
                filePath: 'test1.test.ts'
              },
              {
                pattern: 'jest.mock',
                line: 2,
                content: 'jest.mock("./module");',
                filePath: 'test1.test.ts'
              }
            ]
          },
          {
            filePath: 'test2.test.ts',
            hasJestSyntax: false,
            totalReferences: 0,
            jestReferences: []
          }
        ]
      };
      
      const report = generateMigrationReport(mockValidationResult);
      
      expect(report).toContain('# Jest to Vitest Migration Validation Report');
      expect(report).toContain('Total test files scanned**: 2');
      expect(report).toContain('Files with Jest syntax**: 1');
      expect(report).toContain('Total Jest references**: 2');
      expect(report).toContain('Migration complete**: ❌ No');
      expect(report).toContain('## Files Requiring Migration');
      expect(report).toContain('test1.test.ts');
    });

    it('should generate a success report when migration is complete', () => {
      const mockValidationResult: MigrationValidationResult = {
        totalFilesScanned: 2,
        filesWithJestSyntax: 0,
        totalJestReferences: 0,
        isComplete: true,
        fileResults: []
      };
      
      const report = generateMigrationReport(mockValidationResult);
      
      expect(report).toContain('Migration complete**: ✅ Yes');
      expect(report).toContain('## ✅ Migration Complete');
      expect(report).toContain('All test files have been successfully migrated');
    });
  });

  describe('validateFileMigration', () => {
    it('should validate that a file has been properly migrated', () => {
      const mockContent = `
        import { vi } from 'vitest';
        const mockFn = vi.fn();
      `;
      
      mockReadFileSync.mockReturnValue(mockContent);
      
      const result = validateFileMigration('test-file.test.ts');
      
      expect(result.isMigrated).toBe(true);
      expect(result.remainingJestReferences).toHaveLength(0);
      expect(result.hasVitestImports).toBe(true);
    });

    it('should detect incomplete migration', () => {
      const mockContent = `
        import { vi } from 'vitest';
        const mockFn = jest.fn(); // Still has Jest syntax
      `;
      
      mockReadFileSync.mockReturnValue(mockContent);
      
      const result = validateFileMigration('test-file.test.ts');
      
      expect(result.isMigrated).toBe(false);
      expect(result.remainingJestReferences).toHaveLength(1);
      expect(result.hasVitestImports).toBe(true);
    });
  });
});