/**
 * Tests for Migration Status Checker
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  checkMigrationStatus,
  getFilesNeedingMigration,
  getMigrationProgress,
  displayMigrationStatus
} from '../migration-status-checker';

// Mock the jest-migration-validator module
vi.mock('../jest-migration-validator', () => ({
  isMigrationComplete: vi.fn(),
  validateJestMigration: vi.fn()
}));

import { isMigrationComplete, validateJestMigration } from '../jest-migration-validator';

describe('Migration Status Checker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkMigrationStatus', () => {
    it('should return complete status when migration is done', () => {
      vi.mocked(isMigrationComplete).mockReturnValue(true);

      const status = checkMigrationStatus();

      expect(status.isComplete).toBe(true);
      expect(status.filesWithJestSyntax).toBe(0);
      expect(status.totalJestReferences).toBe(0);
      expect(status.summary).toContain('✅ Jest migration is complete');
    });

    it('should return incomplete status with details when migration is not done', () => {
      vi.mocked(isMigrationComplete).mockReturnValue(false);
      vi.mocked(validateJestMigration).mockReturnValue({
        totalFilesScanned: 10,
        filesWithJestSyntax: 3,
        totalJestReferences: 15,
        fileResults: [],
        migrationComplete: false,
        summary: {
          testFiles: 3,
          typeFiles: 0,
          documentationFiles: 0,
          otherFiles: 0
        }
      });

      const status = checkMigrationStatus();

      expect(status.isComplete).toBe(false);
      expect(status.filesWithJestSyntax).toBe(3);
      expect(status.totalJestReferences).toBe(15);
      expect(status.summary).toContain('❌ Jest migration incomplete');
      expect(status.summary).toContain('15 Jest references');
      expect(status.summary).toContain('3 files');
    });
  });

  describe('getFilesNeedingMigration', () => {
    it('should return list of files with Jest syntax', () => {
      vi.mocked(validateJestMigration).mockReturnValue({
        totalFilesScanned: 5,
        filesWithJestSyntax: 2,
        totalJestReferences: 10,
        fileResults: [
          {
            filePath: '/path/to/file1.test.ts',
            hasJestSyntax: true,
            totalReferences: 5,
            jestReferences: []
          },
          {
            filePath: '/path/to/file2.test.ts',
            hasJestSyntax: false,
            totalReferences: 0,
            jestReferences: []
          },
          {
            filePath: '/path/to/file3.test.ts',
            hasJestSyntax: true,
            totalReferences: 5,
            jestReferences: []
          }
        ],
        migrationComplete: false,
        summary: {
          testFiles: 2,
          typeFiles: 0,
          documentationFiles: 0,
          otherFiles: 0
        }
      });

      const files = getFilesNeedingMigration();

      expect(files).toHaveLength(2);
      expect(files).toContain('/path/to/file1.test.ts');
      expect(files).toContain('/path/to/file3.test.ts');
      expect(files).not.toContain('/path/to/file2.test.ts');
    });

    it('should return empty array when no files need migration', () => {
      vi.mocked(validateJestMigration).mockReturnValue({
        totalFilesScanned: 3,
        filesWithJestSyntax: 0,
        totalJestReferences: 0,
        fileResults: [
          {
            filePath: '/path/to/file1.test.ts',
            hasJestSyntax: false,
            totalReferences: 0,
            jestReferences: []
          }
        ],
        migrationComplete: true,
        summary: {
          testFiles: 0,
          typeFiles: 0,
          documentationFiles: 0,
          otherFiles: 0
        }
      });

      const files = getFilesNeedingMigration();

      expect(files).toHaveLength(0);
    });
  });

  describe('getMigrationProgress', () => {
    it('should calculate correct progress percentage', () => {
      vi.mocked(validateJestMigration).mockReturnValue({
        totalFilesScanned: 10,
        filesWithJestSyntax: 3,
        totalJestReferences: 15,
        fileResults: [],
        migrationComplete: false,
        summary: {
          testFiles: 3,
          typeFiles: 0,
          documentationFiles: 0,
          otherFiles: 0
        }
      });

      const progress = getMigrationProgress();

      // 7 out of 10 files migrated = 70%
      expect(progress).toBe(70);
    });

    it('should return 100% when all files are migrated', () => {
      vi.mocked(validateJestMigration).mockReturnValue({
        totalFilesScanned: 5,
        filesWithJestSyntax: 0,
        totalJestReferences: 0,
        fileResults: [],
        migrationComplete: true,
        summary: {
          testFiles: 0,
          typeFiles: 0,
          documentationFiles: 0,
          otherFiles: 0
        }
      });

      const progress = getMigrationProgress();

      expect(progress).toBe(100);
    });

    it('should return 100% when no files exist', () => {
      vi.mocked(validateJestMigration).mockReturnValue({
        totalFilesScanned: 0,
        filesWithJestSyntax: 0,
        totalJestReferences: 0,
        fileResults: [],
        migrationComplete: true,
        summary: {
          testFiles: 0,
          typeFiles: 0,
          documentationFiles: 0,
          otherFiles: 0
        }
      });

      const progress = getMigrationProgress();

      expect(progress).toBe(100);
    });
  });

  describe('displayMigrationStatus', () => {
    it('should display complete status', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      vi.mocked(isMigrationComplete).mockReturnValue(true);
      vi.mocked(validateJestMigration).mockReturnValue({
        totalFilesScanned: 5,
        filesWithJestSyntax: 0,
        totalJestReferences: 0,
        fileResults: [],
        migrationComplete: true,
        summary: {
          testFiles: 0,
          typeFiles: 0,
          documentationFiles: 0,
          otherFiles: 0
        }
      });

      displayMigrationStatus();

      expect(consoleSpy).toHaveBeenCalledWith('\n🔍 Jest Migration Status:');
      expect(consoleSpy).toHaveBeenCalledWith('   ✅ Jest migration is complete! No Jest syntax found in test files.');
      expect(consoleSpy).toHaveBeenCalledWith('   Progress: 100%');

      consoleSpy.mockRestore();
    });

    it('should display incomplete status with file list', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      vi.mocked(isMigrationComplete).mockReturnValue(false);
      vi.mocked(validateJestMigration).mockReturnValue({
        totalFilesScanned: 5,
        filesWithJestSyntax: 2,
        totalJestReferences: 10,
        fileResults: [
          {
            filePath: '/root/file1.test.ts',
            hasJestSyntax: true,
            totalReferences: 5,
            jestReferences: []
          },
          {
            filePath: '/root/file2.test.ts',
            hasJestSyntax: true,
            totalReferences: 5,
            jestReferences: []
          }
        ],
        migrationComplete: false,
        summary: {
          testFiles: 2,
          typeFiles: 0,
          documentationFiles: 0,
          otherFiles: 0
        }
      });

      displayMigrationStatus('/root');

      expect(consoleSpy).toHaveBeenCalledWith('\n🔍 Jest Migration Status:');
      expect(consoleSpy).toHaveBeenCalledWith('   ❌ Jest migration incomplete. Found 10 Jest references in 2 files.');
      expect(consoleSpy).toHaveBeenCalledWith('   Progress: 60%');
      expect(consoleSpy).toHaveBeenCalledWith('   Files needing migration: 2');
      expect(consoleSpy).toHaveBeenCalledWith('   Files:');
      expect(consoleSpy).toHaveBeenCalledWith('     - ./file1.test.ts');
      expect(consoleSpy).toHaveBeenCalledWith('     - ./file2.test.ts');

      consoleSpy.mockRestore();
    });
  });
});