# Comprehensive Analysis Test Suite

This directory contains a comprehensive test suite for the Signal-360 backend analysis pipeline. The test suite validates the robustness, accuracy, and resilience of our entire analysis system.

## Overview

The test suite is designed to thoroughly test all components of the Signal-360 analysis pipeline:

- **Unit Tests**: Test individual services and components in isolation
- **Integration Tests**: Test end-to-end workflows and component interactions
- **Error Scenario Tests**: Test resilience patterns and error handling
- **Performance Tests**: Test system behavior under load and concurrent requests

## Test Structure

### 1. Unit Tests (`UnitTestSuite`)

Tests individual components with mocked dependencies:

- **FundamentalAnalysis Service**: Tests financial data processing and scoring
- **TechnicalAnalysis Service**: Tests price data analysis and indicator calculations
- **SentimentEcoAnalysis Service**: Tests news and social media sentiment analysis
- **SynthesisEngine Service**: Tests analysis combination and weighting logic
- **ApiKeyService**: Tests API key validation and management
- **ErrorHandler**: Tests error creation, monitoring, and pipeline tracking

### 2. Integration Tests (`IntegrationTestSuite`)

Tests complete workflows and component interactions:

- **Complete Analysis Pipeline**: End-to-end analysis flow validation
- **Partial Failure Scenarios**: Graceful degradation with missing data
- **Market Scenarios**: Different market conditions and contexts
- **Concurrent Load**: Performance under multiple simultaneous requests

### 3. Error Scenario Tests (`ErrorScenarioTestSuite`)

Tests resilience patterns and error handling:

- **Circuit Breaker**: Tests failure threshold and recovery behavior
- **Rate Limiting**: Tests API quota management and throttling
- **Graceful Degradation**: Tests fallback data generation
- **Timeout Handling**: Tests operation timeout and recovery
- **Invalid Input**: Tests input validation and error responses
- **Data Quality**: Tests handling of low-confidence data

## Running Tests

### Prerequisites

- Deno runtime installed
- Network access for external API simulation
- Environment variables configured (if testing with real APIs)

### Quick Start

```bash
# Run all test suites
deno run --allow-net --allow-read --allow-env supabase/functions/test-suite/run-tests.ts

# Run specific test suite
deno run --allow-net --allow-read --allow-env supabase/functions/test-suite/run-tests.ts unit
deno run --allow-net --allow-read --allow-env supabase/functions/test-suite/run-tests.ts integration
deno run --allow-net --allow-read --allow-env supabase/functions/test-suite/run-tests.ts error

# Run tests directly
deno run --allow-net --allow-read --allow-env supabase/functions/test-suite/comprehensive-analysis-tests.ts
```

### Available Test Suites

| Suite | Command | Description |
|-------|---------|-------------|
| All | `run-tests.ts` or `run-tests.ts all` | Runs all test suites |
| Unit | `run-tests.ts unit` | Tests individual components |
| Integration | `run-tests.ts integration` | Tests end-to-end workflows |
| Error | `run-tests.ts error` | Tests error handling and resilience |
| Legacy | `run-tests.ts legacy` | Runs original test suite |

## Test Data Generation

The test suite includes a comprehensive `TestDataGenerator` class that creates realistic mock data for testing:

### Mock Data Features

- **Consistent Data**: Uses seeded random generation for reproducible results
- **Realistic Patterns**: Generates data that mimics real market conditions
- **Context Awareness**: Adjusts data based on analysis context (investment vs trading)
- **Scenario Support**: Generates data for specific market scenarios

### Available Generators

```typescript
// Generate fundamental analysis results
TestDataGenerator.generateFundamentalResult(score?: number)

// Generate technical analysis results  
TestDataGenerator.generateTechnicalResult(score?: number)

// Generate ESG/sentiment analysis results
TestDataGenerator.generateESGResult(score?: number)

// Generate synthesis results
TestDataGenerator.generateSynthesisResult(score?: number)

// Generate test scenarios
TestDataGenerator.generateTestScenarios()
```

## Test Scenarios

The test suite includes predefined market scenarios:

### Market Scenarios

1. **Strong Bull Market**: All analyses strongly positive, high confidence
2. **Bear Market Decline**: All analyses negative, clear sell signal
3. **Mixed Signals**: Conflicting signals between analyses
4. **Day Trading Momentum**: Strong technical momentum for short-term trading
5. **Value Investment**: Strong fundamentals with moderate technical signals

### Error Scenarios

1. **API Failures**: External API unavailability and timeouts
2. **Rate Limiting**: API quota exceeded scenarios
3. **Data Quality Issues**: Low confidence and incomplete data
4. **Network Issues**: Connection failures and retries
5. **Invalid Inputs**: Malformed requests and validation failures

## Monitoring and Metrics

The test suite includes comprehensive monitoring:

### Pipeline Monitoring

- **Stage Timing**: Tracks duration of each analysis stage
- **Error Tracking**: Records and categorizes all errors
- **Performance Metrics**: Measures throughput and response times
- **Success Rates**: Calculates success/failure ratios

### Test Metrics

- **Coverage**: Tracks which components and scenarios are tested
- **Performance**: Measures test execution times
- **Reliability**: Tracks test stability and flakiness
- **Assertions**: Counts and validates all test assertions

## Configuration

### Environment Variables

```bash
# Optional: Use real API keys for integration testing
GOOGLE_API_KEY=your_google_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Test configuration
TEST_TIMEOUT=30000
TEST_CONCURRENCY=10
TEST_RETRY_ATTEMPTS=3
```

### Test Configuration

The test suite can be configured through environment variables or by modifying the test configuration:

```typescript
const TEST_CONFIG = {
  timeout: 30000,           // Default test timeout
  concurrency: 10,          // Concurrent request limit
  retryAttempts: 3,         // Retry failed tests
  mockData: true,           // Use mock data vs real APIs
  verbose: false            // Enable verbose logging
};
```

## Best Practices

### Writing Tests

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Deterministic**: Tests should produce consistent results across runs
3. **Fast**: Unit tests should complete quickly (< 100ms per test)
4. **Clear**: Test names and assertions should be descriptive
5. **Comprehensive**: Cover both happy path and error scenarios

### Mock Data

1. **Realistic**: Mock data should reflect real-world patterns
2. **Consistent**: Use seeded random generation for reproducibility
3. **Comprehensive**: Cover edge cases and boundary conditions
4. **Maintainable**: Keep mock data generation centralized

### Error Testing

1. **Comprehensive**: Test all error paths and edge cases
2. **Realistic**: Simulate real-world failure scenarios
3. **Recovery**: Test error recovery and graceful degradation
4. **Monitoring**: Ensure errors are properly logged and tracked

## Troubleshooting

### Common Issues

1. **Network Timeouts**: Increase timeout values or use mock data
2. **Rate Limiting**: Reduce test concurrency or use test API keys
3. **Memory Issues**: Reduce test data size or run tests in smaller batches
4. **Flaky Tests**: Add retry logic or improve test isolation

### Debug Mode

Enable verbose logging for debugging:

```bash
# Set debug environment variable
export DEBUG=true

# Run tests with verbose output
deno run --allow-net --allow-read --allow-env supabase/functions/test-suite/run-tests.ts unit
```

### Performance Profiling

Monitor test performance:

```bash
# Run with timing information
time deno run --allow-net --allow-read --allow-env supabase/functions/test-suite/run-tests.ts

# Profile memory usage
deno run --allow-net --allow-read --allow-env --v8-flags=--prof supabase/functions/test-suite/run-tests.ts
```

## Contributing

### Adding New Tests

1. **Unit Tests**: Add to the appropriate service test method in `UnitTestSuite`
2. **Integration Tests**: Add to `IntegrationTestSuite` for workflow testing
3. **Error Tests**: Add to `ErrorScenarioTestSuite` for resilience testing
4. **Test Data**: Update `TestDataGenerator` for new mock data needs

### Test Guidelines

1. Follow existing naming conventions
2. Include descriptive test names and comments
3. Add appropriate assertions and error handling
4. Update documentation for new test scenarios
5. Ensure tests are deterministic and isolated

## Continuous Integration

The test suite is designed to run in CI/CD environments:

### GitHub Actions Example

```yaml
name: Analysis Pipeline Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: denoland/setup-deno@v1
        with:
          deno-version: v1.x
      
      - name: Run Unit Tests
        run: deno run --allow-net --allow-read --allow-env supabase/functions/test-suite/run-tests.ts unit
      
      - name: Run Integration Tests
        run: deno run --allow-net --allow-read --allow-env supabase/functions/test-suite/run-tests.ts integration
      
      - name: Run Error Scenario Tests
        run: deno run --allow-net --allow-read --allow-env supabase/functions/test-suite/run-tests.ts error
```

## Metrics and Reporting

The test suite generates comprehensive reports:

### Test Results

- **Pass/Fail Status**: Overall test suite success
- **Execution Time**: Total and per-test timing
- **Coverage**: Component and scenario coverage
- **Performance**: Throughput and latency metrics

### Error Analysis

- **Error Categories**: Classification of failures
- **Failure Patterns**: Common failure modes
- **Recovery Success**: Graceful degradation effectiveness
- **Performance Impact**: Error handling overhead

This comprehensive test suite ensures the Signal-360 analysis pipeline is robust, accurate, and resilient under all conditions.