# Design Document

## Overview

This design outlines the consolidation of redundant backend logic in the Signal-360 analysis system. The current architecture has duplicate functionality across multiple Edge Functions and shared utilities, creating maintenance overhead and potential inconsistencies. This refactoring will establish a single source of truth by consolidating trade parameters calculation logic into the SynthesisEngine class and response formatting logic directly into the main orchestrator function.

## Architecture

### Current Architecture Issues

1. **Trade Parameters Logic Duplication**: The `TradeParametersCalculator` class exists both as a standalone Edge Function (`supabase/functions/trade-parameters/index.ts`) and as a separate class in the main orchestrator (`supabase/functions/signal-360-analysis/index.ts`).

2. **Response Formatting Duplication**: Response formatting logic exists in three places:
   - Standalone Edge Function: `supabase/functions/response-formatter/index.ts`
   - Shared utility: `supabase/functions/_shared/response-formatter.ts`
   - Inline logic in the main orchestrator

3. **Maintenance Overhead**: Changes to calculation or formatting logic require updates in multiple locations, increasing the risk of inconsistencies.

### Target Architecture

The refactored architecture will consolidate logic into two primary locations:

1. **SynthesisEngine Class**: Will contain all trade parameters calculation logic
2. **Main Orchestrator**: Will contain all response formatting logic inline

## Components and Interfaces

### 1. Enhanced SynthesisEngine Class

The `SynthesisEngine` class in `supabase/functions/synthesis-engine/index.ts` will be enhanced to include trade parameters calculation methods.

#### New Methods to Add:

```typescript
class SynthesisEngine {
  // Existing methods...

  /**
   * Calculate comprehensive trade parameters based on technical analysis
   */
  calculateTradeParameters(input: TradeParametersInput): TradeParametersOutput

  /**
   * Calculate optimal entry price based on analysis and context
   */
  private calculateEntryPrice(
    currentPrice: number,
    synthesisScore: number,
    supportResistance: { support: number[]; resistance: number[] },
    volatility: number,
    analysisContext: 'investment' | 'trading'
  ): number

  /**
   * Calculate stop loss based on volatility and support/resistance
   */
  private calculateStopLoss(
    entryPrice: number,
    currentPrice: number,
    supportResistance: { support: number[]; resistance: number[] },
    volatility: number,
    analysisContext: 'investment' | 'trading',
    synthesisScore: number
  ): number

  /**
   * Calculate multiple take profit levels
   */
  private calculateTakeProfitLevels(
    entryPrice: number,
    currentPrice: number,
    supportResistance: { support: number[]; resistance: number[] },
    volatility: number,
    analysisContext: 'investment' | 'trading',
    synthesisScore: number
  ): number[]

  // Additional helper methods for trade parameters calculation...
}
```

#### Enhanced SynthesisOutput Interface:

```typescript
interface SynthesisOutput {
  synthesis_score: number;
  convergence_factors: ConvergenceFactor[];
  divergence_factors: DivergenceFactor[];
  trade_parameters: {
    entry_price: number;
    stop_loss: number;
    take_profit_levels: number[];
    risk_reward_ratio: number;
    position_size_recommendation: number;
    confidence: number;
    methodology: string;
    metadata: {
      calculation_timestamp: string;
      volatility_used: number;
      support_resistance_levels: {
        support: number[];
        resistance: number[];
      };
      risk_metrics: {
        max_drawdown_risk: number;
        expected_return: number;
        sharpe_estimate: number;
      };
    };
  };
  full_report: AnalysisReport;
  confidence: number;
}
```

### 2. Enhanced Main Orchestrator

The `signal-360-analysis/index.ts` orchestrator will be enhanced with inline response formatting logic.

#### New Inline Methods:

```typescript
/**
 * Format the complete analysis response according to the specified schema
 */
function formatAnalysisResponse(params: {
  ticker_symbol: string;
  analysis_context: 'investment' | 'trading';
  trading_timeframe?: string;
  synthesis_result: SynthesisOutput;
  fundamental_result: FundamentalAnalysisOutput;
  technical_result: TechnicalAnalysisOutput;
  esg_result: ESGAnalysisOutput;
  request_id?: string;
  processing_time_ms?: number;
}): Signal360AnalysisResponse

/**
 * Generate recommendation based on synthesis score
 */
function generateRecommendation(synthesisScore: number): 'BUY' | 'SELL' | 'HOLD'

/**
 * Format convergence and divergence factors as strings
 */
function formatFactorsAsStrings(factors: any[]): string[]

/**
 * Format key eco factors from ESG analysis result
 */
function formatKeyEcoFactors(esgResult: ESGAnalysisOutput): Array<{
  source: string;
  headline: string;
  sentiment: 'positive' | 'negative' | 'neutral';
}>

/**
 * Generate comprehensive full report
 */
function generateFullReport(
  fundamentalResult: FundamentalAnalysisOutput,
  technicalResult: TechnicalAnalysisOutput,
  esgResult: ESGAnalysisOutput
): {
  fundamental: { score: number; summary: string; };
  technical: { score: number; summary: string; };
  sentiment_eco: { score: number; summary: string; };
}
```

## Data Models

### TradeParametersInput Interface

```typescript
interface TradeParametersInput {
  ticker_symbol: string;
  analysis_context: 'investment' | 'trading';
  trading_timeframe?: string;
  technical_result: TechnicalAnalysisOutput;
  fundamental_result?: FundamentalAnalysisOutput;
  synthesis_score: number;
  current_price: number;
}
```

### TradeParametersOutput Interface

```typescript
interface TradeParametersOutput {
  entry_price: number;
  stop_loss: number;
  take_profit_levels: number[];
  risk_reward_ratio: number;
  position_size_recommendation: number;
  confidence: number;
  methodology: string;
  metadata: {
    calculation_timestamp: string;
    volatility_used: number;
    support_resistance_levels: {
      support: number[];
      resistance: number[];
    };
    risk_metrics: {
      max_drawdown_risk: number;
      expected_return: number;
      sharpe_estimate: number;
    };
  };
}
```

## Error Handling

### Graceful Degradation Strategy

1. **Trade Parameters Calculation Failure**: If trade parameters calculation fails within the SynthesisEngine, return default safe values with low confidence scores.

2. **Response Formatting Failure**: If response formatting fails, return a minimal valid response structure with error indicators.

3. **Backward Compatibility**: During the transition period, maintain error handling that can gracefully handle both old and new response formats.

### Error Recovery Mechanisms

```typescript
// Default trade parameters for error scenarios
const DEFAULT_TRADE_PARAMETERS = {
  entry_price: 0,
  stop_loss: 0,
  take_profit_levels: [],
  risk_reward_ratio: 0,
  position_size_recommendation: 0.01,
  confidence: 0.1,
  methodology: 'Default parameters due to calculation error',
  metadata: {
    calculation_timestamp: new Date().toISOString(),
    volatility_used: 0.02,
    support_resistance_levels: { support: [], resistance: [] },
    risk_metrics: {
      max_drawdown_risk: 0.1,
      expected_return: 0,
      sharpe_estimate: 0
    }
  }
};
```

## Testing Strategy

### Unit Testing

1. **SynthesisEngine Trade Parameters Methods**: Test all new trade parameters calculation methods with various input scenarios.

2. **Response Formatting Functions**: Test all inline response formatting functions with different analysis result combinations.

3. **Edge Cases**: Test error scenarios, missing data, and boundary conditions.

### Integration Testing

1. **End-to-End Analysis Pipeline**: Test the complete analysis flow from request to formatted response.

2. **Backward Compatibility**: Ensure the refactored system produces identical results to the original system.

3. **Performance Testing**: Verify that consolidation doesn't negatively impact performance.

### Validation Testing

1. **Schema Compliance**: Ensure all responses conform to the expected API schema.

2. **Data Consistency**: Verify that trade parameters and response formatting produce consistent results.

3. **Final Validation Suite**: Run the existing `execute-final-validation.ts` test suite to ensure 100% compatibility.

## Migration Strategy

### Phase 1: Enhance SynthesisEngine

1. Add trade parameters calculation methods to the SynthesisEngine class
2. Update the SynthesisOutput interface to include trade parameters
3. Modify the synthesis process to calculate trade parameters internally

### Phase 2: Enhance Main Orchestrator

1. Add inline response formatting functions to the main orchestrator
2. Update the orchestrator to use inline formatting instead of external functions
3. Remove calls to the standalone response-formatter Edge Function

### Phase 3: Update Integration Points

1. Modify the main orchestrator to call SynthesisEngine methods directly for trade parameters
2. Remove calls to the standalone trade-parameters Edge Function
3. Ensure all response formatting is handled inline

### Phase 4: Cleanup and Validation

1. Delete the `supabase/functions/trade-parameters` directory
2. Delete the `supabase/functions/response-formatter` directory  
3. Delete the `supabase/functions/_shared/response-formatter.ts` file
4. Run comprehensive validation tests to ensure functionality is preserved

## Performance Considerations

### Optimization Benefits

1. **Reduced Network Overhead**: Eliminating separate Edge Function calls reduces network latency and overhead.

2. **Improved Caching**: Consolidated logic allows for better caching strategies within the synthesis process.

3. **Reduced Cold Start Impact**: Fewer Edge Functions mean fewer potential cold starts in the analysis pipeline.

### Memory Management

1. **Efficient Object Reuse**: Reuse calculation objects and intermediate results within the consolidated methods.

2. **Garbage Collection Optimization**: Minimize object creation during trade parameters calculation and response formatting.

## Security Considerations

### Data Flow Security

1. **Input Validation**: Ensure all consolidated methods maintain the same level of input validation as the original functions.

2. **Error Information Leakage**: Prevent sensitive calculation details from being exposed in error messages.

3. **API Key Handling**: Maintain secure API key handling practices in the consolidated architecture.

## Monitoring and Observability

### Performance Metrics

1. **Execution Time Tracking**: Monitor the performance impact of consolidation on overall analysis time.

2. **Error Rate Monitoring**: Track error rates for the new consolidated methods.

3. **Resource Usage**: Monitor memory and CPU usage patterns after consolidation.

### Logging Strategy

1. **Detailed Calculation Logging**: Log key steps in trade parameters calculation for debugging.

2. **Response Formatting Logging**: Log response formatting steps and any data transformations.

3. **Error Context Logging**: Provide detailed context for any errors in the consolidated logic.