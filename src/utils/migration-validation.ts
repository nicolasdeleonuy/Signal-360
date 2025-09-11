// Migration validation utilities for Jest to Vitest migration
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Jest syntax patterns to search for during migration validation
 */
export const JEST_PATTERNS = [
  'jest.mock',
  'jest.fn',
  'jest.spyOn',
  'jest.useFakeTimers',
  'jest.MockedFunction',
  'jest.Mocked',
  'jest.requireActual',
  'jest.clearAllMocks',
  'jest.resetAllMocks',
  'jest.restoreAllMocks'
] as const;

/**
 * File extensions to scan for Jest syntax
 */
export const TEST_FILE_EXTENSIONS = ['.test.ts', '.test.tsx', '.spec.ts', '.spec.tsx'] as const;

/**
 * Interface for Jest reference found in a file
 */
export interface JestReference {
  pattern: string;
  line: number;
  content: string;
  filePath: string;
}

/**
 * Interface for file scan results
 */
export interface FileScanResult {
  filePath: string;
  jestReferences: JestReference[];
  hasJestSyntax: boolean;
  totalReferences: number;
}

/**
 * Interface for complete migration validation results
 */
export interface MigrationValidationResult {
  totalFilesScanned: number;
  filesWithJestSyntax: number;
  totalJestReferences: number;
  fileResults: FileScanResult[];
  isComplete: boolean;
}

/**
 * Recursively find all test files in a directory
 */
export function findTestFiles(directory: string): string[] {
  const testFiles: string[] = [];
  
  function scanDirectory(dir: string): void {
    try {
      const items = readdirSync(dir);
      
      for (const item of items) {
        const fullPath = join(dir, item);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Skip node_modules and other common directories to ignore
          if (!['node_modules', '.git', 'dist', 'build'].includes(item)) {
            scanDirectory(fullPath);
          }
        } else if (stat.isFile()) {
          const isTestFile = TEST_FILE_EXTENSIONS.some(testExt => 
            item.endsWith(testExt)
          );
          
          if (isTestFile) {
            testFiles.push(fullPath);
          }
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not scan directory ${dir}:`, error);
    }
  }
  
  scanDirectory(directory);
  return testFiles;
}

/**
 * Scan a single file for Jest syntax patterns
 */
export function scanFileForJestSyntax(filePath: string): FileScanResult {
  const jestReferences: JestReference[] = [];
  
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      JEST_PATTERNS.forEach(pattern => {
        if (line.includes(pattern)) {
          jestReferences.push({
            pattern,
            line: index + 1,
            content: line.trim(),
            filePath
          });
        }
      });
    });
  } catch (error) {
    console.warn(`Warning: Could not read file ${filePath}:`, error);
  }
  
  return {
    filePath,
    jestReferences,
    hasJestSyntax: jestReferences.length > 0,
    totalReferences: jestReferences.length
  };
}

/**
 * Scan multiple files for Jest syntax patterns
 */
export function scanFilesForJestSyntax(filePaths: string[]): FileScanResult[] {
  return filePaths.map(filePath => scanFileForJestSyntax(filePath));
}

/**
 * Perform comprehensive migration validation across the entire codebase
 */
export function validateMigrationComplete(rootDirectory: string = process.cwd()): MigrationValidationResult {
  const testFiles = findTestFiles(rootDirectory);
  const fileResults = scanFilesForJestSyntax(testFiles);
  
  const filesWithJestSyntax = fileResults.filter(result => result.hasJestSyntax);
  const totalJestReferences = fileResults.reduce((sum, result) => sum + result.totalReferences, 0);
  
  return {
    totalFilesScanned: fileResults.length,
    filesWithJestSyntax: filesWithJestSyntax.length,
    totalJestReferences,
    fileResults,
    isComplete: totalJestReferences === 0
  };
}

/**
 * Generate a detailed migration validation report
 */
export function generateMigrationReport(validationResult: MigrationValidationResult): string {
  const { 
    totalFilesScanned, 
    filesWithJestSyntax, 
    totalJestReferences, 
    fileResults, 
    isComplete 
  } = validationResult;
  
  let report = `# Jest to Vitest Migration Validation Report\n\n`;
  report += `## Summary\n`;
  report += `- **Total test files scanned**: ${totalFilesScanned}\n`;
  report += `- **Files with Jest syntax**: ${filesWithJestSyntax}\n`;
  report += `- **Total Jest references**: ${totalJestReferences}\n`;
  report += `- **Migration complete**: ${isComplete ? '✅ Yes' : '❌ No'}\n\n`;
  
  if (!isComplete) {
    report += `## Files Requiring Migration\n\n`;
    
    const filesNeedingMigration = fileResults.filter(result => result.hasJestSyntax);
    
    filesNeedingMigration.forEach(fileResult => {
      report += `### ${fileResult.filePath}\n`;
      report += `- **Jest references found**: ${fileResult.totalReferences}\n\n`;
      
      fileResult.jestReferences.forEach(ref => {
        report += `- Line ${ref.line}: \`${ref.pattern}\`\n`;
        report += `  \`\`\`typescript\n  ${ref.content}\n  \`\`\`\n`;
      });
      
      report += `\n`;
    });
  } else {
    report += `## ✅ Migration Complete\n\n`;
    report += `All test files have been successfully migrated from Jest to Vitest syntax.\n`;
  }
  
  return report;
}

/**
 * Validate that a specific file has been properly migrated
 */
export function validateFileMigration(filePath: string): {
  isMigrated: boolean;
  remainingJestReferences: JestReference[];
  hasVitestImports: boolean;
} {
  const scanResult = scanFileForJestSyntax(filePath);
  
  // Check for Vitest imports
  let hasVitestImports = false;
  try {
    const content = readFileSync(filePath, 'utf-8');
    hasVitestImports = content.includes('from \'vitest\'') || content.includes('import { vi }');
  } catch (error) {
    console.warn(`Warning: Could not check Vitest imports in ${filePath}:`, error);
  }
  
  return {
    isMigrated: scanResult.totalReferences === 0,
    remainingJestReferences: scanResult.jestReferences,
    hasVitestImports
  };
}