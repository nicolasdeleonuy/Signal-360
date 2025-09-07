#!/usr/bin/env node

// Simple validation script to check test structure
// This can be run with Node.js to validate the test suite structure

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Validating Comprehensive Analysis Test Suite...\n');

// Check if test files exist
const testFiles = [
  'comprehensive-analysis-tests.ts',
  'run-tests.ts',
  'README.md'
];

let allFilesExist = true;

testFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    console.log(`✅ ${file} - ${(stats.size / 1024).toFixed(1)}KB`);
  } else {
    console.log(`❌ ${file} - Missing`);
    allFilesExist = false;
  }
});

if (!allFilesExist) {
  console.log('\n❌ Some test files are missing!');
  process.exit(1);
}

// Validate main test file structure
const testFileContent = fs.readFileSync(path.join(__dirname, 'comprehensive-analysis-tests.ts'), 'utf8');

const requiredClasses = [
  'TestDataGenerator',
  'AnalysisTestSuite',
  'UnitTestSuite',
  'IntegrationTestSuite',
  'ErrorScenarioTestSuite'
];

const requiredMethods = [
  'generateFundamentalResult',
  'generateTechnicalResult',
  'generateESGResult',
  'generateSynthesisResult',
  'testFundamentalAnalysisService',
  'testTechnicalAnalysisService',
  'testSentimentEcoAnalysisService',
  'testSynthesisEngineService',
  'testCompleteAnalysisPipeline',
  'testPartialFailureScenarios',
  'testCircuitBreakerResilience',
  'testRateLimitingResilience',
  'testGracefulDegradation'
];

console.log('\n📋 Checking test structure...');

let structureValid = true;

requiredClasses.forEach(className => {
  if (testFileContent.includes(`class ${className}`) || testFileContent.includes(`export class ${className}`)) {
    console.log(`✅ ${className} class found`);
  } else {
    console.log(`❌ ${className} class missing`);
    structureValid = false;
  }
});

requiredMethods.forEach(methodName => {
  if (testFileContent.includes(`${methodName}(`)) {
    console.log(`✅ ${methodName} method found`);
  } else {
    console.log(`❌ ${methodName} method missing`);
    structureValid = false;
  }
});

// Check for test scenarios
const testScenarios = [
  'Strong Bull Market',
  'Bear Market Decline',
  'Mixed Signals',
  'Day Trading Momentum',
  'Value Investment'
];

console.log('\n🎯 Checking test scenarios...');

testScenarios.forEach(scenario => {
  if (testFileContent.includes(scenario)) {
    console.log(`✅ ${scenario} scenario found`);
  } else {
    console.log(`❌ ${scenario} scenario missing`);
    structureValid = false;
  }
});

// Check for error handling
const errorTypes = [
  'TICKER_VALIDATION_FAILED',
  'EXTERNAL_API_ERROR',
  'ANALYSIS_TIMEOUT',
  'PARTIAL_ANALYSIS_FAILURE',
  'DATA_QUALITY_INSUFFICIENT'
];

console.log('\n⚠️  Checking error handling...');

errorTypes.forEach(errorType => {
  if (testFileContent.includes(errorType)) {
    console.log(`✅ ${errorType} error handling found`);
  } else {
    console.log(`❌ ${errorType} error handling missing`);
    structureValid = false;
  }
});

// Count test methods
const testMethodCount = (testFileContent.match(/static async test\w+/g) || []).length;
const assertCount = (testFileContent.match(/assert\(/g) || []).length;

console.log('\n📊 Test Statistics:');
console.log(`  Test Methods: ${testMethodCount}`);
console.log(`  Assertions: ${assertCount}`);
console.log(`  File Size: ${(testFileContent.length / 1024).toFixed(1)}KB`);
console.log(`  Lines of Code: ${testFileContent.split('\n').length}`);

if (structureValid && testMethodCount > 15 && assertCount > 50) {
  console.log('\n🎉 Test suite validation passed!');
  console.log('✅ All required components are present');
  console.log('✅ Comprehensive test coverage detected');
  console.log('✅ Error handling scenarios included');
  console.log('✅ Market scenarios covered');
  console.log('\n📝 Next Steps:');
  console.log('  1. Run tests with Deno: deno run --allow-net --allow-read --allow-env run-tests.ts');
  console.log('  2. Check individual test suites: run-tests.ts unit|integration|error');
  console.log('  3. Review test results and coverage');
} else {
  console.log('\n❌ Test suite validation failed!');
  console.log('  Missing required components or insufficient test coverage');
  process.exit(1);
}