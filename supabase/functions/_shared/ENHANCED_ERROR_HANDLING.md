# Enhanced Error Handling and Monitoring for Signal-360 Analysis Pipeline

## Overview

The Signal-360 analysis pipeline now includes a comprehensive, production-ready error handling and monitoring system specifically designed for financial analysis workflows. This system provides:

- **Analysis-Specific Error Handling**: Specialized error types and handling for each analysis stage
- **Graceful Degradation**: Ability to continue analysis with partial results
- **Advanced Rate Limiting**: API quota management with exponential backoff
- **Circuit Breakers**: Automatic failure detection and recovery for external services
- **Pipeline Monitoring**: Complete visibility into analysis execution
- **Performance Tracking**: Real-time performance metrics and alerting
- **Comprehensive Testing**: Full test coverage for all error scenarios

## Key Components

### 1. Analysis Error Types

#### AnalysisError Class
Enhanced error class with analysis-specific context:

```typescript
const error = new AnalysisError(
  ANALYSIS_ERROR_CODES.TICKER_VALIDATION_FAILED,
  'Invalid ticker format',
  AnalysisStage.VALIDATION,
  'Ticker must be 1-5 letters',
  undefined,
  'INVALID',
  'trading'
);
```

#### Analysis-Specific Error Codes
```typescript
ANALYSIS_ERROR_CODES = {
  TICKER_VALIDATION_FAILED: 'TICKER_VALIDATION_FAILED',
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',
  ANALYSIS_TIMEOUT: 'ANALYSIS_TIMEOUT',
  SYNTHESIS_FAILED: 'SYNTHESIS_FAILED',
  TRADE_PARAMS_FAILED: 'TRADE_PARAMS_FAILED',
  PARTIAL_ANALYSIS_FAILURE: 'PARTIAL_ANALYSIS_FAILURE',
  DATA_QUALITY_INSUFFICIENT: 'DATA_QUALITY_INSUFFICIENT',
  API_QUOTA_EXCEEDED: 'API_QUOTA_EXCEEDED',
  MARKET_DATA_STALE: 'MARKET_DATA_STALE',
  CONFIDENCE_TOO_LOW: 'CONFIDENCE_TOO_LOW'
}
```

### 2. Pipeline Monitoring

#### AnalysisPipelineMonitor
Comprehensive monitoring for the entire analysis pipeline:

```typescript
const monitor = new AnalysisPipelineMonitor(
  requestId,
  'AAPL',
  'trading',
  logger
);

// Track each stage
monitor.startStage(AnalysisStage.FUNDAMENTAL_ANALYSIS);
const result = await performFundamentalAnalysis();
monitor.endStage(AnalysisStage.FUNDAMENTAL_ANALYSIS, result);

// Get comprehensive summary
const summary = monitor.getSummary();
```

#### Analysis Stages
```typescript
enum AnalysisStage {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  API_KEY_DECRYPTION = 'api_key_decryption',
  FUNDAMENTAL_ANALYSIS = 'fundamental_analysis',
  TECHNICAL_ANALYSIS = 'technical_analysis',
  SENTIMENT_ECO_ANALYSIS = 'sentiment_eco_analysis',
  SYNTHESIS = 'synthesis',
  TRADE_PARAMETERS = 'trade_parameters',
  RESPONSE_FORMATTING = 'response_formatting'
}
```

### 3. Graceful Degradation

#### Partial Results Handling
The system can continue analysis even when some components fail:

```typescript
// Check if analysis can continue with partial results
if (monitor.canContinueWithPartialResults()) {
  const degradationResult = GracefulDegradationHandler.handlePartialFailure(
    monitor,
    AnalysisStage.TECHNICAL_ANALYSIS,
    error
  );
  
  if (degradationResult.canContinue) {
    // Use fallback data and adjusted confidence
    const partialResults = monitor.getPartialResultsForSynthesis();
    // Continue with synthesis using available data
  }
}
```

#### Fallback Data Generation
Automatic generation of neutral fallback data for failed analysis components:

- **Fundamental Analysis**: Neutral score (50) with low confidence
- **Technical Analysis**: Neutral score with empty indicators
- **Sentiment/ESG Analysis**: Neutral sentiment with system-generated eco factors

### 4. Advanced Rate Limiting

#### API Quota Management
```typescript
// Check rate limits before API calls
const rateLimitCheck = globalRateLimiter.checkRateLimit('google-api');
if (!rateLimitCheck.allowed) {
  throw new AnalysisError(
    ANALYSIS_ERROR_CODES.API_QUOTA_EXCEEDED,
    `Rate limit exceeded for google-api`,
    stage,
    `Retry after ${rateLimitCheck.retryAfter} seconds`,
    rateLimitCheck.retryAfter
  );
}
```

#### Default Rate Limits
- **Google API**: 100 requests/minute
- **Financial Data**: 50 requests/minute  
- **News API**: 200 requests/minute

### 5. Circuit Breakers

#### Service Protection
```typescript
// Execute with circuit breaker protection
const result = await globalCircuitBreakers.execute('google-api', async () => {
  return await makeApiCall();
});
```

#### Circuit Breaker Configuration
- **Google API**: 5 failures → 1 minute recovery
- **Financial Data**: 3 failures → 30 seconds recovery
- **News API**: 5 failures → 2 minutes recovery
- **Database**: 3 failures → 15 seconds recovery

### 6. Enhanced External API Calls

#### Unified API Call Wrapper
```typescript
const result = await callExternalAnalysisAPI(
  'google-api',
  () => makeGoogleApiCall(),
  {
    timeout: 30000,
    stage: AnalysisStage.FUNDAMENTAL_ANALYSIS,
    ticker: 'AAPL',
    monitor: pipelineMonitor
  }
);
```

Features:
- Automatic rate limit checking
- Circuit breaker integration
- Retry logic with exponential backoff
- Pipeline monitoring integration
- Analysis-specific error handling

### 7. Ticker Validation

#### Comprehensive Validation
```typescript
const validation = TickerValidator.validate('AAPL');
if (!validation.valid) {
  throw new AnalysisError(
    ANALYSIS_ERROR_CODES.TICKER_VALIDATION_FAILED,
    'Invalid ticker format',
    AnalysisStage.VALIDATION,
    validation.errors.join(', ')
  );
}
```

Validation Rules:
- 1-5 letters, optionally followed by .XX
- No reserved/test tickers (TEST, DEMO, etc.)
- Proper format validation
- Normalization to uppercase

### 8. Performance Monitoring

#### Real-Time Metrics
```typescript
// Automatic performance recording
AnalysisPerformanceMonitor.recordAnalysis(
  'AAPL',
  'trading',
  2500, // duration in ms
  true, // success
  stageTimings
);

// Get performance statistics
const stats = AnalysisPerformanceMonitor.getStats();
```

Metrics Tracked:
- Average analysis duration
- Error rates by ticker/context
- Stage-specific timing
- Success/failure rates
- Performance alerts for slow analyses

### 9. Monitoring Dashboard

#### Health Check Endpoint
```
GET /analysis-monitor/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "checks": {
    "database": { "status": "pass" },
    "google-api": { "status": "pass" },
    "financial-data-api": { "status": "pass" },
    "news-api": { "status": "pass" },
    "rate-limits": { "status": "pass" }
  }
}
```

#### Comprehensive Status Endpoint
```
GET /analysis-monitor/status
```

Response includes:
- Overall system health
- Component status
- Circuit breaker states
- Rate limit utilization
- Performance metrics
- Recent errors
- Active alerts

#### Metrics Endpoint
```
GET /analysis-monitor/metrics
```

Performance-focused metrics for monitoring systems.

## Implementation Guide

### 1. Function Integration

Update existing analysis functions to use enhanced error handling:

```typescript
import {
  AnalysisError,
  AnalysisStage,
  AnalysisPipelineMonitor,
  ANALYSIS_ERROR_CODES,
  callExternalAnalysisAPI,
  createLogger,
  createRequestMonitor
} from '../_shared/index.ts';

const handleAnalysis = async (request: Request, requestId: string): Promise<Response> => {
  const logger = createLogger('function-name', requestId);
  const requestMonitor = createRequestMonitor('function-name', requestId, request.method, logger);
  let pipelineMonitor: AnalysisPipelineMonitor | undefined;

  try {
    // Parse request and initialize monitoring
    const body = await parseJsonBody(request);
    
    pipelineMonitor = new AnalysisPipelineMonitor(
      requestId,
      body.ticker_symbol,
      body.analysis_context,
      logger
    );

    // Execute analysis stages with monitoring
    pipelineMonitor.startStage(AnalysisStage.VALIDATION);
    const validation = TickerValidator.validate(body.ticker_symbol);
    if (!validation.valid) {
      throw new AnalysisError(
        ANALYSIS_ERROR_CODES.TICKER_VALIDATION_FAILED,
        'Invalid ticker',
        AnalysisStage.VALIDATION,
        validation.errors.join(', ')
      );
    }
    pipelineMonitor.endStage(AnalysisStage.VALIDATION, validation);

    // Continue with other stages...
    
    return createSuccessHttpResponse(result, requestId);

  } catch (error) {
    // Enhanced error handling
    const analysisError = error instanceof AnalysisError ? error : 
      new AnalysisError(
        ANALYSIS_ERROR_CODES.PROCESSING_ERROR,
        'Analysis failed',
        AnalysisStage.VALIDATION,
        error.message
      );

    if (pipelineMonitor) {
      pipelineMonitor.endStage(analysisError.stage, undefined, analysisError);
    }

    return createErrorHttpResponse(analysisError, requestId);
  }
};
```

### 2. External API Integration

Replace direct API calls with the enhanced wrapper:

```typescript
// Old approach
const response = await fetch(apiUrl);
const data = await response.json();

// New approach
const data = await callExternalAnalysisAPI(
  'google-api',
  async () => {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    return response.json();
  },
  {
    timeout: 30000,
    stage: AnalysisStage.FUNDAMENTAL_ANALYSIS,
    ticker: tickerSymbol,
    monitor: pipelineMonitor
  }
);
```

### 3. Graceful Degradation Implementation

Handle partial failures gracefully:

```typescript
try {
  // Attempt all analyses
  const [fundamental, technical, esg] = await Promise.allSettled([
    performFundamentalAnalysis(),
    performTechnicalAnalysis(),
    performESGAnalysis()
  ]);

  // Check for failures and handle gracefully
  const results = { fundamental_result: null, technical_result: null, esg_result: null };
  const errors = [];

  if (fundamental.status === 'fulfilled') {
    results.fundamental_result = fundamental.value;
  } else {
    errors.push(fundamental.reason);
  }

  // Similar for technical and esg...

  // Check if we can continue with partial results
  if (monitor.canContinueWithPartialResults()) {
    // Generate fallback data for missing analyses
    for (const error of errors) {
      const degradationResult = GracefulDegradationHandler.handlePartialFailure(
        monitor,
        error.stage,
        error
      );
      
      if (degradationResult.canContinue && degradationResult.fallbackData) {
        // Use fallback data
        if (error.stage === AnalysisStage.FUNDAMENTAL_ANALYSIS) {
          results.fundamental_result = degradationResult.fallbackData;
        }
        // Similar for other stages...
      }
    }

    // Continue with synthesis using available + fallback data
    return await performSynthesis(results);
  } else {
    // Too many failures, cannot continue
    throw new AnalysisError(
      ANALYSIS_ERROR_CODES.INSUFFICIENT_DATA,
      'Insufficient data for analysis',
      AnalysisStage.SYNTHESIS
    );
  }
}
```

## Testing

### Running Tests

```bash
# Run all error handling tests
deno test --allow-env supabase/functions/_shared/analysis-error-handler.test.ts

# Run with coverage
deno test --allow-env --coverage=coverage supabase/functions/_shared/analysis-error-handler.test.ts
```

### Test Coverage

The test suite covers:
- ✅ Error creation and properties
- ✅ Ticker validation (valid and invalid cases)
- ✅ Pipeline monitoring (stage tracking, timing, errors)
- ✅ Rate limiting (enforcement, reset, custom limits)
- ✅ Circuit breakers (failure detection, state transitions)
- ✅ Graceful degradation (partial results, fallback data)
- ✅ Performance monitoring (metrics recording, statistics)
- ✅ External API calls (success, failure, retry)
- ✅ Integration scenarios (complete error handling flow)

## Monitoring and Alerting

### Key Metrics to Monitor

1. **Error Rates**
   - Overall error rate < 5%
   - Stage-specific error rates
   - Error type distribution

2. **Performance**
   - Average analysis duration < 10 seconds
   - P95 duration < 15 seconds
   - Stage timing breakdown

3. **External Dependencies**
   - API response times
   - Circuit breaker states
   - Rate limit utilization

4. **System Health**
   - Memory usage
   - Active connections
   - Request throughput

### Alert Conditions

- **Critical**: Circuit breaker open for core services
- **High**: Error rate > 10% for 5 minutes
- **Medium**: Rate limit utilization > 90%
- **Low**: Slow analysis (>15 seconds) detected

### Dashboard Integration

The monitoring endpoints can be integrated with:
- Grafana for visualization
- Prometheus for metrics collection
- PagerDuty for alerting
- DataDog for comprehensive monitoring

## Best Practices

1. **Always Use Pipeline Monitoring**: Track every analysis request
2. **Implement Graceful Degradation**: Handle partial failures gracefully
3. **Validate Early**: Use ticker validation before expensive operations
4. **Monitor Performance**: Track and alert on slow analyses
5. **Handle Rate Limits**: Check quotas before API calls
6. **Use Circuit Breakers**: Protect against cascading failures
7. **Log Comprehensively**: Include context in all log messages
8. **Test Error Scenarios**: Ensure error handling works correctly

## Migration Checklist

- [ ] Update function imports to include error handling utilities
- [ ] Replace direct API calls with `callExternalAnalysisAPI`
- [ ] Add pipeline monitoring to all analysis functions
- [ ] Implement ticker validation
- [ ] Add graceful degradation logic
- [ ] Update error handling to use `AnalysisError`
- [ ] Add performance monitoring
- [ ] Set up monitoring dashboard
- [ ] Configure alerting rules
- [ ] Run comprehensive tests

This enhanced error handling system transforms the Signal-360 analysis pipeline into a production-ready, resilient system capable of handling real-world failures gracefully while maintaining high availability and performance.