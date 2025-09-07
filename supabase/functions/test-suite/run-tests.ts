#!/usr/bin/env -S deno run --allow-net --allow-read --allow-env

// Test runner script for the comprehensive analysis test suite
// Usage: deno run --allow-net --allow-read --allow-env run-tests.ts [test-suite]

import { 
  UnitTestSuite, 
  IntegrationTestSuite, 
  ErrorScenarioTestSuite,
  AnalysisTestSuite 
} from './comprehensive-analysis-tests.ts';

/**
 * Available test suites
 */
const TEST_SUITES = {
  'unit': UnitTestSuite.runAllUnitTests,
  'integration': IntegrationTestSuite.runAllIntegrationTests,
  'error': ErrorScenarioTestSuite.runAllErrorScenarioTests,
  'legacy': AnalysisTestSuite.runAllTests,
  'all': runAllTestSuites
};

/**
 * Run all test suites
 */
async function runAllTestSuites(): Promise<void> {
  console.log('🚀 Starting Comprehensive Analysis Test Suite...\n');

  try {
    // Run all test suites in sequence
    await UnitTestSuite.runAllUnitTests();
    console.log('');
    
    await IntegrationTestSuite.runAllIntegrationTests();
    console.log('');
    
    await ErrorScenarioTestSuite.runAllErrorScenarioTests();
    console.log('');
    
    await AnalysisTestSuite.runAllTests();
    
    console.log('\n🎉 All test suites completed successfully!');
    console.log('📊 Test Summary:');
    console.log('  - Unit Tests: ✅ Passed');
    console.log('  - Integration Tests: ✅ Passed');
    console.log('  - Error Scenario Tests: ✅ Passed');
    console.log('  - Legacy Tests: ✅ Passed');
    console.log('  - Market Scenarios: ✅ Passed');
    console.log('  - Performance Tests: ✅ Passed');
    console.log('  - Resilience Tests: ✅ Passed');

  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    Deno.exit(1);
  }
}

/**
 * Display usage information
 */
function showUsage(): void {
  console.log('Usage: deno run --allow-net --allow-read --allow-env run-tests.ts [test-suite]');
  console.log('');
  console.log('Available test suites:');
  console.log('  unit        - Run unit tests only');
  console.log('  integration - Run integration tests only');
  console.log('  error       - Run error scenario tests only');
  console.log('  legacy      - Run legacy test suite only');
  console.log('  all         - Run all test suites (default)');
  console.log('');
  console.log('Examples:');
  console.log('  deno run --allow-net --allow-read --allow-env run-tests.ts');
  console.log('  deno run --allow-net --allow-read --allow-env run-tests.ts unit');
  console.log('  deno run --allow-net --allow-read --allow-env run-tests.ts integration');
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  const args = Deno.args;
  
  // Show help if requested
  if (args.includes('--help') || args.includes('-h')) {
    showUsage();
    return;
  }

  // Determine which test suite to run
  const testSuite = args[0] || 'all';
  
  if (!TEST_SUITES[testSuite as keyof typeof TEST_SUITES]) {
    console.error(`❌ Unknown test suite: ${testSuite}`);
    console.error('');
    showUsage();
    Deno.exit(1);
  }

  // Set up environment
  console.log(`🧪 Running ${testSuite} test suite(s)...`);
  console.log(`📅 Started at: ${new Date().toISOString()}`);
  console.log('');

  const startTime = Date.now();

  try {
    // Run the selected test suite
    await TEST_SUITES[testSuite as keyof typeof TEST_SUITES]();
    
    const duration = Date.now() - startTime;
    console.log(`\n⏱️  Total execution time: ${duration}ms`);
    console.log(`✅ Test suite '${testSuite}' completed successfully!`);
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`\n⏱️  Execution time before failure: ${duration}ms`);
    console.error(`❌ Test suite '${testSuite}' failed:`, error);
    Deno.exit(1);
  }
}

// Run main function
if (import.meta.main) {
  await main();
}