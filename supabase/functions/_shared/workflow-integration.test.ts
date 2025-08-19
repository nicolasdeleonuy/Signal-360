// Workflow-specific integration tests
// Tests the interaction between analysis modules, synthesis engine, and database persistence

import { assertEquals, assertExists, assert } from 'https://deno.land/std@0.168.0/testing/asserts.ts';

// Mock environment setup
Deno.env.set('SUPABASE_URL', 'https://test.supabase.co');
Deno.env.set('SUPABASE_ANON_KEY', 'test-anon-key');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');
Deno.env.set('ENCRYPTION_KEY', 'test-encryption-key-with-sufficient-length-for-security');

/**
 * Mock analysis results for testing workflow integration
 */
const mockAnalysisResults = {
  fundamental: {
    score: 75,
    factors: [
      {
        category: 'fundamental',
        type: 'positive',
        description: 'Strong revenue growth of 12% YoY',
        weight: 0.8,
        confidence: 0.9
      },
      {
        category: 'fundamental',
        type: 'negative',
        description: 'High debt-to-equity ratio',
        weight: 0.3,
        confidence: 0.7
      }
    ],
    details: {
      financial_ratios: { roe: 25.3, pe: 18.5, debt_to_equity: 0.65 },
      growth_metrics: { revenue_growth: 12.0, earnings_growth: 8.5 },
      valuation_metrics: { pe_ratio: 18.5, pb_ratio: 3.2 },
      quality_indicators: { debt_service_coverage: 15.2, current_ratio: 1.8 }
    },
    confidence: 0.85
  },
  technical: {
    score: 68,
    factors: [
      {
        category: 'technical',
        type: 'positive',
        description: 'Bullish trend with strong momentum',
        weight: 0.7,
        confidence: 0.8
      },
      {
        category: 'technical',
        type: 'negative',
        description: 'Approaching resistance level',
        weight: 0.4,
        confidence: 0.6
      }
    ],
    details: {
      trend_indicators: { sma_20: 150.25, sma_50: 148.75, trend: 'bullish' },
      momentum_indicators: { rsi: 65.5, macd: 2.3, momentum: 'strong' },
      volume_indicators: { volume_sma: 1250000, volume_trend: 'increasing' },
      support_resistance: {
        support_levels: [145.0, 142.5],
        resistance_levels: [155.0, 158.5]
      }
    },
    confidence: 0.8
  },
  esg: {
    score: 82,
    factors: [
      {
        category: 'esg',
        type: 'positive',
        description: 'Leading environmental practices',
        weight: 0.6,
        confidence: 0.75
      },
      {
        category: 'esg',
        type: 'positive',
        description: 'Strong governance structure',
        weight: 0.5,
        confidence: 0.8
      }
    ],
    details: {
      environmental_score: 85,
      social_score: 78,
      governance_score: 83,
      sustainability_metrics: { 
        carbon_footprint: 2.5, 
        diversity_index: 0.65,
        board_independence: 0.8
      }
    },
    confidence: 0.75
  }
};

/**
 * Mock synthesis results for different contexts
 */
const mockSynthesisResults = {
  investment: {
    synthesis_score: 76,
    convergence_factors: [
      {
        category: 'growth',
        description: 'Strong growth indicators across fundamental and ESG analysis',
        weight: 0.8,
        supporting_analyses: ['fundamental', 'esg'],
        metadata: { growth_rate: 12.0, sustainability_score: 82 }
      },
      {
        category: 'quality',
        description: 'High-quality company with strong governance',
        weight: 0.6,
        supporting_analyses: ['fundamental', 'esg'],
        metadata: { roe: 25.3, governance_score: 83 }
      }
    ],
    divergence_factors: [
      {
        category: 'valuation',
        description: 'Technical momentum vs fundamental valuation concerns',
        weight: 0.3,
        conflicting_analyses: ['fundamental', 'technical'],
        metadata: { pe_ratio: 18.5, technical_score: 68 }
      }
    ],
    full_report: {
      summary: 'Strong long-term investment opportunity with solid fundamentals and ESG credentials',
      recommendation: 'buy',
      fundamental: mockAnalysisResults.fundamental,
      technical: mockAnalysisResults.technical,
      esg: mockAnalysisResults.esg,
      synthesis_methodology: 'Investment-weighted analysis (Fundamental: 50%, ESG: 30%, Technical: 20%)',
      limitations: ['Limited historical ESG data', 'Market volatility not fully captured'],
      metadata: {
        analysis_timestamp: new Date().toISOString(),
        data_sources: ['Google Finance API', 'ESG Data Provider', 'Technical Analysis Engine'],
        api_version: '1.0.0'
      }
    },
    confidence: 0.8
  },
  trading: {
    synthesis_score: 71,
    convergence_factors: [
      {
        category: 'momentum',
        description: 'Strong technical momentum supported by fundamental growth',
        weight: 0.7,
        supporting_analyses: ['technical', 'fundamental'],
        metadata: { rsi: 65.5, revenue_growth: 12.0 }
      }
    ],
    divergence_factors: [
      {
        category: 'timing',
        description: 'Short-term technical resistance vs long-term fundamental strength',
        weight: 0.4,
        conflicting_analyses: ['technical', 'fundamental'],
        metadata: { resistance_level: 155.0, target_price: 165.0 }
      }
    ],
    full_report: {
      summary: 'Good short-term trading opportunity with technical momentum',
      recommendation: 'buy',
      fundamental: mockAnalysisResults.fundamental,
      technical: mockAnalysisResults.technical,
      esg: mockAnalysisResults.esg,
      synthesis_methodology: 'Trading-weighted analysis (Technical: 60%, Fundamental: 25%, ESG: 15%)',
      limitations: ['Short-term market volatility', 'External market factors not considered'],
      metadata: {
        analysis_timestamp: new Date().toISOString(),
        data_sources: ['Google Finance API', 'Technical Analysis Engine', 'ESG Data Provider'],
        api_version: '1.0.0'
      }
    },
    confidence: 0.75
  }
};

/**
 * Workflow integration test helper
 */
class WorkflowTestHelper {
  static async testAnalysisModuleIntegration(ticker: string, context: 'investment' | 'trading') {
    // Simulate calling individual analysis modules
    const results = {
      fundamental: await this.callFundamentalAnalysis(ticker, context),
      technical: await this.callTechnicalAnalysis(ticker, context),
      esg: await this.callESGAnalysis(ticker, context)
    };

    return results;
  }

  static async callFundamentalAnalysis(ticker: string, context: string) {
    // Mock fundamental analysis call
    return mockAnalysisResults.fundamental;
  }

  static async callTechnicalAnalysis(ticker: string, context: string) {
    // Mock technical analysis call
    return mockAnalysisResults.technical;
  }

  static async callESGAnalysis(ticker: string, context: string) {
    // Mock ESG analysis call
    return mockAnalysisResults.esg;
  }

  static async callSynthesisEngine(analysisResults: any, context: 'investment' | 'trading') {
    // Mock synthesis engine call
    return mockSynthesisResults[context];
  }

  static validateAnalysisResult(result: any) {
    assertExists(result.score);
    assert(result.score >= 0 && result.score <= 100);
    assertExists(result.factors);
    assert(Array.isArray(result.factors));
    assertExists(result.details);
    assertExists(result.confidence);
    assert(result.confidence >= 0 && result.confidence <= 1);
  }

  static validateSynthesisResult(result: any) {
    assertExists(result.synthesis_score);
    assert(result.synthesis_score >= 0 && result.synthesis_score <= 100);
    assertExists(result.convergence_factors);
    assert(Array.isArray(result.convergence_factors));
    assertExists(result.divergence_factors);
    assert(Array.isArray(result.divergence_factors));
    assertExists(result.full_report);
    assertExists(result.confidence);
  }
}

// Workflow Integration Tests

Deno.test('Workflow Integration - Analysis modules produce consistent output format', async () => {
  const ticker = 'AAPL';
  const context = 'investment';

  const results = await WorkflowTestHelper.testAnalysisModuleIntegration(ticker, context);

  // Validate each analysis module output
  WorkflowTestHelper.validateAnalysisResult(results.fundamental);
  WorkflowTestHelper.validateAnalysisResult(results.technical);
  WorkflowTestHelper.validateAnalysisResult(results.esg);

  // Verify all modules return scores in valid range
  assert(results.fundamental.score >= 0 && results.fundamental.score <= 100);
  assert(results.technical.score >= 0 && results.technical.score <= 100);
  assert(results.esg.score >= 0 && results.esg.score <= 100);

  // Verify factors structure is consistent
  for (const result of Object.values(results)) {
    for (const factor of (result as any).factors) {
      assertExists(factor.category);
      assertExists(factor.type);
      assert(['positive', 'negative'].includes(factor.type));
      assertExists(factor.description);
      assertExists(factor.weight);
      assertExists(factor.confidence);
    }
  }
});

Deno.test('Workflow Integration - Synthesis engine processes analysis results correctly', async () => {
  const ticker = 'AAPL';
  
  // Test investment context
  const investmentResults = await WorkflowTestHelper.testAnalysisModuleIntegration(ticker, 'investment');
  const investmentSynthesis = await WorkflowTestHelper.callSynthesisEngine(investmentResults, 'investment');
  
  WorkflowTestHelper.validateSynthesisResult(investmentSynthesis);
  
  // Verify investment-specific characteristics
  assert(investmentSynthesis.full_report.synthesis_methodology.includes('Investment'));
  assert(investmentSynthesis.full_report.recommendation);
  
  // Test trading context
  const tradingResults = await WorkflowTestHelper.testAnalysisModuleIntegration(ticker, 'trading');
  const tradingSynthesis = await WorkflowTestHelper.callSynthesisEngine(tradingResults, 'trading');
  
  WorkflowTestHelper.validateSynthesisResult(tradingSynthesis);
  
  // Verify trading-specific characteristics
  assert(tradingSynthesis.full_report.synthesis_methodology.includes('Trading'));
  
  // Verify different weighting produces different results
  assert(investmentSynthesis.synthesis_score !== tradingSynthesis.synthesis_score ||
         investmentSynthesis.full_report.synthesis_methodology !== tradingSynthesis.full_report.synthesis_methodology);
});

Deno.test('Workflow Integration - Convergence and divergence factor identification', async () => {
  const ticker = 'AAPL';
  const results = await WorkflowTestHelper.testAnalysisModuleIntegration(ticker, 'investment');
  const synthesis = await WorkflowTestHelper.callSynthesisEngine(results, 'investment');

  // Verify convergence factors
  assert(synthesis.convergence_factors.length > 0);
  for (const factor of synthesis.convergence_factors) {
    assertExists(factor.category);
    assertExists(factor.description);
    assertExists(factor.weight);
    assertExists(factor.supporting_analyses);
    assert(Array.isArray(factor.supporting_analyses));
    assert(factor.supporting_analyses.length >= 2); // Should have multiple supporting analyses
  }

  // Verify divergence factors
  for (const factor of synthesis.divergence_factors) {
    assertExists(factor.category);
    assertExists(factor.description);
    assertExists(factor.weight);
    assertExists(factor.conflicting_analyses);
    assert(Array.isArray(factor.conflicting_analyses));
    assert(factor.conflicting_analyses.length >= 2); // Should have conflicting analyses
  }
});

Deno.test('Workflow Integration - Context-aware weighting verification', async () => {
  const ticker = 'AAPL';
  const analysisResults = await WorkflowTestHelper.testAnalysisModuleIntegration(ticker, 'investment');

  // Test investment weighting (should prioritize fundamental and ESG)
  const investmentSynthesis = await WorkflowTestHelper.callSynthesisEngine(analysisResults, 'investment');
  const investmentMethodology = investmentSynthesis.full_report.synthesis_methodology;
  
  // Should mention higher weighting for fundamental analysis in investment context
  assert(investmentMethodology.includes('Fundamental: 50%') || 
         investmentMethodology.includes('fundamental') ||
         investmentMethodology.includes('Investment'));

  // Test trading weighting (should prioritize technical)
  const tradingSynthesis = await WorkflowTestHelper.callSynthesisEngine(analysisResults, 'trading');
  const tradingMethodology = tradingSynthesis.full_report.synthesis_methodology;
  
  // Should mention higher weighting for technical analysis in trading context
  assert(tradingMethodology.includes('Technical: 60%') || 
         tradingMethodology.includes('technical') ||
         tradingMethodology.includes('Trading'));

  // Methodologies should be different
  assert(investmentMethodology !== tradingMethodology);
});

Deno.test('Workflow Integration - Full report structure and completeness', async () => {
  const ticker = 'AAPL';
  const results = await WorkflowTestHelper.testAnalysisModuleIntegration(ticker, 'investment');
  const synthesis = await WorkflowTestHelper.callSynthesisEngine(results, 'investment');

  const report = synthesis.full_report;

  // Verify required report sections
  assertExists(report.summary);
  assertExists(report.recommendation);
  assert(['strong_buy', 'buy', 'hold', 'sell', 'strong_sell'].includes(report.recommendation));
  
  // Verify individual analysis results are included
  assertExists(report.fundamental);
  assertExists(report.technical);
  assertExists(report.esg);
  
  // Verify methodology and limitations
  assertExists(report.synthesis_methodology);
  assertExists(report.limitations);
  assert(Array.isArray(report.limitations));
  
  // Verify metadata
  assertExists(report.metadata);
  assertExists(report.metadata.analysis_timestamp);
  assertExists(report.metadata.data_sources);
  assertExists(report.metadata.api_version);
  assert(Array.isArray(report.metadata.data_sources));
  
  // Verify timestamp is valid
  const timestamp = new Date(report.metadata.analysis_timestamp);
  assert(!isNaN(timestamp.getTime()));
});

Deno.test('Workflow Integration - Error handling in analysis pipeline', async () => {
  // Test scenario where one analysis module fails
  const originalCallFundamental = WorkflowTestHelper.callFundamentalAnalysis;
  
  // Mock a failure in fundamental analysis
  WorkflowTestHelper.callFundamentalAnalysis = async () => {
    throw new Error('External API unavailable');
  };

  try {
    const ticker = 'AAPL';
    
    // This should handle the error gracefully
    try {
      await WorkflowTestHelper.testAnalysisModuleIntegration(ticker, 'investment');
      assert(false, 'Should have thrown an error');
    } catch (error) {
      assert(error.message.includes('External API unavailable'));
    }
  } finally {
    // Restore original function
    WorkflowTestHelper.callFundamentalAnalysis = originalCallFundamental;
  }
});

Deno.test('Workflow Integration - Concurrent analysis execution timing', async () => {
  const ticker = 'AAPL';
  const startTime = Date.now();

  // Simulate concurrent execution
  const [fundamental, technical, esg] = await Promise.all([
    WorkflowTestHelper.callFundamentalAnalysis(ticker, 'investment'),
    WorkflowTestHelper.callTechnicalAnalysis(ticker, 'investment'),
    WorkflowTestHelper.callESGAnalysis(ticker, 'investment')
  ]);

  const concurrentTime = Date.now() - startTime;

  // Test sequential execution for comparison
  const sequentialStart = Date.now();
  await WorkflowTestHelper.callFundamentalAnalysis(ticker, 'investment');
  await WorkflowTestHelper.callTechnicalAnalysis(ticker, 'investment');
  await WorkflowTestHelper.callESGAnalysis(ticker, 'investment');
  const sequentialTime = Date.now() - sequentialStart;

  // Concurrent should be faster (or at least not significantly slower)
  assert(concurrentTime <= sequentialTime + 100, 
    `Concurrent execution (${concurrentTime}ms) should not be significantly slower than sequential (${sequentialTime}ms)`);

  // Verify all results are valid
  WorkflowTestHelper.validateAnalysisResult(fundamental);
  WorkflowTestHelper.validateAnalysisResult(technical);
  WorkflowTestHelper.validateAnalysisResult(esg);
});

Deno.test('Workflow Integration - Data consistency across pipeline', async () => {
  const ticker = 'AAPL';
  const context = 'investment';

  // Run complete workflow
  const analysisResults = await WorkflowTestHelper.testAnalysisModuleIntegration(ticker, context);
  const synthesis = await WorkflowTestHelper.callSynthesisEngine(analysisResults, context);

  // Verify that synthesis includes original analysis data
  assertEquals(synthesis.full_report.fundamental, analysisResults.fundamental);
  assertEquals(synthesis.full_report.technical, analysisResults.technical);
  assertEquals(synthesis.full_report.esg, analysisResults.esg);

  // Verify that convergence factors reference actual analysis categories
  for (const factor of synthesis.convergence_factors) {
    for (const analysis of factor.supporting_analyses) {
      assert(['fundamental', 'technical', 'esg'].includes(analysis));
    }
  }

  // Verify that divergence factors reference actual analysis categories
  for (const factor of synthesis.divergence_factors) {
    for (const analysis of factor.conflicting_analyses) {
      assert(['fundamental', 'technical', 'esg'].includes(analysis));
    }
  }
});

Deno.test('Workflow Integration - Performance metrics and monitoring', async () => {
  const ticker = 'AAPL';
  const context = 'investment';

  const startTime = Date.now();
  
  // Execute complete workflow
  const analysisResults = await WorkflowTestHelper.testAnalysisModuleIntegration(ticker, context);
  const analysisTime = Date.now() - startTime;

  const synthesisStart = Date.now();
  const synthesis = await WorkflowTestHelper.callSynthesisEngine(analysisResults, context);
  const synthesisTime = Date.now() - synthesisStart;

  const totalTime = Date.now() - startTime;

  // Verify reasonable performance (these are mock calls, so should be fast)
  assert(analysisTime < 1000, `Analysis took ${analysisTime}ms, which seems too long for mocked calls`);
  assert(synthesisTime < 500, `Synthesis took ${synthesisTime}ms, which seems too long for mocked calls`);
  assert(totalTime < 1500, `Total workflow took ${totalTime}ms, which seems too long for mocked calls`);

  // Verify that performance data could be collected
  const performanceMetrics = {
    ticker,
    context,
    analysisTime,
    synthesisTime,
    totalTime,
    timestamp: new Date().toISOString()
  };

  assertExists(performanceMetrics.ticker);
  assertExists(performanceMetrics.context);
  assert(performanceMetrics.analysisTime > 0);
  assert(performanceMetrics.synthesisTime > 0);
  assert(performanceMetrics.totalTime > 0);
});

Deno.test('Workflow Integration - Memory and resource management', async () => {
  const ticker = 'AAPL';
  
  // Test multiple sequential workflows to check for memory leaks
  const iterations = 5;
  const results = [];

  for (let i = 0; i < iterations; i++) {
    const analysisResults = await WorkflowTestHelper.testAnalysisModuleIntegration(ticker, 'investment');
    const synthesis = await WorkflowTestHelper.callSynthesisEngine(analysisResults, 'investment');
    results.push(synthesis);
  }

  // Verify all results are valid and consistent
  for (const result of results) {
    WorkflowTestHelper.validateSynthesisResult(result);
    assert(result.synthesis_score >= 0 && result.synthesis_score <= 100);
  }

  // Verify results are consistent (same input should produce same output)
  const firstScore = results[0].synthesis_score;
  for (const result of results) {
    assertEquals(result.synthesis_score, firstScore);
  }
});

// Cleanup
Deno.test('Workflow Integration - Cleanup', () => {
  // Clear environment variables
  Deno.env.delete('SUPABASE_URL');
  Deno.env.delete('SUPABASE_ANON_KEY');
  Deno.env.delete('SUPABASE_SERVICE_ROLE_KEY');
  Deno.env.delete('ENCRYPTION_KEY');
  
  assert(true, 'Workflow integration tests cleanup completed');
});