# Database Test Suite

This directory contains comprehensive tests for the Signal-360 database architecture, covering unit tests, integration tests, load testing, data integrity, and security penetration testing.

## Test Structure

```
src/lib/database/__tests__/
├── integration/           # End-to-end integration tests
├── load/                 # Load and performance testing
├── integrity/            # Data integrity and consistency tests
├── security/             # Security penetration tests
├── test-suite.config.ts  # Centralized test configuration
├── README.md            # This documentation
└── *.test.ts            # Individual unit tests
```

## Test Categories

### 1. Unit Tests

Individual component testing for isolated functionality:

- **`profile-service.test.ts`** - ProfileService CRUD operations
- **`analysis-service.test.ts`** - AnalysisService operations
- **`validation.test.ts`** - Input validation functions
- **`jsonb-helpers.test.ts`** - JSONB data manipulation
- **`encryption.test.ts`** - API key encryption/decryption
- **`error-handler.test.ts`** - Error handling utilities
- **`database-service.test.ts`** - Centralized service layer
- **`repositories.test.ts`** - Repository pattern implementations
- **`performance.test.ts`** - Query optimization and caching

### 2. Integration Tests (`integration/`)

End-to-end workflow testing:

- **`database-integration.test.ts`** - Complete user workflows
  - User initialization and profile creation
  - Analysis creation and retrieval
  - Multi-user data isolation
  - Complex analysis workflows
  - Error recovery and resilience

### 3. Load Testing (`load/`)

Performance and scalability testing:

- **`load-testing.test.ts`** - High-load scenarios
  - 100+ concurrent user operations
  - 500+ concurrent analysis creations
  - Bulk operations (1000+ records)
  - Large dataset queries (10,000+ records)
  - Memory and resource usage testing
  - Connection pool stress testing

### 4. Data Integrity Tests (`integrity/`)

Data consistency and constraint testing:

- **`data-integrity.test.ts`** - Database integrity
  - Foreign key constraint enforcement
  - Cascade delete operations
  - Data type integrity
  - Cross-table consistency
  - Unique constraint violations
  - Transaction consistency

### 5. Security Tests (`security/`)

Security vulnerability and penetration testing:

- **`security-penetration.test.ts`** - Security testing
  - SQL injection prevention
  - Unauthorized access attempts
  - Input validation bypass attempts
  - Authorization bypass attempts
  - XSS prevention
  - DoS prevention
  - Data exfiltration prevention

## Running Tests

### All Tests
```bash
npm test
```

### Specific Test Categories
```bash
# Unit tests only
npm test -- --testPathPattern="src/lib/database/__tests__/[^/]+\.test\.ts$"

# Integration tests
npm test -- --testPathPattern="integration"

# Load tests
npm test -- --testPathPattern="load"

# Integrity tests
npm test -- --testPathPattern="integrity"

# Security tests
npm test -- --testPathPattern="security"
```

### Test Coverage
```bash
npm run test:coverage
```

### Test UI
```bash
npm run test:ui
```

## Test Configuration

### Environment Variables

Tests require the following environment variables:

```bash
# For integration tests
VITE_SUPABASE_URL=your_test_supabase_url
VITE_SUPABASE_ANON_KEY=your_test_anon_key

# For admin operations (optional)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Test environment
NODE_ENV=test
```

### Test Database

For integration tests, use a separate test database:

1. Create a test Supabase project
2. Run database setup: `npm run db:setup`
3. Seed test data: `npm run db:seed:test`

### Mock Configuration

Tests use comprehensive mocking for:
- Supabase client operations
- Authentication state
- Encryption services
- Network requests
- File system operations

## Performance Thresholds

Tests enforce the following performance thresholds:

| Operation Type | Max Time | Throughput |
|---------------|----------|------------|
| Single Query | 1 second | - |
| Bulk Operations | 5 seconds | 100 ops/sec |
| Concurrent Operations | 10 seconds | - |
| Cache Operations | 100ms | - |
| Security Checks | 50ms | - |

## Security Test Coverage

Security tests cover:

### Input Validation
- SQL injection prevention
- XSS prevention
- Buffer overflow prevention
- Type validation
- Format validation

### Access Control
- Row Level Security enforcement
- User authentication verification
- Resource ownership validation
- Operation authorization

### Data Protection
- API key encryption
- Sensitive data handling
- Error message sanitization
- Timing attack prevention

## Test Data Management

### Mock Data
- Realistic test data for all scenarios
- Bulk data generation utilities
- Configurable data sets
- Consistent test user IDs

### Data Cleanup
- Automatic mock cleanup
- Test isolation
- No persistent test data
- Clean state between tests

## Continuous Integration

### GitHub Actions Integration

```yaml
name: Database Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:coverage
        env:
          VITE_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.TEST_SUPABASE_ANON_KEY }}
```

### Test Reporting

Tests generate:
- Coverage reports
- Performance metrics
- Security test results
- Integration test summaries

## Best Practices

### Writing Tests
1. **Use descriptive test names** that explain the scenario
2. **Test both success and failure cases**
3. **Mock external dependencies** for isolation
4. **Use realistic test data** that matches production patterns
5. **Test edge cases and boundary conditions**
6. **Include performance assertions** for critical operations

### Test Organization
1. **Group related tests** in describe blocks
2. **Use consistent naming** for test files and functions
3. **Keep tests focused** on single responsibilities
4. **Use setup and teardown** for consistent test state
5. **Document complex test scenarios**

### Performance Testing
1. **Set realistic thresholds** based on production requirements
2. **Test with realistic data volumes**
3. **Include concurrent access patterns**
4. **Monitor memory usage** during tests
5. **Test cache behavior** under load

### Security Testing
1. **Test all input vectors** for injection attacks
2. **Verify access controls** with different user contexts
3. **Test authorization bypass** attempts
4. **Include timing attack** prevention
5. **Validate error handling** doesn't leak information

## Troubleshooting

### Common Issues

1. **Test Timeouts**
   ```
   Error: Test timeout exceeded
   Solution: Increase timeout or optimize test performance
   ```

2. **Mock Setup Issues**
   ```
   Error: Cannot read property of undefined
   Solution: Ensure all mocks are properly configured
   ```

3. **Environment Variables**
   ```
   Error: Missing environment variables
   Solution: Check .env.test file and CI configuration
   ```

4. **Database Connection**
   ```
   Error: Failed to connect to test database
   Solution: Verify test database is running and accessible
   ```

### Debug Mode

Enable debug mode for detailed test information:
```bash
DEBUG=1 npm test
```

### Test Isolation

If tests are interfering with each other:
```bash
npm test -- --no-coverage --reporter=verbose
```

## Maintenance

### Regular Tasks
1. **Update test data** as features evolve
2. **Review performance thresholds** quarterly
3. **Update security tests** for new attack vectors
4. **Maintain test documentation**
5. **Monitor test execution times**

### Test Health Monitoring
- Track test execution times
- Monitor test failure rates
- Review coverage reports
- Update deprecated test patterns
- Optimize slow tests