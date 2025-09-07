#!/usr/bin/env node

/**
 * CLI utility for validating Jest to Vitest migration
 * Usage: node scripts/validate-migration.js [options]
 */

import fs from 'fs';
import path from 'path';

// Jest syntax patterns to search for
const JEST_PATTERNS = [
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
];

// Test file extensions
const TEST_FILE_EXTENSIONS = ['.test.ts', '.test.tsx', '.spec.ts', '.spec.tsx'];

/**
 * Recursively find all test files in a directory
 */
function findTestFiles(directory) {
  const testFiles = [];
  
  function scanDirectory(dir) {
    try {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Skip common directories to ignore
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
      console.warn(`Warning: Could not scan directory ${dir}:`, error.message);
    }
  }
  
  scanDirectory(directory);
  return testFiles;
}

/**
 * Scan a single file for Jest syntax patterns
 */
function scanFileForJestSyntax(filePath) {
  const jestReferences = [];
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
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
    console.warn(`Warning: Could not read file ${filePath}:`, error.message);
  }
  
  return {
    filePath,
    jestReferences,
    hasJestSyntax: jestReferences.length > 0,
    totalReferences: jestReferences.length
  };
}

/**
 * Main validation function
 */
function validateMigration(rootDirectory = process.cwd()) {
  console.log('🔍 Scanning for Jest syntax in test files...\n');
  
  const testFiles = findTestFiles(rootDirectory);
  console.log(`Found ${testFiles.length} test files to scan\n`);
  
  const fileResults = testFiles.map(filePath => scanFileForJestSyntax(filePath));
  
  const filesWithJestSyntax = fileResults.filter(result => result.hasJestSyntax);
  const totalJestReferences = fileResults.reduce((sum, result) => sum + result.totalReferences, 0);
  
  // Display results
  console.log('📊 Migration Validation Results:');
  console.log('================================');
  console.log(`Total test files scanned: ${fileResults.length}`);
  console.log(`Files with Jest syntax: ${filesWithJestSyntax.length}`);
  console.log(`Total Jest references: ${totalJestReferences}`);
  console.log(`Migration complete: ${totalJestReferences === 0 ? '✅ Yes' : '❌ No'}\n`);
  
  if (totalJestReferences > 0) {
    console.log('📋 Files requiring migration:');
    console.log('=============================');
    
    filesWithJestSyntax.forEach(fileResult => {
      console.log(`\n📄 ${fileResult.filePath}`);
      console.log(`   Jest references: ${fileResult.totalReferences}`);
      
      fileResult.jestReferences.forEach(ref => {
        console.log(`   - Line ${ref.line}: ${ref.pattern}`);
        console.log(`     ${ref.content}`);
      });
    });
    
    console.log('\n❌ Migration incomplete. Please convert the above Jest syntax to Vitest equivalents.');
    process.exit(1);
  } else {
    console.log('✅ All test files have been successfully migrated to Vitest!');
    process.exit(0);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const rootDir = args[0] || process.cwd();

// Run validation
validateMigration(rootDir);