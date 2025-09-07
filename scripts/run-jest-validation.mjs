#!/usr/bin/env node

/**
 * Simple Jest validation runner using direct file system operations
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootPath = join(__dirname, '..');

// Jest patterns to search for
const JEST_PATTERNS = {
  'jest.mock': /jest\.mock\s*\(/g,
  'jest.fn': /jest\.fn\s*\(/g,
  'jest.spyOn': /jest\.spyOn\s*\(/g,
  'jest.useFakeTimers': /jest\.useFakeTimers\s*\(/g,
  'jest.MockedFunction': /jest\.MockedFunction/g,
  'jest.Mocked': /jest\.Mocked/g,
  'jest_namespace': /\bjest\./g,
};

const TEST_FILE_EXTENSIONS = ['.test.ts', '.test.tsx', '.spec.ts', '.spec.tsx'];

function getAllFiles(dirPath, extensions = TEST_FILE_EXTENSIONS, excludeDirs = ['node_modules', '.git', 'dist', 'build']) {
  const files = [];
  
  try {
    const items = readdirSync(dirPath);
    
    for (const item of items) {
      const fullPath = join(dirPath, item);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (!excludeDirs.includes(item)) {
          files.push(...getAllFiles(fullPath, extensions, excludeDirs));
        }
      } else if (stat.isFile()) {
        const isTestFile = TEST_FILE_EXTENSIONS.some(testExt => item.endsWith(testExt));
        if (isTestFile) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not read directory ${dirPath}:`, error.message);
  }
  
  return files;
}

function scanFileForJestSyntax(filePath) {
  const jestReferences = [];
  
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    Object.entries(JEST_PATTERNS).forEach(([patternName, regex]) => {
      let match;
      const globalRegex = new RegExp(regex.source, 'g');
      
      while ((match = globalRegex.exec(content)) !== null) {
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
    console.warn(`Warning: Could not read file ${filePath}:`, error.message);
  }
  
  return {
    filePath,
    jestReferences,
    totalReferences: jestReferences.length,
    hasJestSyntax: jestReferences.length > 0
  };
}

function main() {
  console.log('🔍 Scanning for Jest syntax in test files...\n');
  
  const testFiles = getAllFiles(rootPath);
  console.log(`Found ${testFiles.length} test files to scan\n`);
  
  const results = testFiles.map(scanFileForJestSyntax);
  const filesWithJest = results.filter(result => result.hasJestSyntax);
  const totalReferences = results.reduce((sum, result) => sum + result.totalReferences, 0);
  
  console.log('📊 Results:');
  console.log(`   Files scanned: ${testFiles.length}`);
  console.log(`   Files with Jest syntax: ${filesWithJest.length}`);
  console.log(`   Total Jest references: ${totalReferences}`);
  console.log(`   Migration complete: ${totalReferences === 0 ? '✅ YES' : '❌ NO'}\n`);
  
  if (filesWithJest.length > 0) {
    console.log('📝 Files requiring migration:\n');
    
    filesWithJest.forEach(result => {
      console.log(`📄 ${result.filePath.replace(rootPath, '.')}`);
      console.log(`   References: ${result.totalReferences}`);
      
      // Group by pattern
      const byPattern = result.jestReferences.reduce((acc, ref) => {
        if (!acc[ref.pattern]) acc[ref.pattern] = [];
        acc[ref.pattern].push(ref);
        return acc;
      }, {});
      
      Object.entries(byPattern).forEach(([pattern, refs]) => {
        console.log(`   ${pattern}: ${refs.length} occurrence(s)`);
        refs.slice(0, 3).forEach(ref => {
          console.log(`     Line ${ref.line}: ${ref.content}`);
        });
        if (refs.length > 3) {
          console.log(`     ... and ${refs.length - 3} more`);
        }
      });
      console.log('');
    });
  }
  
  // Generate report if requested
  if (process.argv.includes('--report')) {
    const reportContent = generateReport(results, filesWithJest, totalReferences);
    const reportPath = join(rootPath, 'jest-migration-validation-report.md');
    writeFileSync(reportPath, reportContent);
    console.log(`📄 Detailed report saved to: ${reportPath}`);
  }
  
  process.exit(totalReferences === 0 ? 0 : 1);
}

function generateReport(results, filesWithJest, totalReferences) {
  let report = `# Jest Migration Validation Report\n\n`;
  report += `**Generated:** ${new Date().toISOString()}\n\n`;
  
  report += `## Summary\n`;
  report += `- **Total files scanned:** ${results.length}\n`;
  report += `- **Files with Jest syntax:** ${filesWithJest.length}\n`;
  report += `- **Total Jest references:** ${totalReferences}\n`;
  report += `- **Migration complete:** ${totalReferences === 0 ? '✅ YES' : '❌ NO'}\n\n`;
  
  if (filesWithJest.length > 0) {
    report += `## Files Requiring Migration\n\n`;
    
    filesWithJest.forEach(result => {
      report += `### ${result.filePath.replace(rootPath, '.')}\n`;
      report += `**References found:** ${result.totalReferences}\n\n`;
      
      const byPattern = result.jestReferences.reduce((acc, ref) => {
        if (!acc[ref.pattern]) acc[ref.pattern] = [];
        acc[ref.pattern].push(ref);
        return acc;
      }, {});
      
      Object.entries(byPattern).forEach(([pattern, refs]) => {
        report += `**${pattern}** (${refs.length} occurrences):\n`;
        refs.forEach(ref => {
          report += `- Line ${ref.line}: \`${ref.content}\`\n`;
        });
        report += `\n`;
      });
    });
  } else {
    report += `## ✅ Migration Complete\n\n`;
    report += `No Jest syntax references found in the codebase. Migration is complete!\n\n`;
  }
  
  return report;
}

main();