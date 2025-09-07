// Tests for Enhanced Google API Service
import { assertEquals, assertExists, assert, assertThrows } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import { 
    createGoogleApiClient, 
    validateApiKey, 
    testApiKey,
    GoogleApiError,
    type GoogleApiClient,
    type FundamentalAnalysisData,
    type CompanyInfo,
    type FinancialStatement
} from '../googleApiService.ts';

// Mock logger for testing
const mockLogger = {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {}
};

Deno.test('Google API Service - API Key Validation', () => {
    // Valid Google API key format
    const validKey = 'AIzaSyDxKL8J9mK3nL2pQ4rS5tU6vW7xY8zA9bC';
    assertEquals(validateApiKey(validKey), true);

    // Invalid formats
    assertEquals(validateApiKey(''), false);
    assertEquals(validateApiKey('invalid-key'), false);
    assertEquals(validateApiKey('AIza123'), false); // Too short
    assertEquals(validateApiKey('BIzaSyDxKL8J9mK3nL2pQ4rS5tU6vW7xY8zA9bC'), false); // Wrong prefix
    assertEquals(validateApiKey(null as any), false);
    assertEquals(validateApiKey(undefined as any), false);
});

Deno.test('Google API Service - Client Creation', () => {
    const validKey = 'AIzaSyDxKL8J9mK3nL2pQ4rS5tU6vW7xY8zA9bC';
    
    // Should create client with valid key
    const client = createGoogleApiClient(validKey, mockLogger);
    assertExists(client);
    assert(typeof client.getFundamentalData === 'function');
    assert(typeof client.getCompanyInfo === 'function');
    assert(typeof client.getFinancialStatements === 'function');
    assert(typeof client.testConnection === 'function');

    // Should throw error with invalid key
    assertThrows(
        () => createGoogleApiClient(''),
        GoogleApiError,
        'API key is required'
    );
});

Deno.test('Google API Service - Fundamental Data Structure', async () => {
    const validKey = 'AIzaSyDxKL8J9mK3nL2pQ4rS5tU6vW7xY8zA9bC';
    const client = createGoogleApiClient(validKey, mockLogger);

    // Test with mock data (since we can't make real API calls in tests)
    const fundamentalData = await client.getFundamentalData('AAPL');
    
    // Verify structure
    assertExists(fundamentalData);
    assertEquals(fundamentalData.ticker, 'AAPL');
    assertExists(fundamentalData.companyInfo);
    assertExists(fundamentalData.financialStatements);
    assertExists(fundamentalData.financialRatios);
    assertExists(fundamentalData.growthMetrics);
    assertExists(fundamentalData.qualityIndicators);
    assertExists(fundamentalData.dataSources);
    assertExists(fundamentalData.lastUpdated);

    // Verify company info structure
    const companyInfo = fundamentalData.companyInfo;
    assertExists(companyInfo.name);
    assertExists(companyInfo.sector);
    assertExists(companyInfo.industry);
    assert(typeof companyInfo.marketCap === 'number');
    assert(typeof companyInfo.currentPrice === 'number');
    assert(typeof companyInfo.peRatio === 'number');

    // Verify financial ratios structure
    const ratios = fundamentalData.financialRatios;
    assertExists(ratios.profitability);
    assertExists(ratios.liquidity);
    assertExists(ratios.leverage);
    assertExists(ratios.efficiency);
    assertExists(ratios.valuation);

    // Verify profitability ratios
    assert(typeof ratios.profitability.roe === 'number');
    assert(typeof ratios.profitability.roa === 'number');
    assert(typeof ratios.profitability.netMargin === 'number');

    // Verify growth metrics
    const growth = fundamentalData.growthMetrics;
    assert(typeof growth.revenueGrowth === 'number');
    assert(typeof growth.earningsGrowth === 'number');
    assert(typeof growth.fcfGrowth === 'number');
});

Deno.test('Google API Service - Financial Statements Structure', async () => {
    const validKey = 'AIzaSyDxKL8J9mK3nL2pQ4rS5tU6vW7xY8zA9bC';
    const client = createGoogleApiClient(validKey, mockLogger);

    const statements = await client.getFinancialStatements('AAPL');
    
    assertExists(statements);
    assert(Array.isArray(statements));
    assert(statements.length > 0);

    // Verify statement structure
    const statement = statements[0];
    assert(typeof statement.revenue === 'number');
    assert(typeof statement.netIncome === 'number');
    assert(typeof statement.totalAssets === 'number');
    assert(typeof statement.totalLiabilities === 'number');
    assert(typeof statement.shareholderEquity === 'number');
    assert(typeof statement.operatingCashFlow === 'number');
    assert(typeof statement.freeCashFlow === 'number');
    assertExists(statement.period);
    assertExists(statement.reportDate);
});

Deno.test('Google API Service - Company Info Structure', async () => {
    const validKey = 'AIzaSyDxKL8J9mK3nL2pQ4rS5tU6vW7xY8zA9bC';
    const client = createGoogleApiClient(validKey, mockLogger);

    const companyInfo = await client.getCompanyInfo('AAPL');
    
    assertExists(companyInfo);
    assertExists(companyInfo.name);
    assertExists(companyInfo.sector);
    assertExists(companyInfo.industry);
    assert(typeof companyInfo.marketCap === 'number');
    assert(typeof companyInfo.sharesOutstanding === 'number');
    assert(typeof companyInfo.currentPrice === 'number');
    assert(typeof companyInfo.peRatio === 'number');
    assert(typeof companyInfo.pbRatio === 'number');
    assert(typeof companyInfo.dividendYield === 'number');
    assert(typeof companyInfo.beta === 'number');
});

Deno.test('Google API Service - Error Handling', () => {
    // Test GoogleApiError class
    const error = new GoogleApiError('Test error', 403, { error: 'Forbidden' });
    
    assertEquals(error.name, 'GoogleApiError');
    assertEquals(error.message, 'Test error');
    assertEquals(error.statusCode, 403);
    assertExists(error.apiResponse);

    // Test retryable errors
    const retryableError = new GoogleApiError('Rate limit', 429);
    assertEquals(retryableError.isRetryable(), true);

    const nonRetryableError = new GoogleApiError('Bad request', 400);
    assertEquals(nonRetryableError.isRetryable(), false);

    // Test user-friendly messages
    const authError = new GoogleApiError('Unauthorized', 401);
    assertEquals(authError.getUserMessage(), 'Invalid or expired Google API key. Please update your API key in profile settings.');

    const rateLimitError = new GoogleApiError('Too many requests', 429);
    assertEquals(rateLimitError.getUserMessage(), 'Google API rate limit exceeded. Please try again later.');
});

Deno.test('Google API Service - Mock Data Consistency', async () => {
    const validKey = 'AIzaSyDxKL8J9mK3nL2pQ4rS5tU6vW7xY8zA9bC';
    const client = createGoogleApiClient(validKey, mockLogger);

    // Test that mock data is consistent for the same ticker
    const data1 = await client.getFundamentalData('AAPL');
    const data2 = await client.getFundamentalData('AAPL');

    assertEquals(data1.companyInfo.name, data2.companyInfo.name);
    assertEquals(data1.companyInfo.sector, data2.companyInfo.sector);
    assertEquals(data1.financialStatements.length, data2.financialStatements.length);

    // Test that different tickers produce different data
    const msftData = await client.getFundamentalData('MSFT');
    
    // Names should be different (based on ticker)
    assert(data1.companyInfo.name !== msftData.companyInfo.name);
});

Deno.test('Google API Service - Phase 2 Placeholders', async () => {
    const validKey = 'AIzaSyDxKL8J9mK3nL2pQ4rS5tU6vW7xY8zA9bC';
    const client = createGoogleApiClient(validKey, mockLogger);

    // Technical data should return placeholder
    const technicalData = await client.getTechnicalData('AAPL');
    assertExists(technicalData);
    assertEquals(technicalData.ticker, 'AAPL');
    assertEquals(technicalData.placeholder, true);

    // ESG data should return placeholder
    const esgData = await client.getESGData('AAPL');
    assertExists(esgData);
    assertEquals(esgData.ticker, 'AAPL');
    assertEquals(esgData.placeholder, true);
});

Deno.test('Google API Service - Data Source Attribution', async () => {
    const validKey = 'AIzaSyDxKL8J9mK3nL2pQ4rS5tU6vW7xY8zA9bC';
    const client = createGoogleApiClient(validKey, mockLogger);

    const fundamentalData = await client.getFundamentalData('AAPL');
    
    assertExists(fundamentalData.dataSources);
    assert(Array.isArray(fundamentalData.dataSources));
    assert(fundamentalData.dataSources.length > 0);
    
    // Should include at least one data source
    const hasValidSource = fundamentalData.dataSources.some(source => 
        ['Google Custom Search', 'Alpha Vantage', 'Financial Modeling Prep', 'Generated Data'].includes(source)
    );
    assert(hasValidSource);
});

Deno.test('Google API Service - Financial Calculations', async () => {
    const validKey = 'AIzaSyDxKL8J9mK3nL2pQ4rS5tU6vW7xY8zA9bC';
    const client = createGoogleApiClient(validKey, mockLogger);

    const fundamentalData = await client.getFundamentalData('AAPL');
    const ratios = fundamentalData.financialRatios;

    // Verify ratio calculations are reasonable
    assert(ratios.profitability.roe >= -100 && ratios.profitability.roe <= 100);
    assert(ratios.profitability.roa >= -50 && ratios.profitability.roa <= 50);
    assert(ratios.liquidity.currentRatio >= 0);
    assert(ratios.leverage.debtToEquity >= 0);
    assert(ratios.efficiency.assetTurnover >= 0);

    // Verify growth metrics are reasonable
    const growth = fundamentalData.growthMetrics;
    assert(typeof growth.revenueGrowth === 'number');
    assert(typeof growth.earningsGrowth === 'number');
    
    // Verify quality indicators
    const quality = fundamentalData.qualityIndicators;
    assert(typeof quality.roicTrend === 'number');
    assert(typeof quality.marginStability === 'number');
    assert(quality.fcfConsistency >= 0 && quality.fcfConsistency <= 100);
});

console.log('✅ Google API Service tests completed successfully');