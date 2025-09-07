/**
 * Simple migration status checker utility
 * 
 * This module provides a lightweight way to check if Jest migration is complete
 * without the full validation utilities overhead.
 */

import { validateJestMigration, isMigrationComplete } from './jest-migration-validator';

export interface MigrationStatus {
  isComplete: boolean;
  filesWithJestSyntax: number;
  totalJestReferences: number;
  summary: string;
}

/**
 * Quick check if Jest migration is complete
 */
export function checkMigrationStatus(rootPath: string = process.cwd()): MigrationStatus {
  const isComplete = isMigrationComplete(rootPath);
  
  if (isComplete) {
    return {
      isComplete: true,
      filesWithJestSyntax: 0,
      totalJestReferences: 0,
      summary: '✅ Jest migration is complete! No Jest syntax found in test files.'
    };
  }
  
  // If not complete, get detailed info
  const report = validateJestMigration(rootPath, false); // Only check test files for quick status
  
  return {
    isComplete: false,
    filesWithJestSyntax: report.filesWithJestSyntax,
    totalJestReferences: report.totalJestReferences,
    summary: `❌ Jest migration incomplete. Found ${report.totalJestReferences} Jest references in ${report.filesWithJestSyntax} files.`
  };
}

/**
 * Get a list of files that still need migration
 */
export function getFilesNeedingMigration(rootPath: string = process.cwd()): string[] {
  const report = validateJestMigration(rootPath, false);
  return report.fileResults
    .filter(result => result.hasJestSyntax)
    .map(result => result.filePath);
}

/**
 * Get migration progress as a percentage
 */
export function getMigrationProgress(rootPath: string = process.cwd()): number {
  const report = validateJestMigration(rootPath, false);
  const totalFiles = report.totalFilesScanned;
  const migratedFiles = totalFiles - report.filesWithJestSyntax;
  
  if (totalFiles === 0) return 100;
  
  return Math.round((migratedFiles / totalFiles) * 100);
}

/**
 * Display migration status in console
 */
export function displayMigrationStatus(rootPath: string = process.cwd()): void {
  const status = checkMigrationStatus(rootPath);
  const progress = getMigrationProgress(rootPath);
  
  console.log('\n🔍 Jest Migration Status:');
  console.log(`   ${status.summary}`);
  console.log(`   Progress: ${progress}%`);
  
  if (!status.isComplete) {
    const filesNeedingMigration = getFilesNeedingMigration(rootPath);
    console.log(`   Files needing migration: ${filesNeedingMigration.length}`);
    
    if (filesNeedingMigration.length <= 5) {
      console.log('   Files:');
      filesNeedingMigration.forEach(file => {
        console.log(`     - ${file.replace(rootPath, '.')}`);
      });
    } else {
      console.log('   First 5 files:');
      filesNeedingMigration.slice(0, 5).forEach(file => {
        console.log(`     - ${file.replace(rootPath, '.')}`);
      });
      console.log(`     ... and ${filesNeedingMigration.length - 5} more`);
    }
  }
  console.log('');
}