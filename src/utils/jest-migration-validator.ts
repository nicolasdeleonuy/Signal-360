/**
 * Jest to Vitest Migration Validation Utilities
 * 
 * This module provides utilities to scan for Jest syntax patterns across the codebase,
 * analyze file content for specific Jest references, and validate complete migration.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

// Jest syntax patterns to search for
export const JEST_PATTERNS = {
  // Core Jest functions
  'jest.mock': /jest\.mock\s*\(/g,
  'jest.fn': /jest\.fn\s*\(/g,
  'jest.spyOn': /jest\.spyOn\s*\(/g,
  'jest.useFakeTimers': /jest\.useFakeTimers\s*\(/g,
  'jest.clearAllMocks': /jest\.clearAllMocks\s*\(/g,
  'jest.resetAllMocks': /jest\.resetAllMocks\s*\(/g,
  'jest.restoreAllMocks': /jest\.restoreAllMocks\s*\(/g,
  'jest.requireActual': /jest\.requireActual\s*\(/g,
  'jest.requireMock': /jest\.requireMock\s*\(/g,
  
  // Jest types
  'jest.MockedFunction': /jest\.MockedFunction/g,
  'jest.Mocked': /jest\.Mocked/g,
  'jest.SpyInstance': /jest\.SpyInstance/g,
  
  // Jest namespace usage
  'jest_namespace': /\bjest\./g,
} as const;

// File extensions to scan
export const TEST_FILE_EXTENSIONS = ['.test.ts', '.test.tsx', '.spec.ts', '.spec.tsx'];

// Additional file extensions for documentation and type files
export const ADDITIONAL_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.md'];

export interface JestReference {
  pattern: string;
  line: number;
  column: number;
  content: string;
  filePath: string;
}

export interface FileScanResult {
  filePath: string;
  jestReferences: JestReference[];
  totalReferences: number;
  hasJestSyntax: boolean;
}

export interface MigrationValidationReport {
  totalFilesScanned: number;
  filesWithJestSyntax: number;
  totalJestReferences: number;
  fileResults: FileScanResult[];
  migrationComplete: boolean;
  summary: {
    testFiles: number;
    typeFiles: number;
    documentationFiles: number;
    otherFiles: number;
  };
}

/**
 * Recursively get all files in a directory with specified extensions
 */
export function getAllFiles(
  dirPath: string, 
  extensions: string[] = [...TEST_FILE_EXTENSIONS, ...ADDITIONAL_EXTENSIONS],
  excludeDirs: string[] = ['node_modules', '.git', 'dist', 'build', '.next']
): string[] {
  const files: string[] = [];
  
  try {
    const items = readdirSync(dirPath);
    
    for (const item of items) {
      const fullPath = join(dirPath, item);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip excluded directories
        if (!excludeDirs.includes(item)) {
          files.push(...getAllFiles(fullPath, extensions, excludeDirs));
        }
      } else if (stat.isFile()) {
        const ext = extname(item);
        const isTestFile = TEST_FILE_EXTENSIONS.some(testExt => item.endsWith(testExt));
        const isRelevantFile = extensions.includes(ext) || isTestFile;
        
        if (isRelevantFile) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not read directory ${dirPath}:`, error);
  }
  
  return files;
}

/**
 * Scan a single file for Jest syntax patterns
 */
export function scanFileForJestSyntax(filePath: string): FileScanResult {
  const jestReferences: JestReference[] = [];
  
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    // Check each Jest pattern
    Object.entries(JEST_PATTERNS).forEach(([patternName, regex]) => {
      let match;
      const globalRegex = new RegExp(regex.source, 'g');
      
      while ((match = globalRegex.exec(content)) !== null) {
        // Find line and column number
        const beforeMatch = content.substring(0, match.index);
        const lineNumber = beforeMatch.split('\n').length;
        const lastNewlineIndex = beforeMatch.lastIndexOf('\n');
        const columnNumber = match.index - lastNewlineIndex;
        
        jestReferences.push({
          pattern: patternName,
          line: lineNumber,
          column: columnNumber,
          content: lines[lineNumber - 1]?.trim() || '',
          filePath
        });
      }
    });
    
  } catch (error) {
    console.warn(`Warning: Could not read file ${filePath}:`, error);
  }
  
  return {
    filePath,
    jestReferences,
    totalReferences: jestReferences.length,
    hasJestSyntax: jestReferences.length > 0
  };
}

/**
 * Scan multiple files for Jest syntax patterns
 */
export function scanFilesForJestSyntax(filePaths: string[]): FileScanResult[] {
  return filePaths.map(scanFileForJestSyntax);
}

/**
 * Categorize files by type
 */
function categorizeFile(filePath: string): 'test' | 'type' | 'documentation' | 'other' {
  if (TEST_FILE_EXTENSIONS.some(ext => filePath.endsWith(ext))) {
    return 'test';
  }
  if (filePath.includes('/types/') || filePath.endsWith('.d.ts')) {
    return 'type';
  }
  if (filePath.endsWith('.md') || filePath.includes('README')) {
    return 'documentation';
  }
  return 'other';
}

/**
 * Perform comprehensive Jest syntax validation across the codebase
 */
export function validateJestMigration(
  rootPath: string = process.cwd(),
  includeDocumentation: boolean = true
): MigrationValidationReport {
  const extensions = includeDocumentation 
    ? [...TEST_FILE_EXTENSIONS, ...ADDITIONAL_EXTENSIONS]
    : TEST_FILE_EXTENSIONS;
    
  const allFiles = getAllFiles(rootPath, extensions);
  const scanResults = scanFilesForJestSyntax(allFiles);
  
  const filesWithJestSyntax = scanResults.filter(result => result.hasJestSyntax);
  const totalJestReferences = scanResults.reduce((sum, result) => sum + result.totalReferences, 0);
  
  // Categorize files
  const summary = {
    testFiles: 0,
    typeFiles: 0,
    documentationFiles: 0,
    otherFiles: 0
  };
  
  filesWithJestSyntax.forEach(result => {
    const category = categorizeFile(result.filePath);
    switch (category) {
      case 'test':
        summary.testFiles++;
        break;
      case 'type':
        summary.typeFiles++;
        break;
      case 'documentation':
        summary.documentationFiles++;
        break;
      default:
        summary.otherFiles++;
    }
  });
  
  return {
    totalFilesScanned: allFiles.length,
    filesWithJestSyntax: filesWithJestSyntax.length,
    totalJestReferences,
    fileResults: scanResults,
    migrationComplete: totalJestReferences === 0,
    summary
  };
}

/**
 * Generate a detailed report of Jest references found
 */
export function generateJestReferenceReport(report: MigrationValidationReport): string {
  const { fileResults, totalFilesScanned, filesWithJestSyntax, totalJestReferences, migrationComplete, summary } = report;
  
  let reportText = `# Jest Migration Validation Report\n\n`;
  reportText += `**Generated:** ${new Date().toISOString()}\n\n`;
  
  reportText += `## Summary\n`;
  reportText += `- **Total files scanned:** ${totalFilesScanned}\n`;
  reportText += `- **Files with Jest syntax:** ${filesWithJestSyntax}\n`;
  reportText += `- **Total Jest references:** ${totalJestReferences}\n`;
  reportText += `- **Migration complete:** ${migrationComplete ? '✅ YES' : '❌ NO'}\n\n`;
  
  reportText += `## File Categories\n`;
  reportText += `- **Test files:** ${summary.testFiles}\n`;
  reportText += `- **Type files:** ${summary.typeFiles}\n`;
  reportText += `- **Documentation files:** ${summary.documentationFiles}\n`;
  reportText += `- **Other files:** ${summary.otherFiles}\n\n`;
  
  if (filesWithJestSyntax > 0) {
    reportText += `## Files Requiring Migration\n\n`;
    
    const filesWithJest = fileResults.filter(result => result.hasJestSyntax);
    
    filesWithJest.forEach(result => {
      reportText += `### ${result.filePath}\n`;
      reportText += `**References found:** ${result.totalReferences}\n\n`;
      
      // Group references by pattern
      const referencesByPattern = result.jestReferences.reduce((acc, ref) => {
        if (!acc[ref.pattern]) {
          acc[ref.pattern] = [];
        }
        acc[ref.pattern].push(ref);
        return acc;
      }, {} as Record<string, JestReference[]>);
      
      Object.entries(referencesByPattern).forEach(([pattern, refs]) => {
        reportText += `**${pattern}** (${refs.length} occurrences):\n`;
        refs.forEach(ref => {
          reportText += `- Line ${ref.line}: \`${ref.content}\`\n`;
        });
        reportText += `\n`;
      });
    });
  } else {
    reportText += `## ✅ Migration Complete\n\n`;
    reportText += `No Jest syntax references found in the codebase. Migration is complete!\n\n`;
  }
  
  return reportText;
}

/**
 * Quick validation function to check if migration is complete
 */
export function isMigrationComplete(rootPath: string = process.cwd()): boolean {
  const report = validateJestMigration(rootPath, false); // Only check test files for quick validation
  return report.migrationComplete;
}

/**
 * Get specific Jest patterns found in a file
 */
export function getJestPatternsInFile(filePath: string): string[] {
  const result = scanFileForJestSyntax(filePath);
  return [...new Set(result.jestReferences.map(ref => ref.pattern))];
}

/**
 * Validate that a specific file has been migrated
 */
export function validateFileMigration(filePath: string): {
  isMigrated: boolean;
  remainingPatterns: string[];
  referenceCount: number;
} {
  const result = scanFileForJestSyntax(filePath);
  const patterns = getJestPatternsInFile(filePath);
  
  return {
    isMigrated: !result.hasJestSyntax,
    remainingPatterns: patterns,
    referenceCount: result.totalReferences
  };
}