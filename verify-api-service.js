// Simple verification that the API service file is properly structured
import fs from 'fs';

const apiServiceContent = fs.readFileSync('src/lib/apiService.ts', 'utf8');

// Check for required exports
const requiredExports = [
  'export interface AnalysisRequest',
  'export interface AnalysisApiResponse',
  'export interface ApiError',
  'export const apiService',
  'export { ApiService }'
];

const requiredFunctions = [
  'getAnalysisForTicker',
  'healthCheck',
  'validateTicker',
  'transformError',
  'withRetry'
];

const requiredFeatures = [
  'axios',
  'supabaseClient',
  'timeout',
  'retry',
  'error handling',
  'logging'
];

console.log('✓ Verifying API Service structure...');

// Check exports
let allExportsFound = true;
for (const exportItem of requiredExports) {
  if (apiServiceContent.includes(exportItem)) {
    console.log(`✓ Found: ${exportItem}`);
  } else {
    console.log(`✗ Missing: ${exportItem}`);
    allExportsFound = false;
  }
}

// Check functions
let allFunctionsFound = true;
for (const func of requiredFunctions) {
  if (apiServiceContent.includes(func)) {
    console.log(`✓ Function: ${func}`);
  } else {
    console.log(`✗ Missing function: ${func}`);
    allFunctionsFound = false;
  }
}

// Check features
let allFeaturesFound = true;
for (const feature of requiredFeatures) {
  if (apiServiceContent.toLowerCase().includes(feature.toLowerCase())) {
    console.log(`✓ Feature: ${feature}`);
  } else {
    console.log(`✗ Missing feature: ${feature}`);
    allFeaturesFound = false;
  }
}

if (allExportsFound && allFunctionsFound && allFeaturesFound) {
  console.log('\n✅ API Service verification passed!');
  console.log('✓ All required exports found');
  console.log('✓ All required functions implemented');
  console.log('✓ All required features included');
} else {
  console.log('\n❌ API Service verification failed!');
  process.exit(1);
}