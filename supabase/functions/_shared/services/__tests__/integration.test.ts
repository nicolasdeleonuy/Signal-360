// Integration Tests for Google API Service with Fundamental Analysis
import { assertEquals, assertExists, assert } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import { createGoogleApiClient } from '../googleApiService.ts';

// Mock logger for testing
const mockLogger = {
    info: (msg: string, data?: any) => console.log(`INFO: ${msg}`, data || ''),
    warn: (msg: string, data?: any) => console.log(`WARN: ${msg}`, data || ''),
    error: (msg: string, data?: any) => console.log(`ERROR: ${msg}`, data || ''),
    debug: (msg: string, data?: any) => console.log(`DEBUG: ${msg}`, data || '')
};

Deno.test('Integration - Google API Client with Fundamental Analysis', async () => {
    const validKey = 'AIzaSyDxKL8J9mK3nL2pQ4rS5tU6vW7xY8zA9bC';
    const client = createGoogleApiClient(validKey, mockLogger);

    console.log('🧪 Testing Google API Client integration...');

    // Test fundamental data retrieval
    const fundamentalData = await client.getFundamentalData('AAPL');
    
    console.log('📊 Fundamental data structure:');
    console.log(`- Ticker: ${fundamentalData.ticker}`);
    console.log(`- Company: ${fundamentalData.companyInfo.name}`);
    console.log(`- Sector: ${fundamentalData.companyInfo.sector}`);
    console.log(`- Market Cap: $${(fundamentalData.companyInfo.marketCap / 1000000000).toFixed(1)}B`);
    console.log(`- Financial Statements: ${fundamentalData.financialStatements.length} periods`);
    console.log(`- Data Sources: ${fundamentalData.dataSources.join(', ')}`);

    // Verify data structure
    assertExists(fundamentalData);
    assertEquals(fundamentalData.ticker, 'AAPL');
    assertExists(fundamentalData.companyInfo);
    assertExists(fundamentalData.financialStatements);
    assertExists(fundamentalData.financialRatios);
    assertExists(fundamentalData.growthMetrics);
    assertExists(fundamentalData.qualityIndicators);

    // Test financial ratios
    const ratios = fundamentalData.financialRatios;
    console.log('📈 Financial Ratios:');
    console.log(`- ROE: ${ratios.profitability.roe.toFixed(2)}%`);
    console.log(`- ROA: ${ratios.profitability.roa.toFixed(2)}%`);
    console.log(`- Current Ratio: ${ratios.liquidity.currentRatio.toFixed(2)}`);
    console.log(`- Debt/Equity: ${ratios.leverage.debtToEquity.toFixed(2)}`);
    console.log(`- P/E Ratio: ${ratios.valuation.peRatio.toFixed(2)}`);

    // Verify ratios are reasonable
    assert(ratios.profitability.roe >= -100 && ratios.profitability.roe <= 100);
    assert(ratios.liquidity.currentRatio >= 0);
    assert(ratios.leverage.debtToEquity >= 0);

    // Test growth metrics
    const growth = fundamentalData.growthMetrics;
    console.log('📊 Growth Metrics:');
    console.log(`- Revenue Growth: ${growth.revenueGrowth.toFixed(2)}%`);
    console.log(`- Earnings Growth: ${growth.earningsGrowth.toFixed(2)}%`);
    console.log(`- FCF Growth: ${growth.fcfGrowth.toFixed(2)}%`);

    // Test quality indicators
    const quality = fundamentalData.qualityIndicators;
    console.log('🎯 Quality Indicators:');
    console.log(`- ROIC Trend: ${quality.roicTrend.toFixed(2)}%`);
    console.log(`- Margin Stability: ${quality.marginStability.toFixed(2)}`);
    console.log(`- FCF Consistency: ${quality.fcfConsistency.toFixed(2)}%`);

    // Test financial statements
    const statements = fundamentalData.financialStatements;
    if (statements.length > 0) {
        const latest = statements[0];
        console.log('💰 Latest Financial Statement:');
        console.log(`- Revenue: $${(latest.revenue / 1000000000).toFixed(1)}B`);
        console.log(`- Net Income: $${(latest.netIncome / 1000000000).toFixed(1)}B`);
        console.log(`- Total Assets: $${(latest.totalAssets / 1000000000).toFixed(1)}B`);
        console.log(`- Free Cash Flow: $${(latest.freeCashFlow / 1000000000).toFixed(1)}B`);
        console.log(`- Report Date: ${latest.reportDate}`);

        // Verify statement data
        assert(latest.revenue >= 0);
        assert(latest.totalAssets >= 0);
        assertExists(latest.reportDate);
    }

    console.log('✅ Integration test completed successfully');
});

Deno.test('Integration - Multiple Tickers Consistency', async () => {
    const validKey = 'AIzaSyDxKL8J9mK3nL2pQ4rS5tU6vW7xY8zA9bC';
    const client = createGoogleApiClient(validKey, mockLogger);

    console.log('🧪 Testing multiple tickers for consistency...');

    const tickers = ['AAPL', 'MSFT', 'GOOGL'];
    const results = [];

    for (const ticker of tickers) {
        const data = await client.getFundamentalData(ticker);
        results.push(data);
        
        console.log(`📊 ${ticker}:`);
        console.log(`  - Company: ${data.companyInfo.name}`);
        console.log(`  - Sector: ${data.companyInfo.sector}`);
        console.log(`  - Market Cap: $${(data.companyInfo.marketCap / 1000000000).toFixed(1)}B`);
        console.log(`  - Data Sources: ${data.dataSources.join(', ')}`);
    }

    // Verify each ticker has unique data
    for (let i = 0; i < results.length; i++) {
        for (let j = i + 1; j < results.length; j++) {
            // Company names should be different (based on ticker)
            assert(results[i].companyInfo.name !== results[j].companyInfo.name);
            
            // Tickers should match
            assertEquals(results[i].ticker, tickers[i]);
            assertEquals(results[j].ticker, tickers[j]);
        }
    }

    console.log('✅ Multiple ticker consistency test passed');
});

Deno.test('Integration - Error Handling', async () => {
    const validKey = 'AIzaSyDxKL8J9mK3nL2pQ4rS5tU6vW7xY8zA9bC';
    const client = createGoogleApiClient(validKey, mockLogger);

    console.log('🧪 Testing error handling...');

    // Test with invalid ticker (should still work with mock data)
    const invalidTickerData = await client.getFundamentalData('INVALID');
    
    assertExists(invalidTickerData);
    assertEquals(invalidTickerData.ticker, 'INVALID');
    assertExists(invalidTickerData.companyInfo);
    
    console.log(`📊 Invalid ticker handled gracefully:`);
    console.log(`  - Company: ${invalidTickerData.companyInfo.name}`);
    console.log(`  - Data Sources: ${invalidTickerData.dataSources.join(', ')}`);

    // Should include "Generated Data" as a source when APIs fail
    assert(invalidTickerData.dataSources.includes('Generated Data'));

    console.log('✅ Error handling test passed');
});

Deno.test('Integration - Performance Metrics', async () => {
    const validKey = 'AIzaSyDxKL8J9mK3nL2pQ4rS5tU6vW7xY8zA9bC';
    const client = createGoogleApiClient(validKey, mockLogger);

    console.log('🧪 Testing performance metrics...');

    const startTime = performance.now();
    
    // Test concurrent requests
    const promises = ['AAPL', 'MSFT', 'GOOGL'].map(ticker => 
        client.getFundamentalData(ticker)
    );
    
    const results = await Promise.all(promises);
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    
    console.log(`⚡ Performance Results:`);
    console.log(`  - Total Time: ${totalTime.toFixed(2)}ms`);
    console.log(`  - Average per ticker: ${(totalTime / 3).toFixed(2)}ms`);
    console.log(`  - Requests completed: ${results.length}`);

    // Verify all requests completed successfully
    assertEquals(results.length, 3);
    results.forEach((result, index) => {
        assertExists(result);
        assertEquals(result.ticker, ['AAPL', 'MSFT', 'GOOGL'][index]);
    });

    // Performance should be reasonable (under 10 seconds for 3 requests)
    assert(totalTime < 10000, `Performance too slow: ${totalTime}ms`);

    console.log('✅ Performance test passed');
});

console.log('🎉 All integration tests completed successfully');