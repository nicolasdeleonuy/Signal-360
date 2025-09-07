#!/usr/bin/env node

/**
 * CLI script to validate Jest to Vitest migration
 * 
 * Usage:
 *   node scripts/validate-jest-migration.js [options]
 * 
 * Options:
 *   --report, -r    Generate detailed report file
 *   --quick, -q     Quick validation (test files only)
 *   --help, -h      Show help
 */

// Import the compiled JavaScript version or use ts-node
let validationModule;
try {
  // Try to import the TypeScript file using ts-node or compiled version
  validationModule = require('../src/utils/jest-migration-validator');
} catch (error) {
  console.error('❌ Could not load validation module. Make sure TypeScript is compiled or ts-node is available.');
  console.error('   Run: npm run build or install ts-node');
  process.exit(1);
}

const { validateJestMigration, generateJestReferenceReport, isMigrationComplete } = validationModule;
const { writeFileSync } = require('fs');
const { join } = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  report: args.includes('--report') || args.includes('-r'),
  quick: args.includes('--quick') || args.includes('-q'),
  help: args.includes('--help') || args.includes('-h')
};

function showHelp() {
  console.log(`
Jest to Vitest Migration Validator

Usage:
  node scripts/validate-jest-migration.js [options]

Options:
  --report, -r    Generate detailed report file (jest-migration-report.md)
  --quick, -q     Quick validation (test files only, no documentation)
  --help, -h      Show this help message

Examples:
  node scripts/validate-jest-migration.js
  node scripts/validate-jest-migration.js --report
  node scripts/validate-jest-migration.js --quick --report
`);
}

function main() {
  if (options.help) {
    showHelp();
    return;
  }

  console.log('🔍 Validating Jest to Vitest migration...\n');

  try {
    // Quick validation first
    if (options.quick) {
      console.log('⚡ Running quick validation (test files only)...');
      const isComplete = isMigrationComplete();
      
      if (isComplete) {
        console.log('✅ Quick validation passed: No Jest syntax found in test files');
        return;
      } else {
        console.log('❌ Quick validation failed: Jest syntax found in test files');
      }
    }

    // Full validation
    console.log('🔍 Running comprehensive validation...');
    const report = validateJestMigration(process.cwd(), !options.quick);
    
    // Display summary
    console.log('\n📊 Migration Summary:');
    console.log(`   Total files scanned: ${report.totalFilesScanned}`);
    console.log(`   Files with Jest syntax: ${report.filesWithJestSyntax}`);
    console.log(`   Total Jest references: ${report.totalJestReferences}`);
    console.log(`   Migration complete: ${report.migrationComplete ? '✅ YES' : '❌ NO'}`);
    
    if (report.filesWithJestSyntax > 0) {
      console.log('\n📁 File Categories:');
      console.log(`   Test files: ${report.summary.testFiles}`);
      console.log(`   Type files: ${report.summary.typeFiles}`);
      console.log(`   Documentation files: ${report.summary.documentationFiles}`);
      console.log(`   Other files: ${report.summary.otherFiles}`);
      
      console.log('\n📝 Files requiring migration:');
      const filesWithJest = report.fileResults.filter(result => result.hasJestSyntax);
      filesWithJest.slice(0, 10).forEach(result => {
        console.log(`   ${result.filePath} (${result.totalReferences} references)`);
      });
      
      if (filesWithJest.length > 10) {
        console.log(`   ... and ${filesWithJest.length - 10} more files`);
      }
    }

    // Generate report file if requested
    if (options.report) {
      console.log('\n📄 Generating detailed report...');
      const reportContent = generateJestReferenceReport(report);
      const reportPath = join(process.cwd(), 'jest-migration-report.md');
      writeFileSync(reportPath, reportContent);
      console.log(`   Report saved to: ${reportPath}`);
    }

    // Exit with appropriate code
    process.exit(report.migrationComplete ? 0 : 1);

  } catch (error) {
    console.error('❌ Error during validation:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };