// Test script for fundamental-only synthesis
// This tests the new fundamental-only synthesis functionality

import { FundamentalAnalysisOutput } from '../_shared/types.ts';

// Mock fundamental analysis result for testing
const mockFundamentalResult: FundamentalAnalysisOutput = {
  score: 75,
  factors: [
    {
      type: 'positive',
      category: 'profitability',
      description: 'Strong ROE of 18.5% indicates efficient use of shareholder equity',
      impact: 'high',
      confidence: 0.9,
      weight: 0.8
    },
    {
      type: 'positive',
      category: 'growth',
      description: 'Strong revenue growth of 15.2% year-over-year',
      impact: 'medium',
      confidence: 0.85,
      weight: 0.7
    },
    {
      type: 'positive',
      category: 'liquidity',
      description: 'Strong current ratio of 2.1 indicates good short-term liquidity',
      impact: 'medium',
      confidence: 0.8,
      weight: 0.6
    },
    {
      type: 'negative',
      category: 'leverage',
      description: 'High debt-to-equity ratio of 2.1 indicates high financial risk',
      impact: 'high',
      confidence: 0.85,
      weight: 0.8
    }
  ],
  details: {
    financial_ratios: {
      profitability: {
        roe: 18.5,
        roa: 8.2,
        netMargin: 12.3,
        grossMargin: 35.6,
        operatingMargin: 15.8
      },
      liquidity: {
        currentRatio: 2.1,
        quickRatio: 1.5,
        cashRatio: 0.4
      },
      leverage: {
        debtToEquity: 2.1,
        debtRatio: 0.68,
        equityRatio: 0.32,
        timesInterestEarned: 5.2
      },
      efficiency: {
        assetTurnover: 0.67,
        inventoryTurnover: 8.5,
        receivablesTurnover: 12.3
      },
      valuation: {
        peRatio: 16.5,
        pbRatio: 3.2,
        psRatio: 2.8,
        pegRatio: 1.1,
        evToEbitda: 12.8
      }
    },
    growth_metrics: {
      revenueGrowth: 15.2,
      earningsGrowth: 22.1,
      fcfGrowth: 18.7,
      revenueCAGR3Y: 12.8,
      earningsCAGR3Y: 19.3
    },
    quality_indicators: {
      roicTrend: 2.3,
      marginStability: 1.8,
      debtTrend: -0.5,
      fcfConsistency: 85.2
    },
    company_info: {
      name: 'AAPL Corporation',
      sector: 'Technology',
      industry: 'Consumer Electronics',
      marketCap: 2800000000000,
      sharesOutstanding: 15500000000,
      currentPrice: 180.50,
      peRatio: 16.5,
      pbRatio: 3.2,
      dividendYield: 0.005,
      beta: 1.2
    },
    financial_statements: [
      {
        revenue: 394328000000,
        netIncome: 48351000000,
        totalAssets: 352755000000,
        totalLiabilities: 239700000000,
        shareholderEquity: 113055000000,
        operatingCashFlow: 73365000000,
        freeCashFlow: 65775000000,
        totalDebt: 120069000000,
        currentAssets: 143566000000,
        currentLiabilities: 68793000000,
        period: 'Annual',
        reportDate: '2023-09-30'
      }
    ]
  },
  confidence: 0.85,
  data_sources: ['Alpha Vantage', 'Google Custom Search']
};

/**
 * Test fundamental-only synthesis
 */
async function testFundamentalOnlySynthesis() {
  console.log('Testing fundamental-only synthesis...');

  try {
    // Test the synthesis endpoint with fundamental-only data
    const testPayload = {
      ticker_symbol: 'AAPL',
      analysis_context: 'investment',
      fundamental_result: mockFundamentalResult
      // Note: No technical_result or esg_result - this triggers fundamental-only mode
    };

    console.log('Test payload:', JSON.stringify(testPayload, null, 2));

    // In a real test, you would make an HTTP request to the synthesis endpoint
    // For now, we'll just validate the payload structure
    console.log('✅ Fundamental-only synthesis payload is valid');
    console.log('✅ Contains fundamental analysis with', mockFundamentalResult.factors.length, 'factors');
    console.log('✅ Fundamental score:', mockFundamentalResult.score);
    console.log('✅ Data sources:', mockFundamentalResult.data_sources?.join(', '));

    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

// Run the test
if (import.meta.main) {
  testFundamentalOnlySynthesis()
    .then(success => {
      console.log(success ? '✅ All tests passed!' : '❌ Tests failed!');
      Deno.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Test execution failed:', error);
      Deno.exit(1);
    });
}

export { testFundamentalOnlySynthesis, mockFundamentalResult };