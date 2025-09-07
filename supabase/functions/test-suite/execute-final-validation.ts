#!/usr/bin/env -S deno run --allow-net --allow-read --allow-write --allow-env

// Final Validation Execution Script
// Comprehensive validation of the complete Signal-360 analysis pipeline

import { FinalIntegrationTestSuite } from './final-integration-tests.ts';
import { RequirementsValidator } from './validate-requirements.ts';
import { AnalysisTestSuite } from './comprehensive-analysis-tests.ts';

/**
 * Final validation execution results
 */
interface ValidationResults {
  requirementsValidation: {
    passed: boolean;
    details: string;
  };
  integrationTests: {
    passed: boolean;
    details: string;
  };
  comprehensiveTests: {
    passed: boolean;
    details: string;
  };
  overallStatus: 'PASSED' | 'FAILED' | 'PARTIAL';
  summary: string;
}

/**
 * Main validation execution function
 */
async function executeCompleteValidation(): Promise<ValidationResults> {
  console.log('🚀 Signal-360 Analysis Pipeline - Final Validation');
  console.log('==================================================');
  console.log(`Execution started at: ${new Date().toISOString()}\n`);

  const results: ValidationResults = {
    requirementsValidation: { passed: false, details: '' },
    integrationTests: { passed: false, details: '' },
    comprehensiveTests: { passed: false, details: '' },
    overallStatus: 'FAILED',
    summary: ''
  };

  let totalTests = 0;
  let passedTests = 0;

  try {
    // Phase 1: Requirements Validation
    console.log('📋 PHASE 1: Requirements Validation');
    console.log('=====================================\n');
    
    try {
      await RequirementsValidator.validateAllRequirements();
      results.requirementsValidation.passed = true;
      results.requirementsValidation.details = 'All requirements validated successfully';
      passedTests++;
      console.log('✅ Requirements validation completed successfully\n');
    } catch (error) {
      results.requirementsValidation.passed = false;
      results.requirementsValidation.details = `Requirements validation failed: ${error.message}`;
      console.log(`❌ Requirements validation failed: ${error.message}\n`);
    }
    totalTests++;

    // Phase 2: Comprehensive Analysis Tests
    console.log('🧪 PHASE 2: Comprehensive Analysis Tests');
    console.log('========================================\n');
    
    try {
      await AnalysisTestSuite.runAllTests();
      results.comprehensiveTests.passed = true;
      results.comprehensiveTests.details = 'All comprehensive tests passed';
      passedTests++;
      console.log('✅ Comprehensive analysis tests completed successfully\n');
    } catch (error) {
      results.comprehensiveTests.passed = false;
      results.comprehensiveTests.details = `Comprehensive tests failed: ${error.message}`;
      console.log(`❌ Comprehensive analysis tests failed: ${error.message}\n`);
    }
    totalTests++;

    // Phase 3: Final Integration Tests
    console.log('🔗 PHASE 3: Final Integration Tests');
    console.log('===================================\n');
    
    try {
      await FinalIntegrationTestSuite.runFinalTests();
      results.integrationTests.passed = true;
      results.integrationTests.details = 'All integration tests passed';
      passedTests++;
      console.log('✅ Final integration tests completed successfully\n');
    } catch (error) {
      results.integrationTests.passed = false;
      results.integrationTests.details = `Integration tests failed: ${error.message}`;
      console.log(`❌ Final integration tests failed: ${error.message}\n`);
    }
    totalTests++;

    // Determine overall status
    if (passedTests === totalTests) {
      results.overallStatus = 'PASSED';
      results.summary = 'All validation phases completed successfully';
    } else if (passedTests > 0) {
      results.overallStatus = 'PARTIAL';
      results.summary = `${passedTests}/${totalTests} validation phases passed`;
    } else {
      results.overallStatus = 'FAILED';
      results.summary = 'All validation phases failed';
    }

    return results;

  } catch (error) {
    results.overallStatus = 'FAILED';
    results.summary = `Validation execution failed: ${error.message}`;
    throw error;
  }
}

/**
 * Generate final validation report
 */
function generateFinalValidationReport(results: ValidationResults, duration: number): void {
  console.log('\n📊 FINAL VALIDATION REPORT');
  console.log('=' .repeat(60));
  console.log(`Execution completed at: ${new Date().toISOString()}`);
  console.log(`Total execution time: ${(duration / 1000).toFixed(2)} seconds`);
  console.log(`Overall Status: ${results.overallStatus}`);
  console.log(`Summary: ${results.summary}\n`);

  console.log('Phase Results:');
  console.log('-'.repeat(40));
  
  const phases = [
    { name: 'Requirements Validation', result: results.requirementsValidation },
    { name: 'Comprehensive Tests', result: results.comprehensiveTests },
    { name: 'Integration Tests', result: results.integrationTests }
  ];

  for (const phase of phases) {
    const status = phase.result.passed ? '✅ PASSED' : '❌ FAILED';
    console.log(`${status} ${phase.name}`);
    console.log(`         ${phase.result.details}`);
  }

  console.log('\n' + '='.repeat(60));

  // Final assessment
  switch (results.overallStatus) {
    case 'PASSED':
      console.log('🎉 VALIDATION SUCCESSFUL!');
      console.log('🚀 Signal-360 Analysis Pipeline is ready for production deployment!');
      console.log('\nKey Achievements:');
      console.log('✅ All specification requirements met');
      console.log('✅ Complete end-to-end functionality validated');
      console.log('✅ Performance optimizations working correctly');
      console.log('✅ Error handling and recovery mechanisms tested');
      console.log('✅ Security and authentication flows validated');
      console.log('✅ Real market data scenarios tested');
      break;

    case 'PARTIAL':
      console.log('⚠️  PARTIAL VALIDATION');
      console.log('Some validation phases passed, but issues were found.');
      console.log('Please review the failed phases and address issues before deployment.');
      break;

    case 'FAILED':
      console.log('❌ VALIDATION FAILED');
      console.log('Critical issues were found that prevent production deployment.');
      console.log('Please review all failed phases and fix issues before retrying.');
      break;
  }

  console.log('\n' + '='.repeat(60));
}

/**
 * Performance and system health check
 */
async function performSystemHealthCheck(): Promise<void> {
  console.log('🏥 System Health Check');
  console.log('======================\n');

  // Check system resources
  console.log('📊 System Resources:');
  try {
    const memInfo = (performance as any).memory;
    if (memInfo) {
      const memUsageMB = memInfo.usedJSHeapSize / (1024 * 1024);
      console.log(`  Memory Usage: ${memUsageMB.toFixed(1)} MB`);
      
      if (memUsageMB > 200) {
        console.log('  ⚠️  High memory usage detected');
      } else {
        console.log('  ✅ Memory usage within normal range');
      }
    }
  } catch {
    console.log('  ℹ️  Memory information not available');
  }

  // Check file system access
  console.log('\n📁 File System Access:');
  try {
    const testFiles = [
      'supabase/functions/signal-360-analysis/index.ts',
      'supabase/functions/_shared/index.ts',
      'supabase/functions/fundamental-analysis/index.ts',
      'supabase/functions/technical-analysis/index.ts',
      'supabase/functions/sentiment-eco-analysis/index.ts'
    ];

    let accessibleFiles = 0;
    for (const file of testFiles) {
      try {
        await Deno.stat(file);
        accessibleFiles++;
      } catch {
        console.log(`  ❌ Cannot access: ${file}`);
      }
    }

    console.log(`  ✅ ${accessibleFiles}/${testFiles.length} core files accessible`);
    
    if (accessibleFiles < testFiles.length) {
      console.log('  ⚠️  Some core files are not accessible');
    }
  } catch (error) {
    console.log(`  ❌ File system check failed: ${error.message}`);
  }

  // Check environment
  console.log('\n🌍 Environment Check:');
  const envVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];
  for (const envVar of envVars) {
    const value = Deno.env.get(envVar);
    if (value) {
      console.log(`  ✅ ${envVar}: Set`);
    } else {
      console.log(`  ⚠️  ${envVar}: Not set (may be optional for tests)`);
    }
  }

  console.log('\n✅ System health check completed\n');
}

/**
 * Main execution
 */
if (import.meta.main) {
  const startTime = Date.now();
  
  try {
    // Perform system health check first
    await performSystemHealthCheck();
    
    // Execute complete validation
    const results = await executeCompleteValidation();
    
    // Generate final report
    const duration = Date.now() - startTime;
    generateFinalValidationReport(results, duration);
    
    // Exit with appropriate code
    if (results.overallStatus === 'PASSED') {
      console.log('\n🎯 All validations passed! System ready for production.');
      Deno.exit(0);
    } else {
      console.log('\n⚠️  Validation issues found. Please review and fix before deployment.');
      Deno.exit(1);
    }
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`\n❌ Final validation failed after ${(duration / 1000).toFixed(2)} seconds:`);
    console.error(error.message);
    
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    
    console.log('\n🔧 Please review the errors above and fix issues before retrying validation.');
    Deno.exit(1);
  }
}