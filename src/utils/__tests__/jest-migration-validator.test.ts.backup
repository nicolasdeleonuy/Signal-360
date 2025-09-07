/**
 * Tests for Jest Migration Validation Utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import {
  JEST_PATTERNS,
  TEST_FILE_EXTENSIONS,
  getAllFiles,
  scanFileForJestSyntax,
  scanFilesForJestSyntax,
  validateJestMigration,
  generateJestReferenceReport,
  isMigrationComplete,
  getJestPatternsInFile,
  validateFileMigration
} from '../jest-migration-validator';

const TEST_DIR = join(process.cwd(), 'temp-test-migration');

describe('Jest Migration Validator', () => {
  beforeEach(() => {
    // Create temporary test directory
    try {
      mkdirSync(TEST_DIR, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  });

  afterEach(() => {
    // Clean up temporary test directory
    try {
      rmSync(TEST_DIR, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist
    }
  });

  describe('JEST_PATTERNS', () => {
    it('should contain all expected Jest patterns', () => {
      expect(JEST_PATTERNS).toHaveProperty('jest.mock');
      expect(JEST_PATTERNS).toHaveProperty('jest.fn');
      expect(JEST_PATTERNS).toHaveProperty('jest.spyOn');
      expect(JEST_PATTERNS).toHaveProperty('jest.useFakeTimers');
      expect(JEST_PATTERNS).toHaveProperty('jest.MockedFunction');
      expect(JEST_PATTERNS).toHaveProperty('jest.Mocked');
      expect(JEST_PATTERNS).toHaveProperty('jest_namespace');
    });

    it('should have regex patterns that match Jest syntax', () => {
      expect('jest.mock("module")').toMatch(JEST_PATTERNS['jest.mock']);
      expect('jest.fn()').toMatch(JEST_PATTERNS['jest.fn']);
      expect('jest.spyOn(obj, "method")').toMatch(JEST_PATTERNS['jest.spyOn']);
      expect('jest.MockedFunction<typeof fn>').toMatch(JEST_PATTERNS['jest.MockedFunction']);
    });
  });

  describe('getAllFiles', () => {
    it('should find test files in directory structure', () => {
      // Create test files
      mkdirSync(join(TEST_DIR, 'src', '__tests__'), { recursive: true });
      writeFileSync(join(TEST_DIR, 'src', '__tests__', 'example.test.ts'), '');
      writeFileSync(join(TEST_DIR, 'src', '__tests__', 'example.test.tsx'), '');
      writeFileSync(join(TEST_DIR, 'src', '__tests__', 'example.spec.ts'), '');
      writeFileSync(join(TEST_DIR, 'src', 'regular.ts'), '');

      const files = getAllFiles(TEST_DIR, TEST_FILE_EXTENSIONS);
      
      expect(files).toHaveLength(3);
      expect(files.some(f => f.endsWith('example.test.ts'))).toBe(true);
      expect(files.some(f => f.endsWith('example.test.tsx'))).toBe(true);
      expect(files.some(f => f.endsWith('example.spec.ts'))).toBe(true);
      expect(files.some(f => f.endsWith('regular.ts'))).toBe(false);
    });

    it('should exclude node_modules and other excluded directories', () => {
      // Create files in excluded directories
      mkdirSync(join(TEST_DIR, 'node_modules', 'package'), { recursive: true });
      mkdirSync(join(TEST_DIR, '.git'), { recursive: true });
      writeFileSync(join(TEST_DIR, 'node_modules', 'package', 'test.test.ts'), '');
      writeFileSync(join(TEST_DIR, '.git', 'test.test.ts'), '');
      writeFileSync(join(TEST_DIR, 'valid.test.ts'), '');

      const files = getAllFiles(TEST_DIR, TEST_FILE_EXTENSIONS);
      
      expect(files).toHaveLength(1);
      expect(files[0]).toMatch(/valid\.test\.ts$/);
    });
  });

  describe('scanFileForJestSyntax', () => {
    it('should detect Jest syntax in file content', () => {
      const testFile = join(TEST_DIR, 'test.test.ts');
      const content = `
import { jest } from '@jest/globals';

describe('Test', () => {
  it('should work', () => {
    const mockFn = jest.fn();
    jest.spyOn(console, 'log');
    jest.mock('./module');
  });
});
`;
      writeFileSync(testFile, content);

      const result = scanFileForJestSyntax(testFile);
      
      expect(result.hasJestSyntax).toBe(true);
      expect(result.totalReferences).toBeGreaterThan(0);
      expect(result.jestReferences.some(ref => ref.pattern === 'jest.fn')).toBe(true);
      expect(result.jestReferences.some(ref => ref.pattern === 'jest.spyOn')).toBe(true);
      expect(result.jestReferences.some(ref => ref.pattern === 'jest.mock')).toBe(true);
    });

    it('should return empty results for files without Jest syntax', () => {
      const testFile = join(TEST_DIR, 'clean.test.ts');
      const content = `
import { vi } from 'vitest';

describe('Test', () => {
  it('should work', () => {
    const mockFn = vi.fn();
    vi.spyOn(console, 'log');
  });
});
`;
      writeFileSync(testFile, content);

      const result = scanFileForJestSyntax(testFile);
      
      expect(result.hasJestSyntax).toBe(false);
      expect(result.totalReferences).toBe(0);
      expect(result.jestReferences).toHaveLength(0);
    });

    it('should correctly identify line numbers and content', () => {
      const testFile = join(TEST_DIR, 'line-test.test.ts');
      const content = `line 1
line 2
const mock = jest.fn();
line 4`;
      writeFileSync(testFile, content);

      const result = scanFileForJestSyntax(testFile);
      
      // Should find both jest.fn and jest_namespace patterns
      expect(result.jestReferences.length).toBeGreaterThan(0);
      const jestFnRef = result.jestReferences.find(ref => ref.pattern === 'jest.fn');
      expect(jestFnRef).toBeDefined();
      expect(jestFnRef!.line).toBe(3);
      expect(jestFnRef!.content).toBe('const mock = jest.fn();');
    });
  });

  describe('validateJestMigration', () => {
    it('should return complete migration when no Jest syntax found', () => {
      // Create clean test files
      mkdirSync(join(TEST_DIR, 'src'), { recursive: true });
      writeFileSync(join(TEST_DIR, 'src', 'clean.test.ts'), 'import { vi } from "vitest";');
      
      const report = validateJestMigration(TEST_DIR);
      
      expect(report.migrationComplete).toBe(true);
      expect(report.filesWithJestSyntax).toBe(0);
      expect(report.totalJestReferences).toBe(0);
    });

    it('should return incomplete migration when Jest syntax found', () => {
      // Create files with Jest syntax
      mkdirSync(join(TEST_DIR, 'src'), { recursive: true });
      writeFileSync(join(TEST_DIR, 'src', 'jest.test.ts'), 'jest.fn()');
      writeFileSync(join(TEST_DIR, 'src', 'clean.test.ts'), 'vi.fn()');
      
      const report = validateJestMigration(TEST_DIR);
      
      expect(report.migrationComplete).toBe(false);
      expect(report.filesWithJestSyntax).toBe(1);
      expect(report.totalJestReferences).toBeGreaterThan(0);
    });

    it('should categorize files correctly', () => {
      // Create different types of files
      mkdirSync(join(TEST_DIR, 'src', 'types'), { recursive: true });
      writeFileSync(join(TEST_DIR, 'src', 'test.test.ts'), 'jest.fn()');
      writeFileSync(join(TEST_DIR, 'src', 'types', 'mocks.ts'), 'jest.MockedFunction');
      writeFileSync(join(TEST_DIR, 'README.md'), 'jest.mock');
      
      const report = validateJestMigration(TEST_DIR);
      
      expect(report.summary.testFiles).toBe(1);
      expect(report.summary.typeFiles).toBe(1);
      expect(report.summary.documentationFiles).toBe(1);
    });
  });

  describe('generateJestReferenceReport', () => {
    it('should generate a comprehensive report', () => {
      const mockReport = {
        totalFilesScanned: 10,
        filesWithJestSyntax: 2,
        totalJestReferences: 5,
        migrationComplete: false,
        summary: {
          testFiles: 1,
          typeFiles: 1,
          documentationFiles: 0,
          otherFiles: 0
        },
        fileResults: [
          {
            filePath: 'test.test.ts',
            hasJestSyntax: true,
            totalReferences: 3,
            jestReferences: [
              {
                pattern: 'jest.fn',
                line: 1,
                column: 1,
                content: 'jest.fn()',
                filePath: 'test.test.ts'
              }
            ]
          }
        ]
      };

      const report = generateJestReferenceReport(mockReport);
      
      expect(report).toContain('# Jest Migration Validation Report');
      expect(report).toContain('**Total files scanned:** 10');
      expect(report).toContain('**Files with Jest syntax:** 2');
      expect(report).toContain('**Migration complete:** ❌ NO');
      expect(report).toContain('test.test.ts');
      expect(report).toContain('jest.fn');
    });

    it('should show completion message when migration is complete', () => {
      const mockReport = {
        totalFilesScanned: 10,
        filesWithJestSyntax: 0,
        totalJestReferences: 0,
        migrationComplete: true,
        summary: {
          testFiles: 0,
          typeFiles: 0,
          documentationFiles: 0,
          otherFiles: 0
        },
        fileResults: []
      };

      const report = generateJestReferenceReport(mockReport);
      
      expect(report).toContain('**Migration complete:** ✅ YES');
      expect(report).toContain('✅ Migration Complete');
      expect(report).toContain('No Jest syntax references found');
    });
  });

  describe('isMigrationComplete', () => {
    it('should return true when no Jest syntax found', () => {
      mkdirSync(join(TEST_DIR, 'src'), { recursive: true });
      writeFileSync(join(TEST_DIR, 'src', 'clean.test.ts'), 'vi.fn()');
      
      const isComplete = isMigrationComplete(TEST_DIR);
      
      expect(isComplete).toBe(true);
    });

    it('should return false when Jest syntax found', () => {
      mkdirSync(join(TEST_DIR, 'src'), { recursive: true });
      writeFileSync(join(TEST_DIR, 'src', 'jest.test.ts'), 'jest.fn()');
      
      const isComplete = isMigrationComplete(TEST_DIR);
      
      expect(isComplete).toBe(false);
    });
  });

  describe('getJestPatternsInFile', () => {
    it('should return unique patterns found in file', () => {
      const testFile = join(TEST_DIR, 'patterns.test.ts');
      const content = `
jest.fn();
jest.fn();
jest.spyOn();
jest.mock();
`;
      writeFileSync(testFile, content);

      const patterns = getJestPatternsInFile(testFile);
      
      expect(patterns).toContain('jest.fn');
      expect(patterns).toContain('jest.spyOn');
      expect(patterns).toContain('jest.mock');
      // Should not have duplicates
      expect(patterns.filter(p => p === 'jest.fn')).toHaveLength(1);
    });
  });

  describe('validateFileMigration', () => {
    it('should validate individual file migration status', () => {
      const testFile = join(TEST_DIR, 'individual.test.ts');
      writeFileSync(testFile, 'jest.fn(); jest.spyOn();');

      const validation = validateFileMigration(testFile);
      
      expect(validation.isMigrated).toBe(false);
      expect(validation.referenceCount).toBeGreaterThan(0);
      expect(validation.remainingPatterns).toContain('jest.fn');
      expect(validation.remainingPatterns).toContain('jest.spyOn');
    });

    it('should confirm migration for clean files', () => {
      const testFile = join(TEST_DIR, 'clean-individual.test.ts');
      writeFileSync(testFile, 'vi.fn(); vi.spyOn();');

      const validation = validateFileMigration(testFile);
      
      expect(validation.isMigrated).toBe(true);
      expect(validation.referenceCount).toBe(0);
      expect(validation.remainingPatterns).toHaveLength(0);
    });
  });
});