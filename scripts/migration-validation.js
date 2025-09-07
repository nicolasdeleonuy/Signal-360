#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import pkg from 'glob';
const { glob } = pkg;

/**
 * Migration validation utility for Jest to Vitest migration
 * Scans source files for remaining Jest syntax patterns
 */

const JEST_PATTERNS = [
  /jest\.mock\(/g,
  /jest\.fn\(/g,
  /jest\.spyOn\(/g,
  /jest\.clearAllMocks\(/g,
  /jest\.restoreAllMocks\(/g,
  /jest\.clearAllTimers\(/g,
  /jest\.useFakeTimers\(/g,
  /jest\.doMock\(/g,
  /jest\.unmock\(/g,
  /from ['"]@jest\/globals['"]/g,
  /import.*jest.*from/g
];

const PATTERN_NAMES = [
  'jest.mock()',
  'jest.fn()',
  'jest.spyOn()',
  'jest.clearAllMocks()',
  'jest.restoreAllMocks()',
  'jest.clearAllTimers()',
  'jest.useFakeTimers()',
  'jest.doMock()',
  'jest.unmock()',
  '@jest/globals import',
  'jest import'
];

function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const findings = [];
    
    JEST_PATTERNS.forEach((pattern, index) => {
      const matches = content.match(pattern);
      if (matches) {
        findings.push({
          pattern: PATTERN_NAMES[index],
          count: matches.length,
          matches: matches
        });
      }
    });
    
    return findings;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    return [];
  }
}

function validateMigration() {
  console.log('🔍 Scanning for remaining Jest syntax...\n');
  
  // Scan source files
  const sourceFiles = glob.sync('src/**/*.{ts,tsx}', {
    ignore: [
      'src/**/*.backup',
      'src/**/*.bak',
      'src/utils/jest-migration-validator.ts',
      'src/utils/migration-*.ts'
    ]
  });
  
  let totalFindings = 0;
  const problematicFiles = [];
  
  sourceFiles.forEach(filePath => {
    const findings = scanFile(filePath);
    if (findings.length > 0) {
      problematicFiles.push({
        file: filePath,
        findings: findings
      });
      totalFindings += findings.reduce((sum, f) => sum + f.count, 0);
    }
  });
  
  // Generate report
  if (totalFindings === 0) {
    console.log('✅ Migration validation PASSED');
    console.log('🎉 No Jest syntax found in source files');
    console.log(`📊 Scanned ${sourceFiles.length} files`);
    return true;
  } else {
    console.log('❌ Migration validation FAILED');
    console.log(`🚨 Found ${totalFindings} Jest patterns in ${problematicFiles.length} files\n`);
    
    problematicFiles.forEach(({ file, findings }) => {
      console.log(`📁 ${file}:`);
      findings.forEach(finding => {
        console.log(`  - ${finding.pattern}: ${finding.count} occurrence(s)`);
      });
      console.log('');
    });
    
    console.log('🔧 These files need to be migrated to Vitest syntax');
    return false;
  }
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const success = validateMigration();
  process.exit(success ? 0 : 1);
}

export { validateMigration, scanFile };