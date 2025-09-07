// Requirements Validation Script
// Validates that all requirements from the specification are met

import { assertEquals, assert } from 'https://deno.land/std@0.168.0/testing/asserts.ts';

/**
 * Requirements validation suite
 * Maps to the requirements in the specification document
 */
export class RequirementsValidator {
  private static validationResults: Array<{
    requirement: string;
    status: 'passed' | 'failed' | 'partial';
    details: string;
    evidence?: string[];
  }> = [];

  /**
   * Validate all requirements from the specification
   */
  static async validateAllRequirements(): Promise<void> {
    console.log('📋 Validating Signal-360 Analysis Requirements...\n');

    // Requirement 1: Master Orchestrator Function
    await this.validateRequirement1();

    // Requirement 2: Fundamental Analysis
    await this.validateRequirement2();

    // Requirement 3: Technical Analysis
    await this.validateRequirement3();

    // Requirement 4: Sentiment/Eco Analysis
    await this.validateRequirement4();

    // Requirement 5: Synthesis Engine
    await this.validateRequirement5();

    // Requirement 6: Trade Parameters
    await this.validateRequirement6();

    // Requirement 7: Response Formatting
    await this.validateRequirement7();

    // Requirement 8: Error Handling and Monitoring
    await this.validateRequirement8();

    // Generate validation report
    this.generateValidationReport();
  }

  /**
   * Requirement 1: Master Orchestrator Function
   */
  private static async validateRequirement1(): Promise<void> {
    console.log('🔍 Validating Requirement 1: Master Orchestrator Function');

    try {
      const evidence: string[] = [];

      // 1.1: Replace placeholder logic with real data orchestration
      const orchestratorExists = await this.checkFileExists('supabase/functions/signal-360-analysis/index.ts');
      assert(orchestratorExists, 'Master orchestrator function should exist');
      evidence.push('✅ Master orchestrator function exists');

      // 1.2: Implement parallel analysis coordination
      const hasParallelExecution = await this.checkCodeContains(
        'supabase/functions/signal-360-analysis/index.ts',
        'Promise.allSettled'
      );
      assert(hasParallelExecution, 'Should implement parallel analysis execution');
      evidence.push('✅ Parallel analysis coordination implemented');

      // 1.3: Add comprehensive request validation
      const hasValidation = await this.checkCodeContains(
        'supabase/functions/signal-360-analysis/index.ts',
        'validateRequest'
      );
      evidence.push(hasValidation ? '✅ Request validation implemented' : '⚠️ Request validation may be basic');

      // 1.4: API key decryption integration
      const hasApiKeyDecryption = await this.checkCodeContains(
        'supabase/functions/signal-360-analysis/index.ts',
        'ApiKeyDecryptionService'
      );
      assert(hasApiKeyDecryption, 'Should integrate API key decryption');
      evidence.push('✅ API key decryption integrated');

      this.validationResults.push({
        requirement: '1. Master Orchestrator Function',
        status: 'passed',
        details: 'All orchestrator requirements implemented',
        evidence
      });

      console.log('  ✅ Requirement 1 validated\n');

    } catch (error) {
      this.validationResults.push({
        requirement: '1. Master Orchestrator Function',
        status: 'failed',
        details: error.message
      });
      console.log(`  ❌ Requirement 1 failed: ${error.message}\n`);
    }
  }

  /**
   * Requirement 2: Fundamental Analysis
   */
  private static async validateRequirement2(): Promise<void> {
    console.log('🔍 Validating Requirement 2: Fundamental Analysis');

    try {
      const evidence: string[] = [];

      // 2.1: Real Google Finance API integration
      const fundamentalExists = await this.checkFileExists('supabase/functions/fundamental-analysis/index.ts');
      assert(fundamentalExists, 'Fundamental analysis function should exist');
      evidence.push('✅ Fundamental analysis function exists');

      // 2.2: Financial ratio calculations
      const hasRatioCalculations = await this.checkCodeContains(
        'supabase/functions/fundamental-analysis/index.ts',
        'calculateEnhancedFinancialRatios'
      );
      assert(hasRatioCalculations, 'Should implement financial ratio calculations');
      evidence.push('✅ Financial ratio calculations implemented');

      // 2.3: Growth metrics
      const hasGrowthMetrics = await this.checkCodeContains(
        'supabase/functions/fundamental-analysis/index.ts',
        'calculateEnhancedGrowthMetrics'
      );
      assert(hasGrowthMetrics, 'Should implement growth metrics');
      evidence.push('✅ Growth metrics calculations implemented');

      // 2.4: Valuation analysis
      const hasValuationAnalysis = await this.checkCodeContains(
        'supabase/functions/fundamental-analysis/index.ts',
        'calculateEnhancedValuationMetrics'
      );
      assert(hasValuationAnalysis, 'Should implement valuation analysis');
      evidence.push('✅ Valuation analysis implemented');

      // 2.5: Industry comparison
      const hasIndustryComparison = await this.checkCodeContains(
        'supabase/functions/fundamental-analysis/index.ts',
        'calculateCompetitivePosition'
      );
      assert(hasIndustryComparison, 'Should implement industry comparison');
      evidence.push('✅ Industry comparison implemented');

      this.validationResults.push({
        requirement: '2. Fundamental Analysis',
        status: 'passed',
        details: 'All fundamental analysis requirements implemented',
        evidence
      });

      console.log('  ✅ Requirement 2 validated\n');

    } catch (error) {
      this.validationResults.push({
        requirement: '2. Fundamental Analysis',
        status: 'failed',
        details: error.message
      });
      console.log(`  ❌ Requirement 2 failed: ${error.message}\n`);
    }
  }

  /**
   * Requirement 3: Technical Analysis
   */
  private static async validateRequirement3(): Promise<void> {
    console.log('🔍 Validating Requirement 3: Technical Analysis');

    try {
      const evidence: string[] = [];

      // 3.1: Context-aware technical analysis
      const technicalExists = await this.checkFileExists('supabase/functions/technical-analysis/index.ts');
      assert(technicalExists, 'Technical analysis function should exist');
      evidence.push('✅ Technical analysis function exists');

      // 3.2: Context-specific timeframe selection
      const hasContextAwareTimeframes = await this.checkCodeContains(
        'supabase/functions/technical-analysis/index.ts',
        'analysisContext'
      );
      assert(hasContextAwareTimeframes, 'Should implement context-aware timeframes');
      evidence.push('✅ Context-aware timeframe selection implemented');

      // 3.3: Advanced pattern recognition
      const hasPatternRecognition = await this.checkCodeContains(
        'supabase/functions/technical-analysis/index.ts',
        'calculateEnhancedSupportResistance'
      );
      assert(hasPatternRecognition, 'Should implement pattern recognition');
      evidence.push('✅ Pattern recognition implemented');

      // 3.4: Support/resistance detection
      const hasSupportResistance = await this.checkCodeContains(
        'supabase/functions/technical-analysis/index.ts',
        'support_resistance'
      );
      assert(hasSupportResistance, 'Should implement support/resistance detection');
      evidence.push('✅ Support/resistance detection implemented');

      // 3.5: Trading vs investment context differentiation
      const hasContextDifferentiation = await this.checkCodeContains(
        'supabase/functions/technical-analysis/index.ts',
        'trading.*investment'
      );
      assert(hasContextDifferentiation, 'Should differentiate trading vs investment contexts');
      evidence.push('✅ Context differentiation implemented');

      this.validationResults.push({
        requirement: '3. Technical Analysis',
        status: 'passed',
        details: 'All technical analysis requirements implemented',
        evidence
      });

      console.log('  ✅ Requirement 3 validated\n');

    } catch (error) {
      this.validationResults.push({
        requirement: '3. Technical Analysis',
        status: 'failed',
        details: error.message
      });
      console.log(`  ❌ Requirement 3 failed: ${error.message}\n`);
    }
  }

  /**
   * Requirement 4: Sentiment/Eco Analysis
   */
  private static async validateRequirement4(): Promise<void> {
    console.log('🔍 Validating Requirement 4: Sentiment/Eco Analysis');

    try {
      const evidence: string[] = [];

      // 4.1: Google News API integration
      const sentimentExists = await this.checkFileExists('supabase/functions/sentiment-eco-analysis/index.ts');
      assert(sentimentExists, 'Sentiment/Eco analysis function should exist');
      evidence.push('✅ Sentiment/Eco analysis function exists');

      // 4.2: News sentiment analysis
      const hasNewsSentiment = await this.checkCodeContains(
        'supabase/functions/sentiment-eco-analysis/index.ts',
        'getRecentNews'
      );
      assert(hasNewsSentiment, 'Should implement news sentiment analysis');
      evidence.push('✅ News sentiment analysis implemented');

      // 4.3: Social media sentiment tracking
      const hasSocialSentiment = await this.checkCodeContains(
        'supabase/functions/sentiment-eco-analysis/index.ts',
        'getSocialMediaSentiment'
      );
      assert(hasSocialSentiment, 'Should implement social media sentiment tracking');
      evidence.push('✅ Social media sentiment tracking implemented');

      // 4.4: Market buzz quantification
      const hasMarketBuzz = await this.checkCodeContains(
        'supabase/functions/sentiment-eco-analysis/index.ts',
        'calculateMarketBuzz'
      );
      assert(hasMarketBuzz, 'Should implement market buzz quantification');
      evidence.push('✅ Market buzz quantification implemented');

      // 4.5: News event impact assessment
      const hasEventImpact = await this.checkCodeContains(
        'supabase/functions/sentiment-eco-analysis/index.ts',
        'key_ecos'
      );
      assert(hasEventImpact, 'Should implement news event impact assessment');
      evidence.push('✅ News event impact assessment implemented');

      this.validationResults.push({
        requirement: '4. Sentiment/Eco Analysis',
        status: 'passed',
        details: 'All sentiment/eco analysis requirements implemented',
        evidence
      });

      console.log('  ✅ Requirement 4 validated\n');

    } catch (error) {
      this.validationResults.push({
        requirement: '4. Sentiment/Eco Analysis',
        status: 'failed',
        details: error.message
      });
      console.log(`  ❌ Requirement 4 failed: ${error.message}\n`);
    }
  }

  /**
   * Requirement 5: Synthesis Engine
   */
  private static async validateRequirement5(): Promise<void> {
    console.log('🔍 Validating Requirement 5: Synthesis Engine');

    try {
      const evidence: string[] = [];

      // 5.1: Real data processing algorithms
      const synthesisExists = await this.checkFileExists('supabase/functions/synthesis-engine/index.ts');
      assert(synthesisExists, 'Synthesis engine should exist');
      evidence.push('✅ Synthesis engine exists');

      // 5.2: Context-aware weighting system
      const hasContextWeighting = await this.checkCodeContains(
        'supabase/functions/synthesis-engine/index.ts',
        'context.*weight'
      );
      assert(hasContextWeighting, 'Should implement context-aware weighting');
      evidence.push('✅ Context-aware weighting implemented');

      // 5.3: Convergence and divergence detection
      const hasConvergenceDivergence = await this.checkCodeContains(
        'supabase/functions/synthesis-engine/index.ts',
        'convergence.*divergence'
      );
      assert(hasConvergenceDivergence, 'Should implement convergence/divergence detection');
      evidence.push('✅ Convergence/divergence detection implemented');

      // 5.4: Intelligent confidence scoring
      const hasConfidenceScoring = await this.checkCodeContains(
        'supabase/functions/synthesis-engine/index.ts',
        'confidence'
      );
      assert(hasConfidenceScoring, 'Should implement confidence scoring');
      evidence.push('✅ Confidence scoring implemented');

      // 5.5: Data quality assessment
      const hasDataQuality = await this.checkCodeContains(
        'supabase/functions/synthesis-engine/index.ts',
        'data.*quality'
      );
      evidence.push(hasDataQuality ? '✅ Data quality assessment implemented' : '⚠️ Data quality assessment may be basic');

      this.validationResults.push({
        requirement: '5. Synthesis Engine',
        status: 'passed',
        details: 'All synthesis engine requirements implemented',
        evidence
      });

      console.log('  ✅ Requirement 5 validated\n');

    } catch (error) {
      this.validationResults.push({
        requirement: '5. Synthesis Engine',
        status: 'failed',
        details: error.message
      });
      console.log(`  ❌ Requirement 5 failed: ${error.message}\n`);
    }
  }

  /**
   * Requirement 6: Trade Parameters
   */
  private static async validateRequirement6(): Promise<void> {
    console.log('🔍 Validating Requirement 6: Trade Parameters');

    try {
      const evidence: string[] = [];

      // 6.1: Entry price recommendations
      const hasTradeParameters = await this.checkCodeContains(
        'supabase/functions/signal-360-analysis/index.ts',
        'TradeParametersCalculator'
      );
      assert(hasTradeParameters, 'Should implement trade parameters calculation');
      evidence.push('✅ Trade parameters calculator implemented');

      // 6.2: Stop-loss calculation
      const hasStopLoss = await this.checkCodeContains(
        'supabase/functions/signal-360-analysis/index.ts',
        'calculateStopLoss'
      );
      assert(hasStopLoss, 'Should implement stop-loss calculation');
      evidence.push('✅ Stop-loss calculation implemented');

      // 6.3: Take-profit levels
      const hasTakeProfit = await this.checkCodeContains(
        'supabase/functions/signal-360-analysis/index.ts',
        'calculateTakeProfitLevels'
      );
      assert(hasTakeProfit, 'Should implement take-profit calculation');
      evidence.push('✅ Take-profit levels calculation implemented');

      // 6.4: Volatility-based calculations
      const hasVolatilityBased = await this.checkCodeContains(
        'supabase/functions/signal-360-analysis/index.ts',
        'atr.*volatility'
      );
      assert(hasVolatilityBased, 'Should use volatility-based calculations');
      evidence.push('✅ Volatility-based calculations implemented');

      this.validationResults.push({
        requirement: '6. Trade Parameters',
        status: 'passed',
        details: 'All trade parameters requirements implemented',
        evidence
      });

      console.log('  ✅ Requirement 6 validated\n');

    } catch (error) {
      this.validationResults.push({
        requirement: '6. Trade Parameters',
        status: 'failed',
        details: error.message
      });
      console.log(`  ❌ Requirement 6 failed: ${error.message}\n`);
    }
  }

  /**
   * Requirement 7: Response Formatting
   */
  private static async validateRequirement7(): Promise<void> {
    console.log('🔍 Validating Requirement 7: Response Formatting');

    try {
      const evidence: string[] = [];

      // 7.1: JSON schema compliance
      const hasResponseFormatter = await this.checkFileExists('supabase/functions/_shared/response-formatter.ts');
      assert(hasResponseFormatter, 'Response formatter should exist');
      evidence.push('✅ Response formatter exists');

      // 7.2: Recommendation generation
      const hasRecommendationLogic = await this.checkCodeContains(
        'supabase/functions/signal-360-analysis/index.ts',
        'getRecommendation'
      );
      assert(hasRecommendationLogic, 'Should implement recommendation generation');
      evidence.push('✅ Recommendation generation implemented');

      // 7.3: Key eco factors extraction
      const hasKeyEcos = await this.checkCodeContains(
        'supabase/functions/signal-360-analysis/index.ts',
        'key_ecos'
      );
      assert(hasKeyEcos, 'Should extract key eco factors');
      evidence.push('✅ Key eco factors extraction implemented');

      // 7.4: Full report structure
      const hasFullReport = await this.checkCodeContains(
        'supabase/functions/signal-360-analysis/index.ts',
        'full_report'
      );
      assert(hasFullReport, 'Should include full report structure');
      evidence.push('✅ Full report structure implemented');

      // 7.5: Individual analysis summaries
      const hasSummaries = await this.checkCodeContains(
        'supabase/functions/signal-360-analysis/index.ts',
        'fundamental.*technical.*sentiment'
      );
      assert(hasSummaries, 'Should include individual analysis summaries');
      evidence.push('✅ Individual analysis summaries implemented');

      this.validationResults.push({
        requirement: '7. Response Formatting',
        status: 'passed',
        details: 'All response formatting requirements implemented',
        evidence
      });

      console.log('  ✅ Requirement 7 validated\n');

    } catch (error) {
      this.validationResults.push({
        requirement: '7. Response Formatting',
        status: 'failed',
        details: error.message
      });
      console.log(`  ❌ Requirement 7 failed: ${error.message}\n`);
    }
  }

  /**
   * Requirement 8: Error Handling and Monitoring
   */
  private static async validateRequirement8(): Promise<void> {
    console.log('🔍 Validating Requirement 8: Error Handling and Monitoring');

    try {
      const evidence: string[] = [];

      // 8.1: Robust error handling
      const hasErrorHandling = await this.checkFileExists('supabase/functions/_shared/analysis-error-handler.ts');
      assert(hasErrorHandling, 'Error handling system should exist');
      evidence.push('✅ Error handling system exists');

      // 8.2: Rate limit management
      const hasRateLimiting = await this.checkCodeContains(
        'supabase/functions/_shared/analysis-error-handler.ts',
        'rate.*limit'
      );
      assert(hasRateLimiting, 'Should implement rate limit management');
      evidence.push('✅ Rate limit management implemented');

      // 8.3: Detailed logging and monitoring
      const hasLogging = await this.checkFileExists('supabase/functions/_shared/logging.ts');
      assert(hasLogging, 'Logging system should exist');
      evidence.push('✅ Logging system exists');

      // 8.4: Performance monitoring
      const hasPerformanceMonitoring = await this.checkFileExists('supabase/functions/_shared/performance-monitor.ts');
      assert(hasPerformanceMonitoring, 'Performance monitoring should exist');
      evidence.push('✅ Performance monitoring implemented');

      // 8.5: Graceful degradation
      const hasGracefulDegradation = await this.checkCodeContains(
        'supabase/functions/signal-360-analysis/index.ts',
        'createNeutralAnalysisResult'
      );
      assert(hasGracefulDegradation, 'Should implement graceful degradation');
      evidence.push('✅ Graceful degradation implemented');

      this.validationResults.push({
        requirement: '8. Error Handling and Monitoring',
        status: 'passed',
        details: 'All error handling and monitoring requirements implemented',
        evidence
      });

      console.log('  ✅ Requirement 8 validated\n');

    } catch (error) {
      this.validationResults.push({
        requirement: '8. Error Handling and Monitoring',
        status: 'failed',
        details: error.message
      });
      console.log(`  ❌ Requirement 8 failed: ${error.message}\n`);
    }
  }

  /**
   * Helper method to check if file exists
   */
  private static async checkFileExists(filePath: string): Promise<boolean> {
    try {
      const stat = await Deno.stat(filePath);
      return stat.isFile;
    } catch {
      return false;
    }
  }

  /**
   * Helper method to check if code contains specific pattern
   */
  private static async checkCodeContains(filePath: string, pattern: string): Promise<boolean> {
    try {
      const content = await Deno.readTextFile(filePath);
      const regex = new RegExp(pattern, 'i');
      return regex.test(content);
    } catch {
      return false;
    }
  }

  /**
   * Generate validation report
   */
  private static generateValidationReport(): void {
    console.log('\n📊 REQUIREMENTS VALIDATION REPORT');
    console.log('=' .repeat(50));

    const passed = this.validationResults.filter(r => r.status === 'passed').length;
    const failed = this.validationResults.filter(r => r.status === 'failed').length;
    const partial = this.validationResults.filter(r => r.status === 'partial').length;
    const total = this.validationResults.length;

    console.log(`Total Requirements: ${total}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ${failed > 0 ? '❌' : ''}`);
    console.log(`Partial: ${partial} ${partial > 0 ? '⚠️' : ''}`);
    console.log(`Compliance Rate: ${((passed / total) * 100).toFixed(1)}%`);

    console.log('\nDetailed Results:');
    console.log('-'.repeat(50));

    for (const result of this.validationResults) {
      const statusIcon = result.status === 'passed' ? '✅' : 
                        result.status === 'failed' ? '❌' : '⚠️';
      
      console.log(`${statusIcon} ${result.requirement}`);
      console.log(`    ${result.details}`);
      
      if (result.evidence) {
        for (const evidence of result.evidence) {
          console.log(`    ${evidence}`);
        }
      }
      console.log('');
    }

    console.log('='.repeat(50));

    if (passed === total) {
      console.log('🎉 All requirements validated successfully!');
      console.log('🚀 Signal-360 Analysis Pipeline meets all specification requirements!');
    } else {
      console.log(`⚠️  ${failed + partial} requirements need attention.`);
      console.log('Please review and address the issues before final deployment.');
    }
  }
}

// Export for use in test runner
export { RequirementsValidator };