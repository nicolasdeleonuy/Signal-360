# Integration Testing Framework

## Overview

The Signal-360 Edge Functions include a comprehensive integration testing framework that validates the complete analysis workflow from end-to-end. The testing suite covers functionality, performance, error handling, and system integration scenarios.

## Test Structure

### 1. Complete Workflow Integration (`integration.test.ts`)

Tests the full analysis pipeline from request to response:

- **End-to-End Analysis**: Complete workflow for investment and trading contexts
- **Authentication Flow**: JWT token validation and user context extraction
- **Input Validation**: Request parameter validation and sanitization
- **Error Handling**: Authentication failures, validation errors, and system errors
- **CORS Support**: Preflight request handling and header validation
- **Concurrent Execution**: Multiple simultaneous analysis requests
- **Database Integration**: Analysis result persistence and retrieval
- **Response Format**: Consistent response structure and metadata

### 2. Workflow Component Integration (`workflow-integration.test.ts`)

Tests the interaction between analysis modules and synthesis engine:

- **Analysis Module Consistency**: Standardized output format across all modules
- **Synthesis Processing**: Correct handling of analysis results
- **Context-Aware Weighting**: Different weighting for investment vs trading
- **Convergence/Divergence Analysis**: Factor identification and categorization
- **Full Report Generation**: Complete analysis report structure
- **Error Propagation**: Graceful handling of module failures
- **Data Consistency**: Preservation of data through the pipeline
- **Performance Monitoring**: Execution time tracking and optimization

### 3. Performance and Load Testing (`performance-integration.test.ts`)

Tests system behavior under various load conditions:

- **Baseline Performance**: Single request execution time
- **Concurrent Load**: Multiple simultaneous requests
- **Scalability Analysis**: Performance with increasing user load
- **Memory Management**: Resource usage and cleanup
- **Response Consistency**: Performance stability over time
- **Error Handling Under Load**: System resilience with failures
- **Timeout Management**: Request timeout handling
- **Resource Cleanup**: Garbage collection and memory management

## Running Integration Tests

### Prerequisites

```bash
# Ensure Deno is installed
deno --version

# Set up test environment variables
export SUPABASE_URL="https://test.supabase.co"
export SUPABASE_ANON_KEY="test-anon-key"
export SUPABASE_SERVICE_ROLE_KEY="test-service-role-key"
export ENCRYPTION_KEY="test-encryption-key-with-sufficient-length-for-security"
```

### Running Individual Test Suites

```bash
# Complete workflow integration tests
deno test --allow-env --allow-net supabase/functions/_shared/integration.test.ts

# Workflow component integration tests
deno test --allow-env --allow-net supabase/functions/_shared/workflow-integration.test.ts

# Performance and load tests
deno test --allow-env --allow-net supabase/functions/_shared/performance-integration.test.ts
```

### Running All Integration Tests

```bash
# Run all integration tests
deno test --allow-env --allow-net supabase/functions/_shared/*integration*.test.ts

# Run with verbose output
deno test --allow-env --allow-net --verbose supabase/functions/_shared/*integration*.test.ts

# Run with coverage
deno test --allow-env --allow-net --coverage=coverage supabase/functions/_shared/*integration*.test.ts
```

## Test Scenarios

### 1. Happy Path Scenarios

#### Investment Analysis
```typescript
const request = {
  ticker_symbol: 'AAPL',
  analysis_context: 'investment'
};
```

**Expected Behavior:**
- Authentication succeeds
- Input validation passes
- All three analysis modules execute concurrently
- Synthesis engine applies investment weighting (Fundamental: 50%, ESG: 30%, Technical: 20%)
- Analysis results are persisted to database
- Response includes synthesis score, convergence/divergence factors, and full report

#### Trading Analysis
```typescript
const request = {
  ticker_symbol: 'MSFT',
  analysis_context: 'trading',
  trading_timeframe: '1D'
};
```

**Expected Behavior:**
- Timeframe validation passes
- Technical analysis receives higher weighting (Technical: 60%, Fundamental: 25%, ESG: 15%)
- Trading-specific factors are emphasized in synthesis
- Response optimized for short-term decision making

### 2. Error Scenarios

#### Authentication Failures
- Invalid JWT tokens
- Expired tokens
- Missing authorization headers

#### Validation Errors
- Invalid ticker symbols
- Missing required parameters
- Invalid analysis context values
- Missing timeframe for trading requests

#### System Errors
- External API failures
- Database connection issues
- Analysis module timeouts
- Synthesis engine errors

### 3. Performance Scenarios

#### Load Testing
- **Light Load**: 10 requests, 2 concurrent
- **Medium Load**: 50 requests, 5 concurrent
- **Heavy Load**: 100 requests, 10 concurrent

#### Scalability Testing
- 1 user, 10 requests per user
- 5 users, 10 requests per user
- 10 users, 10 requests per user
- 20 users, 5 requests per user

## Mock Data and Fixtures

### Analysis Results
The tests use comprehensive mock data that simulates realistic analysis outputs:

```typescript
const mockFundamentalAnalysis = {
  score: 75,
  factors: [
    {
      category: 'fundamental',
      type: 'positive',
      description: 'Strong revenue growth of 12% YoY',
      weight: 0.8,
      confidence: 0.9
    }
  ],
  details: {
    financial_ratios: { roe: 25.3, pe: 18.5 },
    growth_metrics: { revenue_growth: 12.0 },
    valuation_metrics: { pe_ratio: 18.5 },
    quality_indicators: { debt_service_coverage: 15.2 }
  },
  confidence: 0.85
};
```

### Synthesis Results
Mock synthesis results demonstrate proper weighting and factor analysis:

```typescript
const mockSynthesis = {
  synthesis_score: 76,
  convergence_factors: [
    {
      category: 'growth',
      description: 'Strong growth indicators across fundamental and ESG analysis',
      weight: 0.8,
      supporting_analyses: ['fundamental', 'esg']
    }
  ],
  divergence_factors: [
    {
      category: 'valuation',
      description: 'Technical momentum vs fundamental valuation concerns',
      weight: 0.3,
      conflicting_analyses: ['fundamental', 'technical']
    }
  ]
};
```

## Performance Benchmarks

### Response Time Targets

| Scenario | Target | Acceptable | Critical |
|----------|--------|------------|----------|
| Single Analysis | < 2s | < 5s | > 10s |
| Concurrent (5 users) | < 3s avg | < 7s avg | > 15s avg |
| Heavy Load (10+ users) | < 5s avg | < 10s avg | > 20s avg |

### Throughput Targets

| Load Level | Target RPS | Acceptable RPS | Critical RPS |
|------------|------------|----------------|--------------|
| Light | > 5 | > 2 | < 1 |
| Medium | > 3 | > 1.5 | < 0.5 |
| Heavy | > 2 | > 1 | < 0.3 |

### Memory Usage

- **Baseline**: < 50MB per function instance
- **Under Load**: < 200MB per function instance
- **Memory Leaks**: No continuous growth over 1000 requests

## Test Utilities

### IntegrationTestHelper
Provides common functionality for integration tests:

```typescript
class IntegrationTestHelper {
  static createValidAnalysisRequest()
  static createValidTradingRequest()
  static createValidAuthHeaders()
  static createHttpRequest(body, headers)
  static async callAnalyzeTickerFunction(request)
}
```

### WorkflowTestHelper
Specialized utilities for workflow testing:

```typescript
class WorkflowTestHelper {
  static async testAnalysisModuleIntegration(ticker, context)
  static async callSynthesisEngine(analysisResults, context)
  static validateAnalysisResult(result)
  static validateSynthesisResult(result)
}
```

### PerformanceTestHelper
Performance testing utilities:

```typescript
class PerformanceTestHelper {
  static async measureExecutionTime(operation)
  static async runConcurrentOperations(operations, maxConcurrency)
  static generateLoadTestRequests(count)
  static calculatePerformanceMetrics(durations)
}
```

## Continuous Integration

### GitHub Actions Integration

```yaml
name: Integration Tests
on: [push, pull_request]
jobs:
  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: denoland/setup-deno@v1
        with:
          deno-version: v1.x
      - name: Run Integration Tests
        run: |
          deno test --allow-env --allow-net supabase/functions/_shared/*integration*.test.ts
```

### Test Reporting

The tests generate detailed reports including:

- **Execution Summary**: Pass/fail counts and overall status
- **Performance Metrics**: Response times, throughput, and resource usage
- **Error Analysis**: Failure patterns and error rates
- **Coverage Reports**: Code coverage across the analysis pipeline

## Monitoring and Alerting

### Test Metrics
- Test execution time
- Success/failure rates
- Performance regression detection
- Resource usage trends

### Alerting Thresholds
- Test failure rate > 5%
- Performance degradation > 50%
- Memory usage increase > 100%
- Error rate increase > 10%

## Best Practices

### Test Design
1. **Isolation**: Each test should be independent and not rely on others
2. **Deterministic**: Tests should produce consistent results
3. **Comprehensive**: Cover both happy path and error scenarios
4. **Realistic**: Use realistic data and scenarios
5. **Performance-Aware**: Include performance assertions

### Mock Data
1. **Realistic**: Mock data should reflect real-world scenarios
2. **Comprehensive**: Cover edge cases and boundary conditions
3. **Maintainable**: Keep mock data organized and up-to-date
4. **Configurable**: Allow easy modification for different test scenarios

### Error Handling
1. **Graceful Degradation**: Test system behavior under failure conditions
2. **Error Propagation**: Verify errors are properly handled and reported
3. **Recovery**: Test system recovery after failures
4. **Logging**: Verify proper error logging and monitoring

## Troubleshooting

### Common Issues

#### Test Timeouts
- Increase timeout values for slow operations
- Check for infinite loops or blocking operations
- Verify mock data is properly configured

#### Authentication Failures
- Verify JWT token format and expiration
- Check environment variable configuration
- Ensure mock authentication is properly set up

#### Performance Issues
- Check for memory leaks in test code
- Verify concurrent execution limits
- Monitor resource usage during tests

#### Mock Data Issues
- Ensure mock responses match expected format
- Verify all required fields are present
- Check for data consistency across modules

### Debugging Tips

1. **Verbose Logging**: Use `--verbose` flag for detailed test output
2. **Selective Testing**: Run individual test files to isolate issues
3. **Performance Profiling**: Use performance measurement utilities
4. **Memory Monitoring**: Track memory usage during test execution
5. **Network Inspection**: Monitor network calls and responses

## Future Enhancements

### Planned Improvements
- **Real API Integration**: Tests against actual external APIs
- **Database Integration**: Tests with real database connections
- **Security Testing**: Penetration testing and vulnerability assessment
- **Chaos Engineering**: Fault injection and resilience testing
- **Visual Reporting**: Dashboard for test results and trends

### Metrics Collection
- **Test Execution Trends**: Historical performance data
- **Failure Pattern Analysis**: Common failure modes and causes
- **Performance Regression Detection**: Automated performance monitoring
- **Resource Usage Optimization**: Memory and CPU usage analysis

The integration testing framework provides comprehensive validation of the Signal-360 analysis workflow, ensuring reliability, performance, and correctness across all system components.